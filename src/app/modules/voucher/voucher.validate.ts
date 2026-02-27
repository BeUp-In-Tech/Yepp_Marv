import z from "zod";

export const voucherValidationSchema = z.object({
  voucher_code: z
    .string()
    .min(1, "Voucher code is required")
    .trim()
    .toUpperCase(),

  voucher_discount: z
    .number({
      message: "Voucher discount must be a number",
    })
    .min(0, "Discount cannot be negative"),

  voucher_validity: z.coerce.date({
    message: "Voucher validity date is required",
  }),

  voucher_limit: z
    .number({
      message: "Voucher limit must be a number",
    })
    .min(0, "Voucher limit cannot be negative"),
});