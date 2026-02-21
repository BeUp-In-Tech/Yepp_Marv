import { Types } from "mongoose";

export enum Role {
    USER = "USER",
    VENDOR = "VENDOR",
    ADMIN = "ADMIN"
}

export interface IAuthProvider {
    provider: "credentials" | "google" | "apple",
    providerId: string;
}

export enum IsActiveUser {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    BLOCKED = "BLOCKED"
}

export enum IPlatform {
    WEB = 'WEB',
    IOS = 'IOS',
    ANDROID = 'ANDROID'
}

export interface IFcmToken {
    deviceId: string;
    platform: IPlatform;
    token: string;
    deviceName: string;
    lastSeenAt: Date;
    isActive: boolean;
}

export interface IUser {
    _id?: Types.ObjectId;
    user_name: string;
    email: string;
    password?: string;
    isVerified?: boolean;
    isDeleted?: boolean;
    isActive?: IsActiveUser;
    deviceTokens: IFcmToken[];
    role?: Role;
    auths?: IAuthProvider[]
}