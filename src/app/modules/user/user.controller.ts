/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { userServices } from "./user.service";
import { JwtPayload } from "jsonwebtoken";



const registerUser = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await userServices.registerUser(req.body);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "User created!",
        data: result
    })
});

const updateUser = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as JwtPayload;
    const result = await userServices.updateUser(user, req.body);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "User updated!",
        data: result
    })
});



export const userControllers = {
    registerUser,
    updateUser
}