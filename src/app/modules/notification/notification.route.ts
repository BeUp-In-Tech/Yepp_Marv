import { Router } from "express";
import { optionalAuth } from "../../middlewares/optionalAuth.middleware";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get('/', optionalAuth, NotificationController.readAllNotification);
router.patch('/panel/open', optionalAuth, NotificationController.openNotificationPanel);
router.get('/:id', optionalAuth, NotificationController.getSingleNotification);


export const NotificationRouter = router;
