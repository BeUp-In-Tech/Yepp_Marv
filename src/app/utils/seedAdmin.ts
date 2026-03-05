/* eslint-disable no-console */
import env from "../config/env";
import { IUser, Role } from "../modules/user/user.interface";
import User from "../modules/user/user.model";


export const createAdmin = async () => {
    try {
        const isExist = await User.findOne({email: env.ADMIN_MAIL });
        if (isExist) {
             console.log("Admin already created");
             return
             
        }
        
        const adminPayload: IUser = {
            user_name: "Nayem Ahmed",
            email: env.ADMIN_MAIL,
            role: Role.ADMIN,
            isVerified: true,
            deviceTokens: [],
            password: env.ADMIN_PASSWORD
        }

    await User.create(adminPayload);
    console.log("Admin created");
    
    } catch (error) {
        console.log(error);
    }
}