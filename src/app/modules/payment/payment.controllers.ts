/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { paymentService } from "./payment.services";
import { JwtPayload } from 'jsonwebtoken';


// STRIPE CHECKOUT
const inAppPurchase = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await paymentService.inAppPurchase(req.body);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Checkout session created",
        data: result
    })
})


// STRIPE CHECKOUT
const stripePayment = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as JwtPayload;
    const {dealId, planId, voucher} = req.body;
    
    const result = await paymentService.stripePay(user, dealId, planId, voucher);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Checkout session created",
        data: result
    })
})

// STRIPE WEBHOOK
const stripeWebhook = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
 
    const result = await paymentService.stripeWebhookHandling(req);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Webhook listend",
        data: result
    })
})


export const paymentControllers = {
    stripePayment,
    stripeWebhook,
    inAppPurchase
}