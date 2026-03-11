/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import AppError from '../../errorHelpers/AppError';
import User from '../user/user.model';
import { IShop, ShopApproval } from './shop.interface';
import { Shop } from './shop.model';
import { Role } from '../user/user.interface';
import mongoose, { Types } from 'mongoose';
import { OutletModel } from '../outlet/outlet.model';
import { JwtPayload } from 'jsonwebtoken';
import { asynSingleImageDelete } from '../../utils/singleImageDeleteAsync';
import { redisClient } from '../../config/redis.config';
import { NotificationType } from '../notification/notification.interface';
import env from '../../config/env';
import { DealModel } from '../deal/deal.model';
import { mailQueue, notificationQueue } from '../../queue/queue';

// Custom interface
interface ShopCreatePayload {
  shop: IShop;
  outlet: {
    outlet_name: string;
    address: string;
    zip_code: string;
    coordinates: [number, number];
  }[];
}

// CREATE SHOP
const createShopService = async (
  user: JwtPayload,
  payload: ShopCreatePayload
) => {
  if (!payload.shop.business_logo) throw new Error('business_logo missing'); // controller bug catch

  const isUser = await User.findById(user.userId);
  if (!isUser) {
    if (payload.shop.business_logo) {
      await asynSingleImageDelete(payload.shop.business_logo); // Delete image first
    }
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // CHECK USER VERIFIED
  if (!isUser.isVerified) {
    if (payload.shop.business_logo) {
      await asynSingleImageDelete(payload.shop.business_logo); // Delete image first
    }

    // Throw Error
    throw new AppError(StatusCodes.BAD_REQUEST, 'Verify your profile');
  }

  const vendorId = new Types.ObjectId(user.userId);

  // Security rule: 1 vendor => 1 shop (remove if you allow multiple)
  const alreadyHasShop = await Shop.findOne({ vendor: vendorId })
    .select('_id')
    .lean();
  if (alreadyHasShop) {
    if (payload.shop.business_logo) {
      await asynSingleImageDelete(payload.shop.business_logo); // Delete image first
    }

    // Thorw Error
    throw new Error('Shop already exists for this vendor');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1) Create shop
    const [shopDoc] = await Shop.create(
      [
        {
          vendor: vendorId,
          business_name: payload.shop.business_name.trim(),
          business_email: payload.shop.business_email.toLowerCase().trim(),
          business_phone: payload.shop.business_phone,
          business_logo: payload.shop.business_logo,
          description: payload.shop.description.trim(),
          website: payload.shop.website?.trim(),
          coord: payload.shop.coord,
        },
      ],
      { session }
    );

    // 2) Create outlets linked to shop
    const outlets = (payload.outlet || []).map((o) => ({
      shop: shopDoc._id,
      vendor: vendorId,
      outlet_name: o.outlet_name,
      address: o.address.trim(),
      zip_code: o.zip_code.trim(),
      location: {
        type: 'Point',
        coordinates: [...o.coordinates],
      },
    }));

    if (outlets.length) {
      await OutletModel.insertMany(outlets, { session, ordered: true });
    }

    await session.commitTransaction();
    session.endSession();

    return {
      shop: shopDoc,
      outlets_created: outlets.length,
    };
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();

    // Duplicate key handling (unique index errors)
    if (err?.code === 11000) {
      throw new Error(`Duplicate key: ${JSON.stringify(err.keyValue)}`);
    }

    throw err;
  }
};

// GET SHOP DETAILS
const getShopDetailsService = async (shopId?: string, my_shop?: string) => {
  const shopDynamicId = my_shop ? my_shop : shopId;

  // CREATED DYNAMIC SHOP CACHE KEY
  const shopCacheKey = `shop:${shopDynamicId}`;

  // GET DATA FROM REDIS AND RETURN
  if (shopCacheKey) {
    const shopData = await redisClient.get(shopCacheKey);
    if (shopData) {
      return JSON.parse(shopData);
    }
  }

  const shopQuery: Record<string, any> = {};

  if (my_shop) {
    shopQuery.vendor = new Types.ObjectId(my_shop);
  } else if (shopId) {
    shopQuery._id = new Types.ObjectId(shopId);
  }

  // Aggregate shop
  const isShopExist = await Shop.aggregate([
    {
      $match: shopQuery,
    },

    {
      $lookup: {
        from: 'outlets',
        localField: '_id',
        foreignField: 'shop',
        as: 'outlets',
      },
    },
  ]);

  if (!isShopExist || isShopExist.length === 0) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Shop not found');
  }

  // STORE DATA IN REDIS
  redisClient.set(shopCacheKey, JSON.stringify(isShopExist[0]), {
    EX: 10 * 60,
  }); // Store for 10 min

  return isShopExist[0];
};

