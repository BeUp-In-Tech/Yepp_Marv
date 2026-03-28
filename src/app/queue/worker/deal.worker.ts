/* eslint-disable no-console */
import { Worker } from 'bullmq';
import { connection } from '../index.queue'
import { dealExpireHandle } from '../helper/expiredDeal.update';
import { oneDayReminder, oneHourReminder } from '../helper/reminder.deal';
import removePaymentPendingOver15Min from '../helper/cleanup_payment_promotion_pending';


export enum JobName {
  DEAL_REMINDER_DAY = 'DEAL_REMINDER_DAY',
  DEAL_REMINDER_HOUR = 'DEAL_REMINDER_HOUR',
  DEAL_EXPIRE = 'DEAL_EXPIRE',
  PAYMENT_PENDING_CLEANUP_OVER_15MIN = 'PAYMENT_PENDING_CLEANUP_OVER_15MIN'
}


// NOTIFICATION SEND WORKER

export const dealHandleWorker = () => {
  const worker = new Worker(
    'dealHandleQueue',
    async (job) => {
      try {
        switch (job.name) {
            case JobName.DEAL_REMINDER_DAY :
                await oneDayReminder(job.data.dealId);
                break;
            case JobName.DEAL_REMINDER_HOUR :
              await oneHourReminder(job.data.dealId);
                break;
            case JobName.DEAL_EXPIRE :
              await dealExpireHandle(job.data.dealId);
                break;
            case JobName.PAYMENT_PENDING_CLEANUP_OVER_15MIN :
              await removePaymentPendingOver15Min({promotionId: job.data.promotionId, paymentId: 
              job.data.paymentId});
                break;
            default:
                break;
        }
      } catch (error) {
        console.log('Notification sending error from bullmq: ', error);
      }
    },
    { connection }
  );

  // LISTEN COMPLETED AND FAILED EVENT
  worker.on('completed', (job) => {
    console.log('Deal Job completed:', job.id);
  });

  worker.on('failed', (job, err) => {
    console.error('Job failed:', err);
  });
};

