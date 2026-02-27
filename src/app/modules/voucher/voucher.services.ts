import { JwtPayload } from "jsonwebtoken";
import { IVoucher } from "./voucher.interface";
import { Role } from "../user/user.interface";
import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";
import { Voucher } from "./voucher.model";

const createVoucherService = async (user: JwtPayload, payload: IVoucher) => {
    if (user.role !== Role.ADMIN) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "Only admin can create voucher");
    }

    const voucher = await Voucher.create(payload);
    return voucher;
}



export const voucherServices = {
    createVoucherService
}