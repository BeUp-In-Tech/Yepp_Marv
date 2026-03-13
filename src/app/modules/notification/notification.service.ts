import { NotificationType } from './notification.interface';
import { NotificationModel } from './notification.model';

// GET ALL NOTIFICATION
export const readAllNotificationService = async (
    query: Record<string, string>
) => {

    const userId = query.userId as string;
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;

  const _query = userId
    ? { $or: [{ user: userId }, { type: NotificationType.SYSTEM }] }
    : { type: NotificationType.SYSTEM };

  const skip = (page - 1) * limit;

  const notifications = await NotificationModel.find(_query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const unreadCount = await NotificationModel.countDocuments({
    ..._query,
    isRead: false,
  });

  return {
      unreadCount,
      page,
      limit,
      notifications
  };
};

export const markNotificationAsReadService = async (notificationId: string) => {
  const notification = await NotificationModel.findByIdAndUpdate(
    notificationId,
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification;
};

export const notificationService = {
  readAllNotificationService,
  markNotificationAsReadService
};
