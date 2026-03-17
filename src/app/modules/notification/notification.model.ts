import { INotification, NotificationType } from './notification.interface';
import { model, Schema } from 'mongoose';

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    entityId: {
      type: String
    },

    webUrl: {
      type: String,
      required: true,
    },

    deepLink: {
      type: String,
      required: true,
    },
    data: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = model<INotification>(
  'notification',
  NotificationSchema
);
