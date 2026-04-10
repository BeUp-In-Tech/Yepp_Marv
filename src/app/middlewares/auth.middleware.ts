import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { JwtPayload } from 'jsonwebtoken';
import AppError from '../errorHelpers/AppError';
import httpStatus, { StatusCodes } from 'http-status-codes';
import env from '../config/env';
import User from '../modules/user/user.model';
import { IsActiveUser, Role } from '../modules/user/user.interface';



export const checkAuth =
  (...restRole: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization as string | undefined; // GET TOKEN
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Token not provided!');
      }

      const accessToken = authHeader.split(' ')[1];

      if (!accessToken) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Token required");
      }

      // VERIFY USER
      const verifyUser = verifyToken( accessToken as string, env.JWT_ACCESS_SECRET ) as JwtPayload;

      // CHECK VERIFIED
      if (!verifyUser) {
        throw new AppError(httpStatus.BAD_REQUEST, 'You are unauthorized');
      };

      const isUser = await User.findById(verifyUser.userId);
      if (!isUser) {
        throw new AppError(StatusCodes.NOT_FOUND, "User not found");
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

      // Authorization decision must come from DB role, not token claim role.
      if (restRole.length && !restRole.includes(roleFromDb)) {
        throw new AppError( httpStatus.FORBIDDEN, 'You are not permitted to access this route')
      };

      // Attach trusted user payload (role/id from DB)
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
