/* eslint-disable no-console */
import { DealModel } from '../../modules/deal/deal.model';
import { PromotionStatus } from '../../modules/promotion/promotion.interface';
import { Promotion } from '../../modules/promotion/promotion.model';

export const dealExpireHandle = async () => {
  console.log('Expire promoted deals job running...');

  const now = new Date();

  const expiredDeals = await DealModel.updateMany(
    { promotedUntil: { $lte: now }, isPromoted: true },
    { $set: { isPromoted: false } }
  );

   const expiredPromotion = await Promotion.updateMany(
          { endAt: { $lte: now }, status: { $ne: PromotionStatus.EXPIRED }},
          { $set: { status: PromotionStatus
              .EXPIRED }}
        );

  console.log('Deals updated:', expiredDeals.modifiedCount);
  console.log('Promotion updated:', expiredPromotion.modifiedCount );
};
