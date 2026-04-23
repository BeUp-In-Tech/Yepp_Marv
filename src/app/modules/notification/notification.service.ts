import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import AppError from '../../errorHelpers/AppError';
import User from '../user/user.model';
import { NotificationType } from './notification.interface';
import { NotificationModel } from './notification.model';
import { NotificationPanelStateModel } from './notification-panel-state.model';
import { NotificationReadModel } from './notification-read.model';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const clientIdRegex = /^[a-zA-Z0-9._:-]{8,128}$/;

type NotificationTrackingFilter =
  | { user: Types.ObjectId; clientId?: never }
  | { clientId: string; user?: never };

const validateObjectId = (value: string, fieldName: string) => {
  if (!objectIdRegex.test(value)) {
    throw new AppError(StatusCodes.BAD_REQUEST, `Invalid ${fieldName}`);
  }

  return new Types.ObjectId(value);
};

const normalizeClientId = (clientId?: string) => {
  if (!clientId) {
    return null;
  }

  const trimmedClientId = clientId.trim();

  if (!clientIdRegex.test(trimmedClientId)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Invalid notification client id'
    );
  }

  return trimmedClientId;
};

const parsePositiveInteger = (
  value: string | undefined,
  fieldName: string,
  defaultValue: number
) => {
  if (!value) {
    return defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a positive number`
    );
  }

  return Number(value);
};

const getPagination = (query: Record<string, string>) => {
  const page = parsePositiveInteger(query.page, 'Page', 1);
  const limit = parsePositiveInteger(query.limit, 'Limit', 20);

  if (limit < 1 || limit > 100) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Limit must be between 1 and 100'
    );
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: number }).code === 11000;

const markNotificationPanelOpened = async (
  readFilter: NotificationTrackingFilter
) => {
  const openedAt = new Date();

  try {
    await NotificationPanelStateModel.updateOne(
      readFilter,
      {
        $set: {
          ...readFilter,
          lastOpenedAt: openedAt,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    await NotificationPanelStateModel.updateOne(readFilter, {
      $set: { lastOpenedAt: openedAt },
    });
  }
};

const getAuthenticatedUserCreatedAt = async (authUserId?: string) => {
  if (!authUserId) {
    return null;
  }

  const userObjectId = validateObjectId(authUserId, 'userId');
  const user = await User.findById(userObjectId)
    .select('createdAt')
    .lean<{ createdAt?: Date } | null>();

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  return user.createdAt ?? null;
};

const getSystemNotificationCreatedAtQuery = (
  lastOpenedAt?: Date,
  userCreatedAt?: Date | null
) => {
  if (lastOpenedAt && userCreatedAt) {
    const effectiveSince =
      lastOpenedAt.getTime() > userCreatedAt.getTime()
        ? lastOpenedAt
        : userCreatedAt;

    return { createdAt: { $gt: effectiveSince } };
  }

  if (lastOpenedAt) {
    return { createdAt: { $gt: lastOpenedAt } };
  }

  if (userCreatedAt) {
    return { createdAt: { $gte: userCreatedAt } };
  }

  return {};
};

const getNotificationContext = (
  authUserId?: string,
  notificationClientId?: string
) => {
  const userObjectId = authUserId
    ? validateObjectId(authUserId, 'userId')
    : null;
  const clientId = normalizeClientId(notificationClientId);
  const readFilter: NotificationTrackingFilter | null = userObjectId
    ? { user: userObjectId }
    : clientId
      ? { clientId }
      : null;

  return {
    userObjectId,
    readFilter,
  };
};

const getNotificationQuery = (
  userObjectId: Types.ObjectId | null,
  userCreatedAt?: Date | null
) =>
  userObjectId
    ? {
        $or: [
          { user: userObjectId },
          {
            type: NotificationType.SYSTEM,
            ...getSystemNotificationCreatedAtQuery(undefined, userCreatedAt),
          },
        ],
      }
    : { type: NotificationType.SYSTEM };

const getPanelUnreadCount = async (
  readFilter: NotificationTrackingFilter,
  userObjectId: Types.ObjectId | null,
  userCreatedAt?: Date | null
) => {
  const [readSystemNotificationIds, panelState] = await Promise.all([
    NotificationReadModel.distinct('notification', readFilter),
    NotificationPanelStateModel.findOne(readFilter)
      .select('lastOpenedAt')
      .lean(),
  ]);

  const createdAfterLastOpenQuery = getSystemNotificationCreatedAtQuery(
    panelState?.lastOpenedAt,
    userCreatedAt
  );
  const systemUnreadQuery = {
    type: NotificationType.SYSTEM,
    isRead: false,
    ...createdAfterLastOpenQuery,
    ...(readSystemNotificationIds.length
      ? { _id: { $nin: readSystemNotificationIds } }
      : {}),
  };

  const [userUnreadCount, systemUnreadCount] = await Promise.all([
    userObjectId
      ? NotificationModel.countDocuments({
          user: userObjectId,
          isRead: false,
          ...createdAfterLastOpenQuery,
        })
      : Promise.resolve(0),
    NotificationModel.countDocuments(systemUnreadQuery),
  ]);

  return {
    unreadCount: userUnreadCount + systemUnreadCount,
    readSystemNotificationIds,
  };
};

// GET ALL NOTIFICATION
export const readAllNotificationService = async (
  query: Record<string, string>,
  authUserId?: string,
  notificationClientId?: string
) => {
  const userCreatedAt = await getAuthenticatedUserCreatedAt(authUserId);
  const { userObjectId, readFilter } = getNotificationContext(
    authUserId,
    notificationClientId
  );
  const { page, limit, skip } = getPagination(query);
  const _query = getNotificationQuery(userObjectId, userCreatedAt);

  if (!readFilter) {
    const notifications = await NotificationModel.find(_query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      unreadCount: 0,
      page,
      limit,
      readTracking: false,
      notifications,
    };
  }

  const [notifications, unreadMeta] = await Promise.all([
    NotificationModel.find(_query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    getPanelUnreadCount(readFilter, userObjectId, userCreatedAt),
  ]);

  const readSystemNotificationIdSet = new Set(
    unreadMeta.readSystemNotificationIds.map((id) => id.toString())
  );

  const notificationsWithReadStatus = notifications.map((notification) => {
    if (notification.type !== NotificationType.SYSTEM) {
      return notification;
    }

    return {
      ...notification,
      isRead:
        notification.isRead ||
        readSystemNotificationIdSet.has(notification._id.toString()),
    };
  });

  return {
    unreadCount: unreadMeta.unreadCount,
    page,
    limit,
    readTracking: true,
    notifications: notificationsWithReadStatus,
  };
};

// MARK NOTIFICATION PANEL OPENED
export const openNotificationPanelService = async (
  authUserId?: string,
  notificationClientId?: string
) => {
  const userCreatedAt = await getAuthenticatedUserCreatedAt(authUserId);
  const { userObjectId, readFilter } = getNotificationContext(
    authUserId,
    notificationClientId
  );

  if (!readFilter) {
    return {
      unreadCount: 0,
      clearedCount: 0,
      readTracking: false,
    };
  }

  const { unreadCount } = await getPanelUnreadCount(
    readFilter,
    userObjectId,
    userCreatedAt
  );

  await markNotificationPanelOpened(readFilter);

  return {
    unreadCount: 0,
    clearedCount: unreadCount,
    readTracking: true,
  };
};

// GET SINGLE NOTIFICATION
export const getSingleNotificationService = async (
  notificationId: string,
  authUserId?: string,
  notificationClientId?: string
) => {
  const userCreatedAt = await getAuthenticatedUserCreatedAt(authUserId);
  const notificationObjectId = validateObjectId(
    notificationId,
    'notificationId'
  );
  const userObjectId = authUserId
    ? validateObjectId(authUserId, 'userId')
    : null;
  const clientId = normalizeClientId(notificationClientId);
  const readFilter = userObjectId
    ? { user: userObjectId }
    : clientId
      ? { clientId }
      : null;

  const notification = await NotificationModel.findOne({
    _id: notificationObjectId,
    ...(userObjectId
      ? {
          $or: [
            { user: userObjectId },
            {
              type: NotificationType.SYSTEM,
              ...getSystemNotificationCreatedAtQuery(undefined, userCreatedAt),
            },
          ],
        }
      : { type: NotificationType.SYSTEM }),
  }).lean();

  if (!notification) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  if (notification.type === NotificationType.SYSTEM) {
    if (readFilter) {
      await NotificationReadModel.updateOne(
        {
          ...readFilter,
          notification: notificationObjectId,
        },
        {
          $setOnInsert: {
            ...readFilter,
            notification: notificationObjectId,
          },
        },
        { upsert: true }
      );
    }

    return {
      ...notification,
      isRead: !!readFilter || notification.isRead,
    };
  }

  if (!userObjectId) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  const updatedNotification = await NotificationModel.findOneAndUpdate(
    {
      _id: notificationObjectId,
      user: userObjectId,
    },
    { $set: { isRead: true } },
    { new: true }
  ).lean();

  if (!updatedNotification) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  return updatedNotification;
};

export const notificationService = {
  readAllNotificationService,
  openNotificationPanelService,
  getSingleNotificationService,
};
