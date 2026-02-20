import { Router } from "express";
import { shopController } from "./shop.controllers";
import { validateRequest } from "../../middlewares/validateRequest";
import { shopValidationSchema } from "./shop.validate";
import { checkAuth } from "../../middlewares/auth.middleware";
import { Role } from "../user/user.interface";
import { multerUpload } from "../../config/multer.config";


const router = Router();

router.post('/create_shop', multerUpload.single('file'),  validateRequest(shopValidationSchema), checkAuth(Role.VENDOR),  shopController.createShop);
router.get('/shop_details', checkAuth(Role.VENDOR),  shopController.getShopDetails);



export const shopRouter =  router;