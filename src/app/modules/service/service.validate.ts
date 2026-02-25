import { z } from "zod";
import { CouponType } from "./service.interface";


const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");
const httpsUrl = z.string().url().refine((u) => u.startsWith("https://"), "Only https URLs allowed");

const couponSchema = z.object({
  coupon_code: z.string().min(3).max(40).optional(),
  qr_code: z.string().min(5).max(500).optional(),  // recommend URL payload
  upc_code: z.string().min(8).max(14).regex(/^\d+$/, "UPC must be digits").optional(),
});


// CREATE ZOD SCHEMA
export const CreateServiceZodSchema = z
  .object({
    shop: objectId,
    category: objectId,
    activePromotion: objectId.optional(),

    title: z.string().min(2).max(120).trim(),
    reguler_price: z.number().nonnegative(),
    discount: z.number().min(0).max(100).default(0), // percent

    highlight: z.array(z.string().min(1).max(120)).max(20).default([]),
    description: z.string().min(10).max(5000).trim(),

    images: z.array(httpsUrl).min(1).max(15),

    couponType: z.nativeEnum(CouponType),
    coupon: couponSchema.default({}),

    total_views: z.number().int().nonnegative().optional(),
    total_impression: z.number().int().nonnegative().optional(),
  })
  .superRefine((val, ctx) => {
    // Coupon rules based on couponType
    if (val.couponType === CouponType.COUPON_CODE && !val.coupon?.coupon_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coupon", "coupon_code"],
        message: "coupon_code is required when couponType is COUPON_CODE",
      });
    }

    if (val.couponType === CouponType.QR_CODE && !val.coupon?.qr_code) {
      // If you plan to system-generate QR, then remove this requirement
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coupon", "qr_code"],
        message: "qr_code is required when couponType is QR_CODE",
      });
    }

    if (val.couponType === CouponType.UPC_CODE && !val.coupon?.upc_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coupon", "upc_code"],
        message: "upc_code is required when couponType is UPC_CODE",
      });
    }

    if (val.couponType === CouponType.NONE) {
      // Ensure coupon object is empty-ish
      const hasAny =
        !!val.coupon?.coupon_code || !!val.coupon?.qr_code || !!val.coupon?.upc_code;
      if (hasAny) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["coupon"],
          message: "coupon must be empty when couponType is NONE",
        });
      }
    }
  });


  // UPDATE ZOD SCHEMA
  export const UpdateServiceZodSchema = CreateServiceZodSchema.partial().superRefine((val, ctx) => {
  // Only validate couponType requirements if couponType is being changed OR coupon is being sent
  const touchedCoupon = val.couponType !== undefined || val.coupon !== undefined;

  if (touchedCoupon) {
    const type = val.couponType;
    const c = val.coupon || {};

    if (type === CouponType.COUPON_CODE && !c.coupon_code) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coupon", "coupon_code"], message: "coupon_code required for COUPON_CODE" });
    }
    if (type === CouponType.QR_CODE && !c.qr_code) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coupon", "qr_code"], message: "qr_code required for QR_CODE" });
    }
    if (type === CouponType.UPC_CODE && !c.upc_code) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coupon", "upc_code"], message: "upc_code required for UPC_CODE" });
    }
    if (type === CouponType.NONE) {
      const hasAny = !!c.coupon_code || !!c.qr_code || !!c.upc_code;
      if (hasAny) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coupon"], message: "coupon must be empty for NONE" });
      }
    }
  }
});