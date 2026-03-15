import { Router } from "express";
import { dashboardControllers } from "./dashboard.controller";
import { checkAuth } from "../../middlewares/auth.middleware";
import { Role } from "../user/user.interface";


const router = Router();

router.get('/deals_by_category_stats', checkAuth(Role.ADMIN), dashboardControllers.dealsByCategoryStats)


export const dashboardRouter = router;