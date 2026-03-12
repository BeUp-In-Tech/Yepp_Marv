/* eslint-disable no-console */
import { JobName } from "../worker/deal.worker";
import { dealHandleQueue } from "../index.queue";

export const registerExpireDealsJob = async () => {
  const jobs = await dealHandleQueue.getRepeatableJobs();

  const exists = jobs.find(
    (job) => job.name === JobName.DEAL_EXPIRATION
  );

  if (!exists) {
    await dealHandleQueue.add(
      JobName.DEAL_EXPIRATION,
      {},
      {
        repeat: {
          // 🔹 FOR TESTING (every 5 seconds)
          every: 5000,

          // 🔹 FOR PRODUCTION (every 12 hours)
          // pattern: "0 */12 * * *",
        },
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );

    console.log("Expire deals job registered");
  }
};