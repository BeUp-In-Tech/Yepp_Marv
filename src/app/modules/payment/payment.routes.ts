import { Router } from "express";
import { checkAuth } from "../../middlewares/auth.middleware";
import { paymentControllers } from "./payment.controllers";
import { Role } from "../user/user.interface";


const router = Router();

router.post('/api/verify-purchase',   paymentControllers.inAppPurchase);
router.post('/stripe_pay', checkAuth(...Object.keys(Role)), paymentControllers.stripePayment);


export const paymentRouter = router;