/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from 'jsonwebtoken';
import { Role } from '../user/user.interface';
import AppError from '../../errorHelpers/AppError';
import { StatusCodes } from 'http-status-codes';
import { Plan } from '../plan/plan.model';
import { voucherServices } from '../voucher/voucher.services';
import { stripe } from '../../config/stripe.config';
import { Promotion } from '../promotion/promotion.model';
import mongoose, { Types } from 'mongoose';
import { Shop } from '../shop/shop.model';
import { PromotionStatus } from '../promotion/promotion.interface';
import { PaymentModel } from './payment.model';
import { generateTransactionId } from '../../utils/generateTransactionId';
import { PaymentProvider, PaymentStatus } from './payment.interface';
import env from '../../config/env';
import Stripe from 'stripe';
import { Request } from 'express';
import { paymentSuccessHandler } from '../../utils/paymentHelper/paymentSuccess.helper';
import { paymentFailedHandler } from '../../utils/paymentHelper/paymentFailed.helper';
import { DealModel } from '../deal/deal.model';
import { dealHandleQueue } from '../../queue/index.queue';
import { JobName } from '../../queue/worker/deal.worker';
import { google } from 'googleapis';
import axios from 'axios';
import { scheduleDealJobs } from '../../queue/job/deal.job';
import { redisClient } from '../../config/redis.config';
import { invalidateAllMachineryCache } from '../../utils/deleteCachedData';
import { anyCurrencyToUSD } from '../../utils/currencyConverter';
 

// 1. Validate Android
async function validateAndroid(productId: string, purchaseToken: string) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error(`Env required: ${process.env.GOOGLE_SERVICE_ACCOUNT}`);
    }
    const credentials = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT as string
    );
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });


    const publisher = google.androidpublisher({
      version: 'v3',
      auth,
    });

    const res = await publisher.purchases.products.get({
      packageName: 'agency.beuptech.yepp',
      productId,
      token: purchaseToken,
    });

    const data = res.data as any;

    return (
      data.purchaseState === 0 && // purchased
      data.acknowledgementState === 1 // acknowledged
    );
  } catch (error: any) {
    console.log('Android In app purchase error: ', error);
    return false;
  }
}

// 2. Validate iOS
async function validateIOS(receipt: string) {
  const response = await axios.post(
    'https://buy.itunes.apple.com/verifyReceipt',
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        password: process.env.APPLE_SHARED_SECRET,
      }),
    }
  );

  const data = await response.data;
  console.log('IOS', data);

  // Sandbox fallback
  if (data.status === 21007) {
    const sandboxRes = await fetch(
      'https://sandbox.itunes.apple.com/verifyReceipt',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receipt,
          password: process.env.APPLE_SHARED_SECRET,
        }),
      }
    );

    return (await sandboxRes.json()).status === 0;
  }

  return data.status === 0;
}

