import { model, Schema } from "mongoose";
import { ICategories } from "./categories.interface";


const categorySchema = new Schema<ICategories>({ 
    category_name: {type: String, required: true},
    category_image: {type: String, required: true},
    isDeleted: {type: Boolean, default: false }
}, {
    timestamps: true,
    versionKey: false
});


export const Category = model<ICategories>('category', categorySchema);