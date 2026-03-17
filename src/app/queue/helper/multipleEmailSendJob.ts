/* eslint-disable @typescript-eslint/no-unused-vars */
import { Queue } from 'bullmq';
import { mailQueue } from '../index.queue';




export function chunkArray(arr: string[], size: number) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export const sendBulkEmails = async (
  emails: string[],
  emailPayload: { title: string; message: string }
) => {
  const chunks = chunkArray(emails, 100);

  await mailQueue.addBulk(
    chunks.map((chunk, index) => ({
      name: 'send-email-batch', // job name
      data: {
        emails: chunk,  
        ...emailPayload,
      },
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }))
  );
};