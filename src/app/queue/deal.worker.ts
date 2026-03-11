/* eslint-disable no-console */
import { Worker } from 'bullmq';
import { pendingCleanUp } from './helper/pending.cleanup';
import { connection } from './index.queue'


export enum JobName {
  DEAL_REMINDER = 'DEAL_REMINDER',
  CLEANUP_PENDING = 'CLEANUP_PENDING',
  DEAL_EXPIRATION = 'DEAL_EXPIRATION'
}


// NOTIFICATION SEND WORKER

export const dealHandleWorker = () => {
  const worker = new Worker(
    'dealHandleQueue',
    async (job) => {
      try {
        switch (job.name) {
            case JobName.CLEANUP_PENDING :
                await pendingCleanUp();
                console.log("cleanup triggered");
                break;
            case JobName.DEAL_EXPIRATION :
                break;
            case JobName.DEAL_REMINDER :
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

