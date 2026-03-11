/* eslint-disable no-console */
import mongoose from 'mongoose';
import env from '../config/env';
import { notificationWorker } from './notification.worker';
import { emailSendWorker } from './email_send.worker';
import { dealHandleWorker } from './deal.worker';
import { registerCleanupJob } from './helper/pending.register';

// RUN ALL WORKER JOB HERE WITH DATABASE CONNECTION
const connectQueeuDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI as string);
    console.log('Connected to queue database');

    // CLEANUP JOB REGISTER HERE
    await registerCleanupJob()

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
