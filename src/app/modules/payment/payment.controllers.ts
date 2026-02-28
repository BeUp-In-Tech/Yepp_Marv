/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { paymentService } from "./payment.services";
import { JwtPayload } from 'jsonwebtoken';


const stripePayment = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as JwtPayload;
    const {serviceId, planId, voucher} = req.body;
    
    const result = await paymentService.stripePay(user, serviceId, planId, voucher);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Checkout session created",
        data: result
    })
})


export const paymentControllers = {
    stripePayment
}