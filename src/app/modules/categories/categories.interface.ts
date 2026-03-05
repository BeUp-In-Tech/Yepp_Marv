import { Types } from "mongoose";


export interface ICategories {
    _id?: Types.ObjectId;
    category_name: string;
    category_image: string;
    isDeleted: boolean;
}