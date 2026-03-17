import { Types } from "mongoose";


export enum NotificationType {
    SHOP = "SHOP",
    PROMOTE = "PROMOTE",
    REMINDER = "REMINDER",
    PAYMENT = "PAYMENT",
    SYSTEM = "SYSTEM"
}

export interface INotification {
    _id?: Types.ObjectId;
    user?: Types.ObjectId;
    title: string;
    body: string;
    type: NotificationType;
    isRead?: boolean;
    entityId?: string;
    webUrl: string;
    deepLink: string;
    data?: Record<string, string>;
}