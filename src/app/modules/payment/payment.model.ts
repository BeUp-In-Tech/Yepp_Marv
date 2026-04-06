import { model, Schema } from "mongoose";
import { IPayment, PaymentProvider, PaymentStatus } from "./payment.interface";

const PaymentSchema = new Schema<IPayment>(
  {
    deal: {
      type: Schema.Types.ObjectId,
      ref: 'deal',
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true 
    },
    promotion: {
      type: Schema.Types.ObjectId,
      ref: 'promotion',
      required: false
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'plan',
      required: false
    },
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    payment_geteway_charge: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'USD'
    },
    voucher_applied: {
      type: String,
      uppercase: true,
      trim: true
    },
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      required: true,
    },
    payment_status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
      default: PaymentStatus.PENDING,
      index: true,
    },
    invoice_url: {
      type: String,
      trim: true,
    },
    stripe_session_id: {
      type: String,
      trim: true
    },
    payment_intent_id: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


PaymentSchema.index(
  { deal: 1, transaction_id: 1 },
  { unique: true }
);

export const PaymentModel = model<IPayment>('payment', PaymentSchema)