// UPDATE SHOP
const updateShopService = async (
  userId: string,
  shopId: string,
  payload: Partial<IShop>
) => {
  // 1. ensure user exists
  const user = await User.findById(userId).select('_id email role');
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // 2. Build filter
  const filter: Record<string, any> = { _id: shopId };
  if (user.role === Role.VENDOR) {
    filter.vendor = user._id; // only vendor ownership enforced
  }

  if (user.role !== Role.VENDOR && user.role !== Role.ADMIN) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'Only vendors and admin can update shop'
    );
  }

  // 3. Shop existance
  const shop = await Shop.findById(shopId).select('business_logo');
  if (!shop) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Shop not found');
  }

  // 4. build controlled update object
  const updateData: Record<string, any> = {};

  if (payload.business_name) updateData.business_name = payload.business_name;

  if (payload.description) updateData.description = payload.description;

  if (payload.website !== undefined) updateData.website = payload.website;

  if (payload.shop_approval) {
    if (user.role !== Role.ADMIN) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'Only admin can change approval status'
      );
    }

    // Update status
    updateData.shop_approval = payload.shop_approval;
  }

  // 5. coord → GeoJSON
  if (payload.coord) {
    updateData.location = {
      type: 'Point',
      coordinates: payload.coord,
    };
  }

  // 6. If have image, delete previous one
  if (payload.business_logo) {
    updateData.business_logo = payload.business_logo;
  }

  // 7. prevent empty update
  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'No valid fields provided for update'
    );
  }

  // 8. atomic ownership update
  const validator = { new: true, runValidators: true };
  const updatedShop = await Shop.findOneAndUpdate(
    filter,
    updateData,
    validator
  );

  if (!updatedShop) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Shop not found or unauthorized');
  }

  // =================BACKGROUND JOB HANDLING==============

  // DELETE EXISTING IMAGE ASYNCHRONOUSLY TO PREVENT LOAD FOR MAIN API RESPONSE
  setImmediate(async () => {
    // Delete old business logo
    if (payload.business_logo && shop.business_logo) {
      await asynSingleImageDelete(shop.business_logo);
    }
  });




  //==================================================== BULLMQ JOB PROCESSING================================
  // IF SHOP APPROVAL 'APPROVED'
  if (
    payload.shop_approval &&
    payload.shop_approval === ShopApproval.APPROVED
  ) {
    // =============SEND NOTIFICATION=============
    const notificationPayload = {
      user: new Types.ObjectId(user._id),
      title: 'Congratulations! Your shop approved by Yepp',
      body: 'Your shop is live now. You can promote your service and deals',
      type: NotificationType.SHOP,
      entityId: shopId,
      webUrl: `${env.FRONTEND_URL}/create-deal`,
      deepLink: `${env.DEEP_LINK}/create-deal`,
    };

    // SEND EMAIL TO QUEUE
    await notificationQueue.add('sendNotification', notificationPayload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: 1000,
    });

    //================= SEND EMAIL ==========================
    const shopOwner = await User.findOne({ _id: updatedShop.vendor });
    if (!shopOwner) {
      return 0;
    }

    const now = new Date().toLocaleString();
    const emailPayload = {
      to: shopOwner.email,
      subject: 'Congratulations! Your shop approved by Yepp',
      templateName: 'shop_approval',
      templateData: {
        shop_owner_name: shopOwner.user_name,
        shop_name: updatedShop.business_name,
        entityId: updatedShop._id.toString(),
        approval_date: now,
        support_mail: env.ADMIN_MAIL,
        redirect_url: `${env.FRONTEND_URL}/create-deal`,
      },
    };

    // SEND EMAIL TO QUEUE
    await mailQueue.add('sendEmail', emailPayload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      jobId: `shop-approval-${shopId}`,
      removeOnComplete: true,
    });
  }

  // IF SHOP APPROVAL 'REJECTED'
  if (
    payload.shop_approval &&
    payload.shop_approval === ShopApproval.REJECTED
  ) {
    // =============SEND NOTIFICATION AND EMAIL============
    const notificationPayload = {
      user: new Types.ObjectId(user._id),
      title: 'Your shop created request rejected by Yepp',
      body: 'Pleae kindly submit valid data and information about your business',
      type: NotificationType.SHOP,
      entityId: shopId,
      webUrl: `${env.FRONTEND_URL}`,
      deepLink: `${env.DEEP_LINK}`,
    }

    // SEND EMAIL TO QUEUE
    await notificationQueue.add('sendNotification', notificationPayload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: 1000,
    });



    // ==================SEND EMAIL===============
    const shopOwner = await User.findOne({ _id: updatedShop.vendor });
    if (!shopOwner) {
      return 0;
    }

    const now = new Date().toLocaleString();

    const emailPayload = {
      to: shopOwner.email,
      subject: 'Your shop creation rejected by Yepp',
      templateName: 'shop_rejection',
      templateData: {
        shop_owner_name: shopOwner.user_name,
        shop_name: updatedShop.business_name,
        entityId: updatedShop._id.toString(),
        reviewed_date: now,
        support_mail: env.ADMIN_MAIL,
        redirect_url: `${env.FRONTEND_URL}/create-shop`,
      },
    };

    // SEND EMAIL TO QUEUE
    await mailQueue.add('sendEmail', emailPayload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      jobId: `shop-approval-${shopId}`,
      removeOnComplete: true,
    });
  }

  // REMOVE ALL CACHE KEY WHEN UPDATE
  await redisClient.del(`shop:${userId}`);
  await redisClient.del(`shop:${shopId}`);

  return updatedShop;
};

