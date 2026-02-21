/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import AppError from '../../errorHelpers/AppError';
import User from '../user/user.model';
import { IShop, LocationType, ShopApproval } from './shop.interface';
import { Shop } from './shop.model';
import { deleteImageFromCLoudinary } from '../../config/cloudinary.config';
import { Role } from '../user/user.interface';

const createShopService = async (userId: string, payload: IShop) => {
  // 1. Validate user existence
  const user = await User.findById(userId).select('_id role');
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // 1.1. Input coord into Location
  if (payload.coord) {
    payload.location = {
      type: LocationType.POINT,
      coordinates: [...payload.coord],
    };
  }

  // 2. Role check
  if (user.role !== 'VENDOR') {
    throw new AppError(StatusCodes.FORBIDDEN, 'Only vendors can create shops');
  }

  // 3. Prevent duplicate shop per vendor
  const existingShop = await Shop.findOne({ vendor: user._id }).select('_id');
  if (existingShop) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Vendor already has a shop');
  }

  // 4. Prevent duplicate business email
  const emailExists = await Shop.findOne({
    business_email: payload.business_email.toLowerCase(),
  }).select('_id');

  if (emailExists) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Business email already in use'
    );
  }

  // 5. Create shop (controlled fields only)
  const shop = await Shop.create({
    vendor: user._id, // override vendor
    business_name: payload.business_name,
    business_email: payload.business_email.toLowerCase(),
    business_logo: payload.business_logo,
    description: payload.description,
    location: payload.location,
    zip_code: payload.zip_code,
    website: payload.website,
    shop_approval: ShopApproval.PENDING, // force default
  });

  return shop;
};

const getShopDetailsService = async (userId: string) => {
  const isShopExist = await Shop.findOne({ vendor: userId });

  if (!isShopExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Shop not found');
  }

  return isShopExist;
};

const updateShopService = async (
  userId: string,
  shopId: string,
  payload: Partial<IShop>
) => {
  // 1. ensure user exists
  const user = await User.findById(userId).select('_id role');
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
  const shop = await Shop.findById(shopId).select("business_logo");
  if (!shop) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Shop not found');
  }

  // 4. build controlled update object
  const updateData: Record<string, any> = {};

  if (payload.business_name) updateData.business_name = payload.business_name;

  if (payload.description) updateData.description = payload.description;

  if (payload.zip_code) updateData.zip_code = payload.zip_code;

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
  const updatedShop = await Shop.findOneAndUpdate(filter, updateData, validator);

  if (!updatedShop) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Shop not found or unauthorized');
  }

  
  
  // DELETE EXISTING IMAGE ASYNCHRONOUSLY TO PREVENT LOAD FOR MAIN API RESPONSE
  setImmediate(async () => {
      deleteImageFromCLoudinary(shop.business_logo);
  })


  return updatedShop;
};

export const shopServices = {
  createShopService,
  getShopDetailsService,
  updateShopService,
};