// IN-APP-PURCHASE HANDLING
const inAppPurchase = async (payload: any) => {
  console.log('Payload: ', payload);

  let isValid = false;
  if (payload.source === 'google_play') {
    isValid = await validateAndroid(
      payload.productId,
      payload.serverVerificationData
    );
    console.log('Google verification: ', isValid);
  }

  if (payload.source === 'apple_play') {
    isValid = await validateIOS(payload.verificationData);
    console.log('Apple verification: ', isValid);
  }

  if (isValid) {
    // Calculate days based on ID
    const days = payload.productId.includes('7d')
      ? 7
      : payload.productId.includes('14d')
        ? 14
        : 30;

    const getDeal = await DealModel.findById(payload?.dealId);
    if (!getDeal) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Deal not found');
    }

    // CHECK ALREADY PROMOTED
    const alreadyPromoted = await Promotion.findOne({
      deal: payload?.dealId,
      status: PromotionStatus.ACTIVE,
    });

    if (alreadyPromoted) {
      console.log(
        `This service already promoted: dealId: ${payload?.dealId}, active_promotion_id: ${alreadyPromoted._id.toString()} `
      );

      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'This service already promoted'
      );
    }

    // PROMOTE DEAL
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const payment_id = new Types.ObjectId();

    const session = await mongoose.startSession();
    let promotion: any;
    try {
      session.startTransaction();

      const price = await anyCurrencyToUSD(payload?.price, payload?.currency);

      promotion = await Promotion.create(
        [
          {
            user: getDeal.user,
            shop: getDeal.shop,
            deal: payload?.dealId,
            payment: payment_id,
            validityDays: days,
            price: price, // price needed
            startAt: now,
            endAt: endDate,
            status: PromotionStatus.ACTIVE,
          },
        ],
        { session }
      );

      await PaymentModel.create(
        [
          {
            _id: payment_id,
            user: getDeal.user,
            deal: payload?.dealId,
            promotion: promotion[0]._id,
            transaction_id: generateTransactionId(),
            amount: price,
            currency: 'usd',
            voucher_applied: null,
            provider: PaymentProvider.GOOGLE_PAY,
            payment_status: PaymentStatus.PAID,
          },
        ],
        { session }
      );

      getDeal.promotedUntil = endDate;
      getDeal.isPromoted = true;
      getDeal.activePromotion = promotion._id;
      await getDeal.save({ session });

      await session.commitTransaction();

      // ADD QUEUE JOB SCHEDULE
      scheduleDealJobs(getDeal);

      // REMOVE REDIS CACHE KEY
      setImmediate(async () => {
        await redisClient.del(`shop:${getDeal.shop.toString()}`);
        await redisClient.del(`dashboard_analytics_total`); // dashboard analytics total cache invalidate
        await redisClient.del(`last_one_year_revenue_trend`); // last one year revenue trend cached invalidate (dashboard api)
        await invalidateAllMachineryCache('machinery:all:*'); // vendor stats cache invalidate (dashboard)
        await invalidateAllMachineryCache('all_vendors_dashboard:*'); // vendor stats cache invalidate (dashboard)
        await invalidateAllMachineryCache('latest_transaction:*'); // latest transaction list cache invalidate (dashboard)
        await invalidateAllMachineryCache(
          `my_deals-userId:${getDeal.user.toString()}:*`
        ); // get my deals cache invalidate (deal.service.ts)
      });
    } catch (error: any) {
      console.log('Deal promotion error from In App Purchase: ', error.message);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  return 'OK';
};

