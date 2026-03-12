/* eslint-disable no-console */
import mongoose from 'mongoose';
import env from '../config/env';
import { notificationWorker } from './worker/notification.worker';
import { emailSendWorker } from './worker/email_send.worker';
import { dealHandleWorker } from './worker/deal.worker';
import { registerCleanupJob } from './register_job/pending.register';
import { registerExpireDealsJob } from './register_job/expiredDeal.register';

// RUN ALL WORKER JOB HERE WITH DATABASE CONNECTION
const connectQueeuDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI as string);
    console.log('Connected to queue database');

    // CLEANUP JOB REGISTER HERE
    await registerCleanupJob();

    // DEAL EXPIRE JOB REGISTER
    await registerExpireDealsJob();

    // NOTIFICATION SEND WORKER
    notificationWorker();

    // EMAIL SEND WORKER
    emailSendWorker();

    // DEAL HANDLE WORKER
    dealHandleWorker();

  } catch (error) {
    console.log('Error connecting to Redis:', error);
  }
};

connectQueeuDB();
