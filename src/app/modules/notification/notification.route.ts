import { Router } from "express";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get('/', NotificationController.readAllNotification);


export const NotificationRouter = router;