// STRIPE PAYMENT -> PROMOTE SERVICE
const stripePay = async (
  user: JwtPayload,
  _dealId: string,
  _planId: string,
  voucher: string
) => {
  const userId = new Types.ObjectId(user.userId);
  const dealId = new Types.ObjectId(_dealId);
  const planId = new Types.ObjectId(_planId);

  /* ---------- VALIDATION (OUTSIDE TRANSACTION) ---------- */
  if (user.role !== Role.VENDOR) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "You can't promote service");
  }

  const [deal, plan, shop] = await Promise.all([
    DealModel.findById(dealId),
    Plan.findById(planId),
    Shop.findOne({ vendor: user.userId }),
  ]);

  if (!deal) throw new AppError(StatusCodes.NOT_FOUND, 'Deal not found');
  if (!plan) throw new AppError(StatusCodes.NOT_FOUND, 'Plan not found');
  if (!shop) throw new AppError(StatusCodes.NOT_FOUND, 'Shop not found');

  if (!deal.shop.equals(shop._id)) {
    throw new AppError(StatusCodes.FORBIDDEN, 'Unauthorized');
  }

  // CHECK ALREADY PROMOTED
  const alreadyPromoted = await Promotion.findOne({
    user: userId,
    shop: shop._id,
    deal: dealId,
    status: {
      $in: [PromotionStatus.ACTIVE],
    },
  });

  if (alreadyPromoted) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'This service already promoted'
    );
  }

  /* ---------- PRICE CALCULATION ---------- */
  let final_price = Number(plan.price);
  const voucher_payload: Partial<{
    voucher_id: Types.ObjectId;
    voucher: string;
  }> = {};

  // APPLY VOUCHER, IF VOUCHER PROVIDE parentage
  if (voucher) {
    try {
      const { voucher_id, discount_parentage } =
        await voucherServices.applyVoucherService(user, voucher);

      // UPDATE FINAL PRICE
      final_price =
        final_price - (final_price / 100) * Number(discount_parentage);
      voucher_payload.voucher_id = voucher_id;
      voucher_payload.voucher = voucher;
    } catch (err: any) {
      throw new AppError(StatusCodes.BAD_REQUEST, err.message);
    }
  }

  /* ---------- TRANSACTION START ---------- */

  const session = await mongoose.startSession();
  let payment: any;
  let promotion: any;
  try {
    session.startTransaction();

    const payment_id = new Types.ObjectId();

    promotion = await Promotion.create(
      [
        {
          user: userId,
          shop: shop._id,
          deal: deal._id,
          payment: payment_id,
          validityDays: plan.durationDays,
          price: final_price,
          status: PromotionStatus.PENDING,
        },
      ],
      { session }
    );

    payment = await PaymentModel.create(
      [
        {
          _id: payment_id,
          user: userId,
          deal: deal._id,
          plan: plan._id,
          promotion: promotion[0]._id,
          transaction_id: generateTransactionId(),
          amount: final_price,
          voucher_applied: voucher ?? null,
          provider: PaymentProvider.STRIPE,
          payment_status: PaymentStatus.PENDING,
        },
      ],
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  /* ---------- STRIPE SESSION ---------- */
  const totalAmountCents = Math.round(final_price * 100);

  const stripePayload = {
    payment_method_types: ['card'] as const,
    line_items: [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: {
            name: deal.title,
            images: deal.images,
          },
          unit_amount: totalAmountCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment' as const,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: {
      payment: payment[0]._id.toString(),
      promotion: promotion[0]._id.toString(),
      deal: dealId.toString(),
      voucher_id: voucher_payload.voucher_id?.toString() ?? '',
      voucher_code: voucher_payload.voucher ?? '',
    },
    success_url: `${env.FRONTEND_URL}/payment_success?tr_id=${payment[0].transaction_id}&deal_id=${dealId.toString()}`,
    cancel_url: `${env.FRONTEND_URL}/payment_cancel?tr_id=${payment[0].transaction_id}&deal_id=${dealId.toString()}`,
  } as Stripe.Checkout.SessionCreateParams;

  const idempotencyKey = {
    idempotencyKey: payment[0]._id.toString(),
  };

  // STRIPE CHECKOUT
  try {
    const stripeSession = await stripe.checkout.sessions.create(
      stripePayload,
      idempotencyKey
    );

    // UPDATE STRIPE SESSION ID FOR GET FROM WEBHOOK
    const updatePayment = PaymentModel.updateOne(
      { _id: payment[0]._id },
      { stripe_session_id: stripeSession.id }
    );

    const updatePromotion = Promotion.updateOne(
      { _id: promotion[0]._id },
      { stripe_session_id: stripeSession.id }
    );

    await Promise.all([updatePayment, updatePromotion]);

    // ADD JOB TO REMOVE PENDING DOC (PAYMENT/PROMOTION), IF USER DON'T PAY WITHING 15 MIN
    const job = await dealHandleQueue.add(
      JobName.PAYMENT_PENDING_CLEANUP_OVER_15MIN,
      {
        promotionId: promotion[0]._id.toString(),
        paymentId: payment[0]._id.toString(),
      },
      {
        delay: 15 * 60 * 1000,
        jobId: `${promotion[0]._id.toString()}-${JobName.PAYMENT_PENDING_CLEANUP_OVER_15MIN}`,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );

    console.log('Job name:', job.name);

    // RETURN CHECKOUT URL
    return { checkout_url: stripeSession.url };
  } catch (error: any) {
    // IF ERROR MAKE DB UPDATE WITH FAILED AND CANCELED
    await PaymentModel.updateOne(
      { _id: payment[0]._id },
      { payment_status: PaymentStatus.FAILED }
    );

    await Promotion.updateOne(
      { _id: promotion[0]._id },
      { status: PromotionStatus.CANCELED }
    );

    throw new AppError(StatusCodes.BAD_GATEWAY, error.message);
  }
};

// WEBHOOK HANDLER
const stripeWebhookHandling = async (req: Request) => {
  const signature = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Webhook Error: ${err.message} `
    );
  }

  /* ---------- HANDLE EVENTS ---------- */
  switch (event.type) {
    /* PAYMENT SUCCESS */
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await paymentSuccessHandler(session);
      break;
    }

    /* PAYMENT FAILED / EXPIRED */
    case 'checkout.session.expired':
    case 'payment_intent.payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await paymentFailedHandler(session);
      break;
    }
  }

  return { received: true };
};

// EXPORT FUNCTION
export const paymentService = {
  stripePay,
  stripeWebhookHandling,
  inAppPurchase,
};
