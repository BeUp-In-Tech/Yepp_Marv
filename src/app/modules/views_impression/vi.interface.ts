import { Types } from 'mongoose';

export type AnalyticsType = 'view' | 'impression';

export interface IViewsImpressions {
  deal: Types.ObjectId;
  user?: Types.ObjectId; // optional (if logged in user)
  type: AnalyticsType;
  createdAt?: Date;
}