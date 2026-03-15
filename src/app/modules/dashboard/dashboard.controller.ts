/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { dashboardServices } from "./dashboard.service";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";


const dealsByCategoryStats = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await dashboardServices.dealsByCategoryStats();

    SendResponse(res,{
        success: true,
        statusCode: StatusCodes.OK,
        message: "Deals by category statistics fetched successfully",
        data: result
    });
});


// EXPORT ALL THE CONTROLLERS
export const dashboardControllers = {
    dealsByCategoryStats
}

