/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { servicesLayer } from "./service.services";
import { JwtPayload } from "jsonwebtoken";


const createShop = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as JwtPayload;

    const payload = {
      ...req.body,
      images: req.files
        ? (req.files as Express.Multer.File[]).map((file) => file.path)
        : [],
    };

    const result = await servicesLayer.createService({ user, payload });

    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Shop created",
        data: result
    })
});




export const serviceControllers = {
    createShop
}