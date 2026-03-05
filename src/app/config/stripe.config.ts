import _stripe from 'stripe';
import env from './env';

export const stripe = new _stripe(env.STRIPE_SECRET_KEY as string);