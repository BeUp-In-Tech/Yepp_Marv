import { Router } from "express";
import { checkAuth } from "../../middlewares/auth.middleware";
import { paymentControllers } from "./payment.controllers";
import { Role } from "../user/user.interface";


const router = Router();

router.post('/stripe_pay', checkAuth(...Object.keys(Role)), paymentControllers.stripePayment);


export const paymentRouter = router;