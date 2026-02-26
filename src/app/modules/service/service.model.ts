/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema} from "mongoose";
import { CouponType } from "./service.interface";


const CouponSchema = new Schema(
  {
    coupon_code: { type: String, trim: true, maxlength: 40, default: null },
    qr_code: { type: String, trim: true, maxlength: 500, default: null }, // recommend URL payload
    upc_code: {
      type: String,
      trim: true,
      maxlength: 14,
      default: null,
      validate: {
        validator: (v: string) => v == null || /^\d{8,14}$/.test(v),
        message: "upc_code must be 8-14 digits",
      },
    },
  },
  { _id: false }
);

const ServiceSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: "shop", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },

    category: { type: Schema.Types.ObjectId, ref: "categories", required: true, index: true },
    activePromotion: { type: Schema.Types.ObjectId, ref: "promotion", default: null },

    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },

    reguler_price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 }, // percent

    highlight: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => Array.isArray(arr) && arr.length <= 20,
        message: "highlight cannot exceed 20 items",
      },
    },

    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },

    images: {
      type: [String],
      required: true,
      validate: [
        {
          validator: (arr: string[]) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 15,
          message: "images must contain 1 to 15 items",
        },
        {
          validator: (arr: string[]) => arr.every((u) => typeof u === "string" && u.startsWith("https://") && u.length <= 500),
          message: "each image must be a valid https url (max 500 chars)",
        },
      ],
    },

    // Promotion (you included these)
    isPromoted: { type: Boolean, default: false, index: true },
    promotedUntil: { type: Date, default: null, index: true },

    couponType: {
      type: String,
      enum: Object.values(CouponType),
      required: true,
      index: true,
    },
    coupon: { type: CouponSchema, default: {} },

    total_views: { type: Number, default: 0, min: 0 },
    total_impression: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Indexes you’ll use often
ServiceSchema.index({ shop: 1, category: 1 });
ServiceSchema.index({ category: 1, promotedUntil: -1 });

// Optional: make coupon codes unique per shop (only when exists)
ServiceSchema.index(
  { shop: 1, "coupon.coupon_code": 1 },
  {
    unique: true,
    partialFilterExpression: { "coupon.coupon_code": { $type: "string" } },
  }
);

// Normalize + conditional validation in one place
ServiceSchema.pre("validate", async function () {
  // Normalize coupon code
  if (this.coupon?.coupon_code) {
    this.coupon.coupon_code = this.coupon.coupon_code.trim().toUpperCase();
  }

  // Keep promotion consistent (but note time can still make it stale later)
  if (this.isPromoted === true && !this.promotedUntil) {
    // Force mongoose validation error
    this.invalidate("promotedUntil", "promotedUntil is required when isPromoted is true");
  }

  // CouponType conditional rules
  const t = this.couponType;
  const c = this.coupon || ({} as any);

  if (t === CouponType.NONE) {
    if (c.coupon_code || c.qr_code || c.upc_code) {
      this.invalidate("coupon", "coupon must be empty when couponType is NONE");
    }
  }

  if (t === CouponType.COUPON_CODE && !c.coupon_code) {
    this.invalidate("coupon.coupon_code", "coupon_code is required for COUPON_CODE");
  }

  if (t === CouponType.QR_CODE && !c.qr_code) {
    // If you want system-generated QR, remove this requirement and generate after create
    this.invalidate("coupon.qr_code", "qr_code is required for QR_CODE");
  }

  if (t === CouponType.UPC_CODE && !c.upc_code) {
    this.invalidate("coupon.upc_code", "upc_code is required for UPC_CODE");
  }
});

export const ServiceModel = mongoose.model("service", ServiceSchema);