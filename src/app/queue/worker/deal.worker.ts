/* eslint-disable no-console */
import { Worker } from 'bullmq';
import { connection } from '../index.queue'
import { dealExpireHandle } from '../helper/expiredDeal.update';
import { oneDayReminder } from '../helper/reminder.deal';


export enum JobName {
  DEAL_REMINDER_DAY = 'DEAL_REMINDER_DAY',
  DEAL_REMINDER_HOUR = 'DEAL_REMINDER_HOUR',
  DEAL_EXPIRE = 'DEAL_EXPIRE'
}


// NOTIFICATION SEND WORKER

export const dealHandleWorker = () => {
  const worker = new Worker(
    'dealHandleQueue',
    async (job) => {
      try {
        switch (job.name) {
            case JobName.DEAL_REMINDER_DAY :
                console.log("cleanup triggered");
                await oneDayReminder(job.data.dealId);
                break;
            case JobName.DEAL_REMINDER_HOUR :
              await oneDayReminder(job.data.dealId);
                break;
            case JobName.DEAL_EXPIRE :
              await dealExpireHandle(job.data.dealId);
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
    console.log('Job completed:', job.id);
  });

  worker.on('failed', (job, err) => {
    console.error('Job failed:', err);
  });
};

