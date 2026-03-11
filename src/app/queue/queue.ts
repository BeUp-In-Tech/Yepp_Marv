/* eslint-disable no-console */
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import env from '../config/env';
import { notificationWorker } from './notification.worker';
import { emailSendWorker } from './email_send.worker';

export const connection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});

export const dealReminderQueue = new Queue('dealReminderQueue', { connection });
export const mailQueue = new Queue('emailSendQueue', { connection });
export const notificationQueue = new Queue('notificationQueue', { connection });

const connectQueeuDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to queue database');

    // NOTIFICATION SEND WORKER
    notificationWorker();

    // EMAIL SEND WORKER
    emailSendWorker();
    
  } catch (error) {
    console.log('Error connecting to Redis:', error);
  }
};

connectQueeuDB();
