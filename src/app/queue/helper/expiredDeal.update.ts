/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { Types } from 'mongoose';
import { DealModel } from '../../modules/deal/deal.model';
import { Promotion } from '../../modules/promotion/promotion.model';
import { PromotionStatus } from '../../modules/promotion/promotion.interface';

export const dealExpireHandle = async (dealId: string) => {
  try {
    // DEAL UPDATE
    const dealUpdate = await DealModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(dealId),
        isPromoted: true,
      },
      {
        $set: { isPromoted: false },
      },
      {
        new: true,
      }
    );

    if (!dealUpdate) {
      console.log('Deal not found or not promoted');
      return;
    }

    // PROMOTION UPDATE
    const promotionUpdate = await Promotion.updateMany(
      {
        deal: new Types.ObjectId(dealId),
        status: { $ne: PromotionStatus.EXPIRED }, // only update if not already expired
      },
      {
        $set: { status: PromotionStatus.EXPIRED },
      }
    );

    console.log(`Deal "${dealUpdate?.title}" updated to isPromoted=false`);
    console.log(
      'Promotion updated to expired count:',
      promotionUpdate.modifiedCount || 0
    );
  } catch (error: any) {
    console.log(`Deal expire handle problem: `, error.message);
  }
};
