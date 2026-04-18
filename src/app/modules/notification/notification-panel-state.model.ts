import { model, Schema, Types } from 'mongoose';

interface INotificationPanelState {
  user?: Types.ObjectId;
  clientId?: string;
  lastOpenedAt: Date;
}

const NotificationPanelStateSchema = new Schema<INotificationPanelState>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
    clientId: {
      type: String,
      trim: true,
    },
    lastOpenedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

NotificationPanelStateSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { user: { $exists: true } } }
);
NotificationPanelStateSchema.index(
  { clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
);

export const NotificationPanelStateModel =
  model<INotificationPanelState>(
    'notification_panel_state',
    NotificationPanelStateSchema
  );
