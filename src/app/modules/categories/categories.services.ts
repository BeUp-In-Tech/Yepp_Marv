/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import User from "../user/user.model";
import { ICategories } from "./categories.interface";
import { Category } from "./categories.model";
import { Role } from "../user/user.interface";
import { deleteImageFromCLoudinary } from "../../config/cloudinary.config";


// CREATE CATEGORY
const createCategoryService = async (userId: string  ,payload: Partial<ICategories>) => {
    // Check user existance
    const user = await User.findById(userId).select("role").lean();
    if (!user) {
        throw new AppError(StatusCodes.NOT_FOUND, "User not found!");
    }

    // Only admin can create category
    if (user.role !== Role.ADMIN) {
        throw new AppError(StatusCodes.FORBIDDEN, "Only admin can create category");
    }

    // Check category exist by same name
    const isExist = await Category.findOne({ category_name: payload.category_name }).lean();
    if (isExist) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Category already exist by this name");
    };


    // Create and return category
    const category = await Category.create(payload);
    return category;
}

// GET ALL CATEGORIES
const getCategoriesService = async (isDeleted: boolean) => {
    const categories = await Category.find({ isDeleted })
    return categories;
};

// UPDATE CATEGORY
const updateCategoryService = async (categoryId: string, userId: string, payload: Partial<ICategories> ) => {
    const user = await User.findById(userId).lean();
    if (!user) {
        throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

     // Only admin can create category
    if (user.role !== Role.ADMIN) {
        throw new AppError(StatusCodes.FORBIDDEN, "Only admin can create category");
    }


    const update = await Category.findByIdAndUpdate(categoryId, payload);

    setImmediate(async () => {
        try {
            if(payload.category_image) {
            const deleteImage = await deleteImageFromCLoudinary(update?.category_image as string);
            console.log(deleteImage);
            
        }
        } catch (error: any) {
            console.log("Image delete error", error.message)
        }
    })
    return update;
}

// DELETE CATEGORY
const deleteCategoryService = async (userId: string, categoryId: string) => {
    const user = await User.findById(userId).select("role").lean()
    if (!user) {
        throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

     // Only admin can create category
    if (user.role !== Role.ADMIN) {
        throw new AppError(StatusCodes.FORBIDDEN, "Only admin can create category");
    }

    const deleteCategory = await Category.findByIdAndUpdate(categoryId, {isDeleted: true}, {runValidators: true, new: true});

    return deleteCategory;

}



export const categoryServices = {
    createCategoryService,
    getCategoriesService,
    updateCategoryService,
    deleteCategoryService
}