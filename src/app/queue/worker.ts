/* eslint-disable no-console */
import mongoose from 'mongoose';
import env from '../config/env';
import { notificationWorker } from './worker/notification.worker';
import { emailSendWorker } from './worker/email_send.worker';
import { dealHandleWorker } from './worker/deal.worker';
import { bullkMailSender } from './worker/multiple_emails.worker';


// RUN ALL WORKER JOB HERE WITH DATABASE CONNECTION
const connectQueeuDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI as string);
    console.log('Connected to queue database');


    // DEAL EXPIRATION AND REMINCDER HANDLING
    dealHandleWorker();

    // NOTIFICATION SEND WORKER
    notificationWorker();

    // EMAIL SEND WORKER
    emailSendWorker();

    // BULLK MAIL SENDER
    bullkMailSender();
    
    // DEAL HANDLE WORKER
    dealHandleWorker();

  } catch (error) {
    console.log('Error connecting to Redis:', error);
  }
};

connectQueeuDB();
