/* eslint-disable no-console */
import { JobName } from '../deal.worker';
import { dealHandleQueue } from '../index.queue';


// Register repeatable job — ONLY ONCE
export const registerCleanupJob = async () => {
  console.log("Registering cleanup job. PID:", process.pid);
  const repeatableJobs = await dealHandleQueue.getRepeatableJobs();

  // Prevent duplicate repeatable job
  const alreadyRegistered = repeatableJobs.find(
    (job) => job.name === JobName.CLEANUP_PENDING
  );

  if (!alreadyRegistered) {
    await dealHandleQueue.add(
      JobName.CLEANUP_PENDING,
      {},
      {
        repeat: {
        every: 5000 // Important: This is testing time. When you increase the time, you must clear old jobs first
        },
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
    console.log('Cleanup job registered');
  }
  console.log('Cleanup job registered');
};
