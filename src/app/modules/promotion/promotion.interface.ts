import { Types } from "mongoose";


export enum PromotionStatus {
    SCHEDULED = 'SCHEDULED',
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    CANCELED = 'CANCELED',
    REFUNDED = 'REFUNDED'
}


export interface IPromotion extends Document {
  vendor?: Types.ObjectId; 
  shop: Types.ObjectId;
  service: Types.ObjectId;
  payment: Types.ObjectId;
  validityDays: number;
  price: number;
  startAt: Date;
  endAt: Date;
  status: PromotionStatus;
  // audit / control
  canceledAt?: Date;
  // helpful metadata
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}