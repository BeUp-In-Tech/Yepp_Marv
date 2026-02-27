import { Schema, model } from "mongoose";
import { IVoucher } from "./voucher.interface";

const voucherSchema = new Schema<IVoucher>(
  {
    voucher_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    voucher_discount: {
      type: Number,
      required: true,
      min: 0,
    },

    voucher_validity: {
      type: Date,
      required: true,
    },

    voucher_limit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Voucher = model<IVoucher>("voucher", voucherSchema);