/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { PaymentStatus } from '../../modules/payment/payment.interface';
import { PaymentModel } from '../../modules/payment/payment.model';
import { Promotion } from '../../modules/promotion/promotion.model';

interface Id {
  promotionId: string;
  paymentId: string;
}

const removePaymentPendingOver15Min = async ({
  promotionId,
  paymentId,
}: Id) => {
  try {
    console.log('Running cleanup job...');

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const deletedPayments = await PaymentModel.deleteOne({
      payment_status: PaymentStatus.PENDING,
      promotion: promotionId,
      createdAt: { $lt: fifteenMinutesAgo },
    });

    const deletedPromotions = await Promotion.deleteOne({
      _id: promotionId,
      payment: paymentId,
      status: 'PENDING',
      createdAt: { $lt: fifteenMinutesAgo },
    });

    console.log('Deleted payments:', deletedPayments.deletedCount);
    console.log('Deleted promotions:', deletedPromotions.deletedCount);
  } catch (error: any) {
    console.log('Pending cleanup queue error: ', error.message);
  }
};

export default removePaymentPendingOver15Min;
