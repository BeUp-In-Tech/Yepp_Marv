/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { PaymentModel } from '../../modules/payment/payment.model';
import { Promotion } from '../../modules/promotion/promotion.model';

export const pendingCleanUp = async () => {
  try {
    console.log('Running cleanup job...');
    const fifteenMinutesAgo = new Date(Date.now() - 10 * 1000);
    //   const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const deletedPayments = await PaymentModel.deleteMany({
      payment_status: 'PENDING',
      createdAt: { $lt: fifteenMinutesAgo },
    });

    const deletedPromotions = await Promotion.deleteMany({
      status: 'PENDING',
      createdAt: { $lt: fifteenMinutesAgo },
    });

    console.log('Deleted payments:', deletedPayments.deletedCount);
    console.log('Deleted promotions:', deletedPromotions.deletedCount);
  } catch (error: any) {
    console.log('Pending cleanup queue error: ', error.message);
  }
};
