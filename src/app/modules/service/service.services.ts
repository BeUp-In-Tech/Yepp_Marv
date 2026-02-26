/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceModel } from './service.model';
import mongoose, { Types } from 'mongoose';
import {  CouponType, IService } from './service.interface';
import { JwtPayload } from 'jsonwebtoken';
import { Shop } from '../shop/shop.model';
import { Role } from '../user/user.interface';
import AppError from '../../errorHelpers/AppError';
import StatusCodes from 'http-status-codes';
import env from '../../config/env';
import { deleteImageFromCLoudinary } from '../../config/cloudinary.config';


// 1. CREATE SERVICE
const createService = async (params: {
  user: JwtPayload;
  payload: IService; // used for auto QR URL
}) => {
  const { user, payload } = params;

  // 1) Convert ids once
  const shopId = new Types.ObjectId(payload.shop);
  const categoryId = new Types.ObjectId(payload.category);

  // 2) Authorization: vendor must own the shop (admin bypass)
  // Adjust "vendor" to your actual field (owner/vendorId/etc.)
  if (![Role.ADMIN, Role.VENDOR].includes(user.role)) {
    throw new Error('Forbidden');
  }

  const shopQuery: Record<string, any> = { _id: shopId };

  if (user.role === Role.VENDOR) {
    shopQuery.vendor = new Types.ObjectId(user.userId);
  }

  // Is shop exist
  const shopExists = await Shop.exists(shopQuery);
  if (!shopExists) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Shop not found or you don't have permission."
    );
  }

  // 3) Normalize inputs (O(n) bounded)

  const highlight = (payload.highlight || [])
    .map((h) => h.trim())
    .filter(Boolean);

  const images = (payload.images || []).map((u) => u.trim()).filter(Boolean);


  // 4) Single-write QR auto generation (generate _id first)
  const _id = new Types.ObjectId();

 
  // Handle Coupon_code, Upc_code, qr_code here
  let coupon: Record<string, string> = {};

  if (payload.couponType === CouponType.COUPON_CODE) {
    coupon.coupon_code = payload.coupon.coupon_code as string;
  }

  switch (payload.couponType) {
    case CouponType.COUPON_CODE:
      coupon.coupon_code = payload.coupon.coupon_code as string;
      break
    case CouponType.QR_CODE:
      coupon.coupon_code = payload.coupon.coupon_code as string;
      coupon.qr_code = `${env.BACKEND_URL}/api/v1/s/${_id}?type=${CouponType.QR_CODE}`;
      break
    case CouponType.UPC_CODE:
      coupon.coupon_code = payload.coupon.coupon_code as string;
      coupon.upc_code = payload.coupon.upc_code as string;
      break
    default: 
    coupon = {...payload.coupon }
  }

  // 5) Create
  const finalPayload = {
    _id,
    shop: shopId,
    user: new mongoose.Types.ObjectId(user.userId),
    category: categoryId,

    title: payload.title,
    reguler_price: payload.reguler_price,
    discount: payload.discount,

    highlight,
    description: payload.description,
    images,
 
    couponType: payload.couponType,
    coupon
  };
  const doc = await ServiceModel.create(finalPayload);

  return doc;
}


// 2. Service Delete API
const deleteService = async (user: JwtPayload, serviceId: string) => {
  if (user.role !== Role.VENDOR ) {
    throw new AppError(StatusCodes.FORBIDDEN, "Only vendor can delete");
  }


  // Check is service exist
  const isServiceExist = await ServiceModel.findById(serviceId);
  if (!isServiceExist) {
    throw new AppError(StatusCodes.NOT_FOUND, "Service not found");
  }

    // 3. Check if the vendor owns the service by shop
  const isShopOwner = await Shop.exists({ _id: isServiceExist.shop, vendor: user.userId });
  if (!isShopOwner) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "You are not authorized to delete this service");
  }

  const deleteService = await ServiceModel.deleteOne({ _id: serviceId });
  
  if (deleteService.deletedCount > 0) {
   /*
   ========================================================================
    DELETE EXTERNAL DATA FROM OTHERS COLLECTION BY THIS ID
   ========================================================================
   */
 }



 // 6. Delete images asynchronously using promises
 setImmediate( async() => {
  try {
    const imageDeletionPromises = isServiceExist.images.map(image => deleteImageFromCLoudinary(image));
    await Promise.all(imageDeletionPromises);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error deleting images from Cloudinary:", error);
  }
 })

  return null
}

export const servicesLayer = {
  createService,
  deleteService
}
