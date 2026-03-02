import { model, Schema } from "mongoose";
import { IPromotion, PromotionStatus } from "./promotion.interface";

/* ---------------- SCHEMA ---------------- */
const promotionSchema = new Schema<IPromotion>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },

    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },

    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },

    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true
    },

    validityDays: {
      type: Number,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    stripe_session_id: {
      type: String,
      trim: true
    },

    startAt: {
      type: Date
    },

    endAt: {
      type: Date
    },

    status: {
      type: String,
      enum: Object.values(PromotionStatus),
      default: PromotionStatus.PENDING
    },

    canceledAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);


promotionSchema.index({ status: 1, startAt: 1 });
promotionSchema.index({ status: 1, endAt: 1 });

promotionSchema.index({
  service: 1,
  status: 1
});

/* ---------------- MODEL ---------------- */
export const Promotion = model<IPromotion>(
  'promotion',
  promotionSchema
);