// SHOP ANALYTICS
const getDealAnalyticsService = async (user: JwtPayload) => {
  const userObjectId = new mongoose.Types.ObjectId(user.userId);

  if (user.role !== Role.VENDOR) {
    throw new AppError(StatusCodes.FORBIDDEN, 'Forbidden');
  }

  const findVendorShop = await Shop.findOne({ vendor: userObjectId });
  if (!findVendorShop) {
    throw new AppError(StatusCodes.FORBIDDEN, 'No shop found');
  }

  // Aggregate total stats
  const stats = await DealModel.aggregate([
    { $match: { shop: findVendorShop._id } },
    {
      $group: {
        _id: null,
        activeDeals: {
          $sum: { $cond: [{ $eq: ['$isPromoted', true] }, 1, 0] },
        },
        totalViews: { $sum: '$total_views' },
        totalImpressions: { $sum: '$total_impression' },
      },
    },
  ]);

  return stats[0] || { activeDeals: 0, totalViews: 0, totalImpressions: 0 };
};

// MONTHLY ANALYTICS (CHART)
const getMonthlyAnalyticsService = async (user: JwtPayload, year: number) => {
  const userObjectId = new mongoose.Types.ObjectId(user.userId);

  if (user.role !== Role.VENDOR) {
    throw new AppError(StatusCodes.FORBIDDEN, 'Forbidden');
  }

  const findVendorShop = await Shop.findOne({ vendor: userObjectId });
  if (!findVendorShop) {
    throw new AppError(StatusCodes.FORBIDDEN, 'No shop found');
  }

  const startOfYear = new Date(`${year}-01-01`);
  const endOfYear = new Date(`${year}-12-31`);

  const monthlyStats = await DealModel.aggregate([
    {
      $match: {
        shop: findVendorShop._id,
        createdAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $project: {
        month: { $month: '$createdAt' },
        total_views: 1,
        total_impression: 1,
      },
    },
    {
      $group: {
        _id: '$month',
        views: { $sum: '$total_views' },
        impressions: { $sum: '$total_impression' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill missing months with 0
  const result = Array.from({ length: 12 }, (_, i) => {
    const monthData = monthlyStats.find((m) => m._id === i + 1);
    return {
      month: i + 1,
      views: monthData?.views || 0,
      impressions: monthData?.impressions || 0,
    };
  });

  return result;
};

export const shopServices = {
  createShopService,
  getShopDetailsService,
  updateShopService,
  getDealAnalyticsService,
  getMonthlyAnalyticsService,
};
