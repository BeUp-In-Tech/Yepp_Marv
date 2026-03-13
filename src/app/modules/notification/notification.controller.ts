/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { notificationService } from "./notification.service";


const readAllNotification = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query as Record<string, string>;
    const result = await notificationService.readAllNotificationService(query );

    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Notification fetched successfully",
        data: result
    })
});



export const NotificationController = {
    readAllNotification
}