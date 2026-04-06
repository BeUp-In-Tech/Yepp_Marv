import { Router } from "express";
import { checkAuth } from "../../middlewares/auth.middleware";
import { paymentControllers } from "./payment.controllers";
import { Role } from "../user/user.interface";


const router = Router();

router.post('/api/apple_in_app_purchase',   paymentControllers.appleInAppPurchase);
router.post('/api/google_in_app_purchase',   paymentControllers.googleInAppPurchase);
router.post('/stripe_pay', checkAuth(...Object.keys(Role)), paymentControllers.stripePayment);


export const paymentRouter = router;