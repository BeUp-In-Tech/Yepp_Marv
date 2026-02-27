import { Types } from "mongoose";

export enum PaymentProvider {
    STRIPE = 'STRIPE',
    GOOGLE_PAY = 'GOOGLE_PAY',
    APPLE_PAY = 'APPLE_PAY'
}

export enum PaymentStatus {
    PAID = 'PAID',
    PENDING = 'PENDING',
    FAILED = 'FAILED',
    CANCELED = 'CANCELED'
}

export interface IPayment {
    _id?: Types.ObjectId;
    service: Types.ObjectId;
    user: Types.ObjectId;
    promotion?: Types.ObjectId;
    transaction_id: string;
    amount: number;
    currency?: string;
    provider: PaymentProvider;
    payment_status: PaymentStatus;
    invoice_url?: string;
}