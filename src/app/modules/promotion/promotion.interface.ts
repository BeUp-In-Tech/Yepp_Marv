import { Types } from "mongoose";


export enum PromotionStatus {
    SCHEDULED = 'SCHEDULED',
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    CANCELED = 'CANCELED',
    REFUNDED = 'REFUNDED'
}


export interface IPromotion extends Document {
  user?: Types.ObjectId; 
  shop: Types.ObjectId;
  service: Types.ObjectId;
  payment: Types.ObjectId;
  validityDays: number;
  price: number;
  startAt: Date;
  endAt: Date;
  status: PromotionStatus;
  canceledAt?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}