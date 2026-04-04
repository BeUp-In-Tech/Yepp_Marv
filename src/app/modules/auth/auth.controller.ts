/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import { CatchAsync } from '../../utils/CatchAsync';
import passport from 'passport';
import AppError from '../../errorHelpers/AppError';
import httpStatus, { StatusCodes } from 'http-status-codes';
import { createUserTokens } from '../../utils/user.tokens';
import { JwtPayload } from 'jsonwebtoken';
import env from '../../config/env';
import { SendResponse } from '../../utils/SendResponse';
import { authService } from './auth.service';

// REGISTER WITH GOOGLE
const googleRegister = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const redirect = (req.query?.redirectTo as string) || '/';

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: redirect,
      prompt: 'consent select_account',
    })(req, res, next);
  }
);

//  GOOGLE CALLBACK
const googleCallback = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let redirectTo = req.query.state ? (req.query.state as string) : '';
    if (redirectTo.startsWith('/')) {
      redirectTo = redirectTo.slice(1);
    }

    const user = req.user as JwtPayload;
    if (!user) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
    const token = await createUserTokens(user);

    const userAgent = req.headers['user-agent'] || '';

    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);

    if (isAndroid || isIOS) {
      res.redirect(
        `${env.DEEP_LINK}/auth/google?access=${token.accessToken}&refresh=${token.refreshToken}`
      );
    } else {
      res.redirect(
        `${env.FRONTEND_URL}/shop-overview?access=${token.accessToken}&refresh=${token.refreshToken}`
      );
    }
  }
);

// APPLE LOGIN
const appleCallback = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'apple',
      async function (err: any, user: any, info: string) {

        if (err) {
          if (err == 'AuthorizationError') {
            res.send(
              'Oops! Looks like you didn\'t allow the app to proceed. Please sign in again! <br /> \
				<a href="/login">Sign in with Apple</a>'
            );
          } else if (err == 'TokenError') {
            res.send(
              'Oops! Couldn\'t get a valid token from Apple\'s servers! <br /> \
				<a href="/login">Sign in with Apple</a>'
            );
          } else {
            res.send(err);
          }
        }
  
        const token = await createUserTokens(user);

        const userAgent = req.headers['user-agent'] || '';

        const isAndroid = /android/i.test(userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(userAgent);

        if (isAndroid || isIOS) {
          res.redirect(
            `${env.DEEP_LINK}/auth/apple?access=${token.accessToken}&refresh=${token.refreshToken}`
          );
        } else {
          res.redirect(
            `${env.FRONTEND_URL}/shop-overview?access=${token.accessToken}&refresh=${token.refreshToken}`
          );
        }
      }
    )(req, res, next);
  }
);

// CREDENTIAL LOGIN
const credentialsLogin = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) next(err);

      if (!user) {
        return next(new AppError(httpStatus.FORBIDDEN, info.message));
      }

      const userTokens = await createUserTokens(user);

      SendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Login success',
        data: userTokens,
      });
    })(req, res, next);
  }
);

// CHANGE PASSWORD
const changePassword = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.user as JwtPayload;
    const { oldPassword, newPassword } = req.body;
    await authService.changePasswordService(userId, oldPassword, newPassword);

    SendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Password has been changed',
      data: null,
    });
  }
);

// FORGET PASSWORD
const forgetPassword = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.params;
    const result = await authService.forgetPasswordService(email as string);

    SendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Password reset OTP sent',
      data: result,
    });
  }
);

// VERIFY FORGET PASSWORD OTP
const verifyForgetPasswordOTP = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp } = req.body;
    const result = await authService.verifyForgetPasswordOTPService(
      email as string,
      otp
    );

    SendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'OTP verified',
      data: result,
    });
  }
);

// VERIFY FORGET PASSWORD OTP
const resetPassword = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.token as string;

    const { newPassword } = req.body;
    const result = await authService.resetPasswordService(token, newPassword);

    SendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Password reset success',
      data: result,
    });
  }
);

// VERIFY FORGET PASSWORD OTP
const getNewAccessToken = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;
    const result = await authService.getNewAccessTokenService(refreshToken);

    SendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'New access token generated',
      data: result,
    });
  }
);

export const authController = {
  googleRegister,
  googleCallback,
  credentialsLogin,
  changePassword,
  forgetPassword,
  verifyForgetPasswordOTP,
  resetPassword,
  getNewAccessToken,
  appleCallback,
};
