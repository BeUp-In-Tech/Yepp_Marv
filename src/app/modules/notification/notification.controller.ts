/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { notificationService } from "./notification.service";


// GET ALL NOTIFICATION
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


// MARK NOTIFICATION AS READ
const markNotificationAsRead = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const notificationId = req.params.id as string;
    const result = await notificationService.markNotificationAsReadService(notificationId);

    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Notification marked as read",
        data: result
    })
});



export const NotificationController = {
    readAllNotification,
    markNotificationAsRead
}