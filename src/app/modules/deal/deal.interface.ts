import { Types } from "mongoose";

export interface IDeal {
    _id?: Types.ObjectId;
    shop: Types.ObjectId;
    category: Types.ObjectId;
    user: Types.ObjectId;
    activePromotion?: Types.ObjectId;
    title: string;
    reguler_price: number;
    discount: number;
    highlight: string[];
    deletedHighlights: [];
    description: string;
    images: string[];
    deletedImages: string[];
    isPromoted?: boolean;
    promotedUntil?: Date;
    coupon: string;
    coupon_option: {
        qr?: string;
        upc?: string;
    }
    available_in_outlet?: [Types.ObjectId];
    createdAt?: Date;
}   