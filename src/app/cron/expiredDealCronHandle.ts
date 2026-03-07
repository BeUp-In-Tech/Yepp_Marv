/* eslint-disable no-console */
import { DealModel } from "../modules/deal/deal.model";
import cron  from 'node-cron';

export const expiredDealsHandler = () => {
  cron.schedule('0 */12 * * *', async () => {  // EVERY 12 HOURS
    try {
      const now = new Date();

      // Promote expired → update deals status
      const expiredDeals = await DealModel.updateMany(
        { promotedUntil: { $lte: now }, isPromoted: true },
        { $set: { isPromoted: false } }
      );


      console.log(`Deals updated:`, expiredDeals.modifiedCount);
    } catch (err) {
      console.error('Cron error:', err);
    }
  });
};
