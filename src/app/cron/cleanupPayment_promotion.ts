/* eslint-disable no-console */
import cron from "node-cron";
import { PaymentModel } from "../modules/payment/payment.model";
import { Promotion } from "../modules/promotion/promotion.model";
import { PaymentStatus } from "../modules/payment/payment.interface";
import { PromotionStatus } from "../modules/promotion/promotion.interface";


//"0 * * * *"

// REMOVE PENDING PROMOTION AND PAYMENT OVER 15 MIN PASS
export const cleanup_payment_and_promotion = () => {
  cron.schedule("0 * * * *", async () => {
  try {
    console.log("Running cron: Removing expired pending payments...");

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Remove pending payments older than 15 minutes
    const deletedPayments = await PaymentModel.deleteMany({
      payment_status:  PaymentStatus.PENDING,
      createdAt: { $lt: fifteenMinutesAgo }
    });

    // Remove pending promotions older than 15 minutes
    const deletedPromotions = await Promotion.deleteMany({
      status: PromotionStatus.PENDING,
      createdAt: { $lt: fifteenMinutesAgo }
    });

    console.log("Deleted payments:", deletedPayments.deletedCount);
    console.log("Deleted promotions:", deletedPromotions.deletedCount);

  } catch (error) {
    console.error("Cron error:", error);
  }
});
}