import { JwtPayload } from "jsonwebtoken";
import { Role } from "../user/user.interface";
import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";
import { ServiceModel } from "../service/service.model";
import { Plan } from "../plan/plan.model";
import { voucherServices } from "../voucher/voucher.services";


interface StripePayload {
    serviceId: string,
    planId: string,
    voucher?: string
}

// STRIPE PAYMENT -> PROMOTE SERVICE
const stripePay = async (user: JwtPayload, { serviceId, planId, voucher}: StripePayload ) => {

    if (user.role !== Role.VENDOR) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "You can't promote service");
    }

    const isServicePromise = ServiceModel.findById(serviceId);
    const isPlanPromise = Plan.findById(planId);

    const [service, plan] = await Promise.all([isServicePromise, isPlanPromise]);

    if (!service) {
        throw new AppError(StatusCodes.NOT_FOUND, "Service not found");
    }

    if (!plan) {
        throw new AppError(StatusCodes.NOT_FOUND,"Plan not found");
    }

    if (voucher) {
        const applyVoucher = await voucherServices.applyVoucherService(user, voucher);
    }


    return null
}



export const paymentService = {
    stripePay
}