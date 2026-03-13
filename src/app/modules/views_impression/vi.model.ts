import { Schema, model } from 'mongoose';
import { IViewsImpressions } from './vi.interface';


const dealAnalyticsSchema = new Schema<IViewsImpressions>(
  {
    deal: {
      type: Schema.Types.ObjectId,
      ref: 'deal',
      required: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },

    type: {
      type: String,
      enum: ['view', 'impression'],
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

dealAnalyticsSchema.index({ deal: 1, type: 1 });

export const Views_Impressions = model<IViewsImpressions>(
  'views_impression',
  dealAnalyticsSchema
);