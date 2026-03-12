/* eslint-disable no-console */
import { IDeal } from "../../modules/deal/deal.interface";
import { dealHandleQueue } from "../index.queue";
import { JobName } from "../worker/deal.worker";

export const scheduleDealJobs = async (deal: IDeal) => {
  const expireTime = new Date(deal.promotedUntil as Date).getTime();
  const now = Date.now();

  const oneDayBefore = expireTime - 24 * 60 * 60 * 1000;
  const oneHourBefore = expireTime - 60 * 60 * 1000;

  const jobs = [
    {
      name: JobName.DEAL_REMINDER_DAY,
      delay: oneDayBefore - now,
      jobId: `${deal._id}-${JobName.DEAL_REMINDER_DAY}`
    },
    {
      name: JobName.DEAL_REMINDER_HOUR,
      delay: oneHourBefore - now,
      jobId: `${deal._id}-${JobName.DEAL_REMINDER_HOUR}`
    },
    {
      name: JobName.DEAL_EXPIRE,
      delay: expireTime - now,
      jobId: `${deal._id}-${JobName.DEAL_EXPIRE}`
    },
  ];  

  for (const job of jobs) {
    if (job.delay > 0) {
      await dealHandleQueue.add(
        job.name,
        { dealId: deal._id },
        {
          delay: job.delay,
          jobId: job.jobId,
          removeOnComplete: true,
          removeOnFail: 100,
        }
      );
    }
  }

  console.log("Deal update job schedule registered for", deal.title);
  
};