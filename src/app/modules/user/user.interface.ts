

export enum Role {
    USER = "USER",
    ADMIN = "ADMIN"
}

export interface IAuthProvider {
    provider: "credentials" | "google" | "facebook",
    providerId: string;
}

export interface IUser {
    _id: string;
    name: string;
    email: string;
    password?: string;
    picture?: string;
    isVerified?: boolean;
    otp?: string;
    role?: Role;
    auths?: IAuthProvider[]
}