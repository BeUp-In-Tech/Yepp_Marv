import { Router } from "express";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get('/', NotificationController.readAllNotification);
router.patch('/:id', NotificationController.markNotificationAsRead);


export const NotificationRouter = router;