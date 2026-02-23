import z from "zod";

export const categoryZodSchema = z.object({
    category_name: z.string("input must be string").min(3, "Input must be 3 characters").max(100, "Input must be maximum 100 characters"),
    // category_image: z.string("Input should be string")
});


export const categoryUpdateZodSchema = z.object({
    category_name: z.string("input must be string").min(3, "Input must be 3 characters").max(100, "Input must be maximum 100 characters").optional(),
    // category_image:  z.string("Input should be string").optional(),
    isDeleted: z.boolean("Input must be boolean").optional()
})