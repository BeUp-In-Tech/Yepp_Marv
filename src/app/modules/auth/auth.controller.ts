/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import { CatchAsync } from '../../utils/CatchAsync';
import passport from 'passport';
import AppError from '../../errorHelpers/AppError';
import httpStatus from 'http-status-codes';
import { SetCookies } from '../../utils/setCookie';
import { createUserTokens } from '../../utils/user.tokens';
import { JwtPayload } from 'jsonwebtoken';
import env from '../../config/env';
import { SendResponse } from '../../utils/SendResponse';

const googleRegister = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const redirect = (req.query?.redirect as string) || '/';

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: redirect,
      prompt: 'consent select_account',
    })(req, res, next);
  }
);

const googleCallback = CatchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let redirectTo = req.query.state ? (req.query.state as string) : '';
    if (redirectTo.startsWith('/')) {
      redirectTo = redirectTo.slice(1);
    }

    const user = req.user as JwtPayload;
    if (!user) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');

    const token = await createUserTokens(user);
    SetCookies(res, token);
    res.redirect(`${env.FRONTEND_URL}/${redirectTo}`); // Redirected to frontend url (With specific Routes)
  }
);

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
        data: userTokens
      });
    })(req, res, next);
  }
);

export const authController = {
  googleRegister,
  googleCallback,
  credentialsLogin
};
