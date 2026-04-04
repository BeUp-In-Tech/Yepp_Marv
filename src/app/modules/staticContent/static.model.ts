import { Schema, model } from 'mongoose';
import { STATIC_PAGES } from './static.interface';


export type StaticPageSlug = (typeof STATIC_PAGES)[number];

// Interface
export interface IStaticPage {
  slug: StaticPageSlug;
  title: string;
  content: string;

  // optional but recommended
  metaTitle?: string;
  metaDescription?: string;
  isPublished?: boolean;
}

// Schema
const staticPageSchema = new Schema<IStaticPage>(
  {
    slug: {
      type: String,
      enum: STATIC_PAGES,
      required: true,
      unique: true, // one page per slug
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    // SEO fields
    metaTitle: {
      type: String,
      trim: true,
    },

    metaDescription: {
      type: String,
      trim: true,
    },

    // control visibility
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index (optional but useful)
// staticPageSchema.index({ slug: 1 });

// Model
export const StaticPageModel = model<IStaticPage>(
  'staticPage',
  staticPageSchema
);