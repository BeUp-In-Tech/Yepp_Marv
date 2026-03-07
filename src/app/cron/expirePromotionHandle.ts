/* eslint-disable no-console */
import cron  from 'node-cron';
import { Promotion } from "../modules/promotion/promotion.model";
import { PromotionStatus } from "../modules/promotion/promotion.interface";

export const expiredPomotionsHandler = () => {
  cron.schedule('0 */12 * * *', async () => { // EVERY 12 HOURS
    try {
      const now = new Date();
        // Promote expired → update promotion status
       const expiredPromotion = await Promotion.updateMany(
        { endAt: { $lte: now }},
        { $set: { status: PromotionStatus
            .EXPIRED }}
      );

      console.log(`Promotion updated:`, expiredPromotion.modifiedCount);
    } catch (err) {
      console.error('Cron error:', err);
    }
  });
};
