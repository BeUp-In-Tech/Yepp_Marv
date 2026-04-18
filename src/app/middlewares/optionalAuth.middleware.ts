import { NextFunction, Request, Response } from 'express';
import httpStatus, { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import env from '../config/env';
import AppError from '../errorHelpers/AppError';
import User from '../modules/user/user.model';
import { IsActiveUser, Role } from '../modules/user/user.interface';
import { verifyToken } from '../utils/jwt';

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization as string | undefined;

    if (!authHeader) {
      return next();
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Token not provided!');
    }

    const accessToken = authHeader.split(' ')[1];

    if (!accessToken) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Token required');
    }

    const verifyUser = verifyToken(
      accessToken,
      env.JWT_ACCESS_SECRET
    ) as JwtPayload;

    if (!verifyUser) {
      throw new AppError(httpStatus.BAD_REQUEST, 'You are unauthorized');
    }

    const isUser = await User.findById(verifyUser.userId);

    if (!isUser) {
      throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (
      isUser.isActive === IsActiveUser.INACTIVE ||
      isUser.isActive === IsActiveUser.BLOCKED
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'User is Blocked or Inactive!'
      );
    }

    if (isUser.isDeleted) {
      throw new AppError(httpStatus.FORBIDDEN, 'The user was deleted!');
    }

    const roleFromDb = isUser.role ?? Role.USER;

    req.user = {
      ...verifyUser,
      userId: isUser._id.toString(),
      role: roleFromDb,
      email: isUser.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};
