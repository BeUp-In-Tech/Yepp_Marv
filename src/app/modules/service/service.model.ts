import { model, Schema } from "mongoose";
import { IService } from "./service.interface";

const ServiceSchema = new Schema<IService>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },
    activePromotion: {
      type: Schema.Types.ObjectId,
      ref: "promotions",
      required: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    reguler_price: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isPromoted: {
        type: Boolean,
        default: false
    },

    promotedUntil: {
      type: Date,
      required: true,
    },

    highlight: [
      {
        type: String,
        trim: true,
      },
    ],

    description: {
      type: String,
      required: true,
      trim: true,
    },

    coupon_code: {
      type: String,
      trim: true,
    },

    qr_code: {
      type: String,
      trim: true,
    },

    upc_code: {
      type: String,
      trim: true,
    },

    total_views: {
      type: Number,
      default: 0,
    },

    total_impression: {
      type: Number,
      default: 0,
    },
  },

  {
    timestamps: true, // createdAt + updatedAt
  }
);

export const Service = model<IService>(
  "service",
  ServiceSchema
);