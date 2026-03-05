import { Router } from "express";
import { shopController } from "./shop.controllers";
import { validateRequest } from "../../middlewares/validateRequest";
import { shopValidationSchema, updateShopValidationSchema } from "./shop.validate";
import { checkAuth } from "../../middlewares/auth.middleware";
import { Role } from "../user/user.interface";
import { multerUpload } from "../../config/multer.config";


const router = Router();

// CREATE SHOP
router.post('/create_shop', multerUpload.single('file'),  validateRequest(shopValidationSchema), checkAuth(Role.VENDOR),  shopController.createShop);
// GET SHOP DETAILS
router.get('/shop_details', shopController.getShopDetails);
// UPDATE SHOP
router.patch('/update_shop/:shopId',  multerUpload.single('file'), validateRequest(updateShopValidationSchema), checkAuth(Role.VENDOR, Role.ADMIN),  shopController.updateShop);



export const shopRouter =  router;