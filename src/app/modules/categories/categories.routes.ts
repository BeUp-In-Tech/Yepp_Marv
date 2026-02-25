import { Router } from "express";
import { checkAuth } from "../../middlewares/auth.middleware";
import { Role } from "../user/user.interface";
import { categoryControllers } from "./categories.controllers";
import { multerUpload } from "../../config/multer.config";
import { validateRequest } from "../../middlewares/validateRequest";
import { categoryUpdateZodSchema, categoryZodSchema } from "./categories.validate";


const router = Router();

// CREATE CATEGORY
router.post('/', multerUpload.single('file'), checkAuth(Role.ADMIN), validateRequest(categoryZodSchema), categoryControllers.createCategory);

// GET CATEGORY
router.get('/', checkAuth(...Object.keys(Role)), categoryControllers.getCategories);

// UPDATE CATEGORY
router.patch('/:categoryId', multerUpload.single('file'), checkAuth(Role.ADMIN), validateRequest(categoryUpdateZodSchema), categoryControllers.updateCategory);

// DELETE CATEGORY
router.delete('/:categoryId', checkAuth(Role.ADMIN), categoryControllers.deleteCategory);

export const categoryRouter = router;