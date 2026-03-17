import { Router } from "express";
import { dashboardControllers } from "./dashboard.controller";
import { checkAuth } from "../../middlewares/auth.middleware";
import { Role } from "../user/user.interface";


const router = Router();

router.get('/deals_by_category_stats', checkAuth(Role.ADMIN), dashboardControllers.dealsByCategoryStats);
router.get('/vendor_stats', checkAuth(Role.ADMIN), dashboardControllers.vendorsStats);
router.get('/recent_deals', checkAuth(Role.ADMIN), dashboardControllers.recentDealsStats);
router.get('/deals_stats', checkAuth(Role.ADMIN), dashboardControllers.dealsStats);
router.get('/dashboard_analytics_total', checkAuth(Role.ADMIN), dashboardControllers.dashboardAnalyticsTotal);
router.get('/last_one_year_revenue_trend', checkAuth(Role.ADMIN), dashboardControllers.getRevenueTrend);
router.get('/latest_transactions', checkAuth(Role.ADMIN), dashboardControllers.getLatestTransaction);


export const dashboardRouter = router;