import z from "zod";
import { IPlatform, Role } from "./user.interface";

 

 export const userZodSchema = z.object({
    user_name: z
            .string({error: "Name must be string type!"})
            .min(3, "Name must be at least minimum 3 characters!")
            .max(100, "Name must be maximum 100 characters! "),
    email: z
            .string().email(),
    password: z
                .string({error: "Password shuld be string type!"})
                .min(6, "Password length shuld be at least 6!")
                .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/, {
                    message: "Password must be at least 1 uppercase character, 1 special charater, 1 number!"
                })
                .optional()
 });


 export const userUpdateZodSchema = z.object({
    user_name: z
            .string({error: "Name must be string type!"})
            .min(3, "Name must be at least minimum 3 characters!")
            .max(100, "Name must be maximum 100 characters! ")
            .optional(),
    role: z
            .enum(Object.values(Role))
            .optional()
 });



 // FCM TOKEN REGISTER SCHEMA
 export const registerSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(IPlatform),
  deviceId: z.string().min(6),
  deviceName: z.string().optional(),
});

export const unregisterSchema = z.object({
  deviceId: z.string().min(6),
});