import { Types } from "mongoose";

export interface IVoucher {
    _id?: Types.ObjectId;
    voucher_code: string;
    voucher_discount: number;
    voucher_validity: Date;
    voucher_limit: number;
}