import z from "zod";


export const adminNotificationAndEmailZodSchema = z.object({
    title: z.string( 'Title is required'),
    message: z.string('Message is required'),
    channel: z.object({
        push: z.boolean("Channel filed must be boolean").optional(),
        email: z.boolean("Channel field must be boolean").optional()
    }),
    to: z.object({
        all_users: z.boolean("All vendors field must be boolean").optional(),
        active_vendors: z.boolean("Active vendors field must be boolean").optional(),
    })
})