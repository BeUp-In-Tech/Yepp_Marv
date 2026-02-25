/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceModel } from './service.model';
import { Types } from 'mongoose';
import {  IService } from './service.interface';
import { JwtPayload } from 'jsonwebtoken';
import { Shop } from '../shop/shop.model';
import { Role } from '../user/user.interface';
import AppError from '../../errorHelpers/AppError';
import StatusCodes from 'http-status-codes';

export async function createService(params: {
  user: JwtPayload;
  payload: IService; // used for auto QR URL
}) {
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

  /*
  
  Handle Coupon_code, Upc_code, qr_code here

  
  
  
  */
 

  // 5) Create
  const finalPayload = {
    _id,
    shop: shopId,
    category: categoryId,

    title: payload.title,
    reguler_price: payload.reguler_price,
    discount: payload.discount,

    highlight,
    description: payload.description,
    images,

    // promotion (you can later refuser to promotedUntil only)
    isPromoted: payload.isPromoted ?? false,
    promotedUntil: payload.promotedUntil ?? null,

    couponType: payload.couponType,
  };
  const doc = await ServiceModel.create(finalPayload);

  return doc;
}
