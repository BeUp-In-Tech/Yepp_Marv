/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { CatchAsync } from "../../utils/CatchAsync";
import { SendResponse } from "../../utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { categoryServices } from "./categories.services";
import { JwtPayload } from "jsonwebtoken";


const createCategory = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.user as JwtPayload;
    const payload = {
        ...req.body,
        category_image: req.file?.path as string
    }
    const result = await categoryServices.createCategoryService(userId, payload);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Category created",
        data: result
    })
});

const getCategories = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const isDelete = req.query.delete as string === 'true';
    const result = await categoryServices.getCategoriesService(isDelete as boolean);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Category fetched",
        data: result
    })
});

const updateCategory = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.user as JwtPayload;
    const { categoryId } = req.params;
    const payload = {
        ...req.body,
        category_image: req.file?.path as string
    }
    const result = await categoryServices.updateCategoryService(categoryId as string, userId, payload);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Category updated",
        data: result
    })
});

const deleteCategory = CatchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.user as JwtPayload;
    const { categoryId } = req.params;
    const result = await categoryServices.deleteCategoryService( userId, categoryId as string);
    SendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Category deleted",
        data: result
    })
});



export const categoryControllers = {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory
}