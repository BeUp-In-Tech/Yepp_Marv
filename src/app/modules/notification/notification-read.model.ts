import { model, Schema, Types } from 'mongoose';

interface INotificationRead {
  user?: Types.ObjectId;
  clientId?: string;
  notification: Types.ObjectId;
}

const NotificationReadSchema = new Schema<INotificationRead>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
    clientId: {
      type: String,
      trim: true,
    },
    notification: {
      type: Schema.Types.ObjectId,
      ref: 'notification',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationReadSchema.index(
  { user: 1, notification: 1 },
  { unique: true, partialFilterExpression: { user: { $exists: true } } }
);
NotificationReadSchema.index(
  { clientId: 1, notification: 1 },
  { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
);

export const NotificationReadModel = model<INotificationRead>(
  'notification_read',
  NotificationReadSchema
);
