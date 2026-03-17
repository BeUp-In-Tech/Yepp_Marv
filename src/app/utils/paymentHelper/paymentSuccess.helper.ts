import mongoose from "mongoose";
import { PaymentModel } from "../../modules/payment/payment.model";
import { PaymentStatus } from "../../modules/payment/payment.interface";
import { Promotion } from "../../modules/promotion/promotion.model";
import { PromotionStatus } from "../../modules/promotion/promotion.interface";
import { Voucher } from "../../modules/voucher/voucher.model";
import Stripe from "stripe";
import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";
import { DealModel } from "../../modules/deal/deal.model";
import { redisClient } from "../../config/redis.config";
import { scheduleDealJobs } from "../../queue/job/deal.job";
import { invalidateAllMachineryCache } from "../deleteCachedData";


export const paymentSuccessHandler = async (session: Stripe.Checkout.Session) => {
    const dbSession = await mongoose.startSession();
    
          await dbSession.withTransaction(async () => {
            const payment = await PaymentModel.findOne({
              stripe_session_id: session.id,
            }).session(dbSession);
    
            if (!payment) return;
    
            // already processed (idempotent)
            if (payment.payment_status === PaymentStatus.PAID) return;
    
            const promotion = await Promotion.findById(payment.promotion).session(
              dbSession
            );
    
            if (!promotion) return;
    
            /* ---- UPDATE PAYMENT ---- */
            payment.payment_status = PaymentStatus.PAID;
            payment.payment_intent_id = session.payment_intent?.toString();
    
            await payment.save({ session: dbSession });
    
            /* ---- ACTIVATE PROMOTION ---- */
    
            const now = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + promotion.validityDays);
    
            promotion.status = PromotionStatus.ACTIVE;
            promotion.startAt = now;
            promotion.endAt = endDate;
    
            await promotion.save({ session: dbSession });


            /* ---- ADDED PROMOTION DURATION DIRECTLY IN DEALS OR SERVICE */
            const deal = await DealModel.findOne({ _id: promotion.deal });
            if (!deal) {
              throw new AppError(StatusCodes.NOT_FOUND, `deal not found`);
            }

            deal.promotedUntil = endDate;
            deal.isPromoted = true;
            deal.activePromotion = promotion._id;

            await deal.save({ session: dbSession });


            // ADD QUEUE JOB SCHEDULE
            scheduleDealJobs(deal);
    
            /* ---- VOUCHER DECREMENT (SAFE) ---- */
    
            if (payment.voucher_applied) {
              await Voucher.updateOne(
                {
                  code: payment.voucher_applied,
                  voucher_limit: { $gt: 0 },
                },
                { $inc: { voucher_limit: -1 } },
                { session: dbSession }
              );
            }



            // REMOVE REDIS CACHE KEY
            await redisClient.del(`shop:${deal.shop.toString()}`);
            await redisClient.del(`dashboard_analytics_total`); // dashboard analytics total cache invalidate
            await redisClient.del(`last_one_year_revenue_trend`); // last one year revenue trend cached invalidate (dahboard api)
            await invalidateAllMachineryCache('all_vendors_dashboard:*'); // vendor stats cache invalidate (dashboard)
            await invalidateAllMachineryCache('latest_transaction:*'); // latest transaction list cache invalidate (dashboard)
          });
    
}