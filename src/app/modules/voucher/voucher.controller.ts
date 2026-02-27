/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { voucherServices } from "./voucher.services";


const createVoucher = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as JwtPayload;
    const payload = req.body;

    const result = await voucherServices.createVoucherService(user, payload);

    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Voucher created",
        data: result
    })
});



export const voucherControllers = {
    createVoucher
}