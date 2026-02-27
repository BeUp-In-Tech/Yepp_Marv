import { model, Schema } from "mongoose";
import { IPayment, PaymentProvider, PaymentStatus } from "./payment.interface";

const PaymentSchema = new Schema<IPayment>(
  {
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true 
    },
    promotion: {
      type: Schema.Types.ObjectId,
      ref: 'Promotion',
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
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'USD'
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PaymentSchema.index({ user: 1, payment_status: 1 });

export const PaymentModel = model<IPayment>('payment', PaymentSchema)