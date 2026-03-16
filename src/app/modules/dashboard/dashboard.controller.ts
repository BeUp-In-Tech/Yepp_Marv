/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { dashboardServices } from "./dashboard.service";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";

// 1. CATEGORY BY PROMOTED DEAL COUNT
const dealsByCategoryStats = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await dashboardServices.dealsByCategoryStats();

    SendResponse(res,{
        success: true,
        statusCode: StatusCodes.OK,
        message: "Deals by category statistics fetched successfully",
        data: result
    });
});


// 2. VENDORS STATS
const recentVendorsStats = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await dashboardServices.recentVendorsStats(req.query as Record<string, string>);

    SendResponse(res,{
        success: true,
        statusCode: StatusCodes.OK,
        message: "Recent vendors statistics fetched successfully",
        data: result
    });
});


// 3. RECENT DEALS STATS
const recentDealsStats = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await dashboardServices.recentDealsStats(req.query as Record<string, string>);

    SendResponse(res,{
        success: true,
        statusCode: StatusCodes.OK,
        message: "Recent deals statistics fetched successfully",
        data: result
    });
});


// 4. DEALS STATS
const dealsStats = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await dashboardServices.dealsStats(req.query as Record<string, string>);

    SendResponse(res,{
        success: true,
        statusCode: StatusCodes.OK,
        message: "Deals statistics fetched successfully",
        data: result
    });
});


// 5. DASHBOARD ANALYTICS TOTAL
const dashboardAnalyticsTotal = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await dashboardServices.dashboardAnalyticsTotal();

    SendResponse(res,{
        success: true,
        statusCode: StatusCodes.OK,
        message: "Dashboard total anaylytics counts fetched successfully",
        data: result
    });
});


// EXPORT ALL THE CONTROLLERS
export const dashboardControllers = {
    dealsByCategoryStats,
    recentVendorsStats,
    recentDealsStats,
    dealsStats,
    dashboardAnalyticsTotal
}

