/* eslint-disable no-console */
import { Worker } from 'bullmq';
import { connection } from '../index.queue';
import { notifyUser } from '../../utils/notification/push.notification';

// NOTIFICATION SEND WORKER

export const notificationWorker = () => {
  const worker = new Worker(
    'notificationQueue',
    async (job) => {
      try {
        const result = await notifyUser(job.data);
        console.log(
          result.pushed
            ? 'Queued notification sent'
            : `Queued notification saved without push: ${result.reason || result.pushError || 'NO_PUSH'}`
        );
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

