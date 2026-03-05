import { Types } from "mongoose";


export enum PromotionStatus {
    ACTIVE = 'ACTIVE',
    PENDING = 'PENDING',
    EXPIRED = 'EXPIRED',
    CANCELED = 'CANCELED'
}


export interface IPromotion extends Document {
  user?: Types.ObjectId; 
  shop: Types.ObjectId;
  deal: Types.ObjectId;
  payment: Types.ObjectId;
  validityDays: number;
  price: number;
  startAt?: Date;
  endAt?: Date;
  stripe_session_id?: string;
  status: PromotionStatus;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}