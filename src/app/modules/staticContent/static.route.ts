
import { Router } from "express";
import { StaticPageController } from "./static.controller";
import { checkAuth } from "../../middlewares/auth.middleware";
import { Role } from "../user/user.interface";

const router = Router();

// 1. CREATE STATIC PAGE
router.post(
  "/create_page",
  checkAuth(Role.ADMIN),
  StaticPageController.createStaticPage
);

// 2. GET ALL STATIC PAGES
router.get(
  "/all_pages",
  StaticPageController.getAllStaticPages
);

// 3. GET SINGLE STATIC PAGE BY SLUG
router.get(
  "/:slug",
  StaticPageController.getStaticPage
);

// 4. UPDATE STATIC PAGE BY SLUG
router.patch(
  "/:slug",
  checkAuth(Role.ADMIN),
  StaticPageController.updateStaticPage
);

export const StaticPageRoutes = router;