
import { Worker } from 'bullmq';
import { sendEmail } from '../../utils/sendMail';
import { connection } from '../index.queue';

export const bullkMailSender = () => {
  new Worker(
    'emailSendQueue',
    async (job) => {
      const { emails, title, message } = job.data;

      await Promise.all(
        emails.map((email: string) =>
          sendEmail({
            to: email,
            subject: title,
            templateName: 'bulkEmail',
            templateData: {
              message,
            },
          })
        )
      );
    },
    {
      connection,
      concurrency: 5,
    }
  );
};
