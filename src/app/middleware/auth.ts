import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../utils/catchAsync';
import AppError from '../error/AppError';
import config from '../config';
import { NextFunction, Request, Response } from 'express';
import prisma from '../shared/prisma';

const auth = (...userRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req?.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'you are not authorized!');
    }

    let decode;
    try {
      decode = jwt.verify(
        token,
        config.jwt_access_secret as string,
      ) as JwtPayload;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw new AppError(httpStatus.UNAUTHORIZED, 'unauthorized');
    }

    const { role, userId } = decode;
    const isUserExist = await prisma.user.findFirst({
      where: {
        id: userId,
        isDeleted: false,
      },
      include: {
        verification: true,
      },
    });
    if (!isUserExist) {
      throw new AppError(httpStatus.NOT_FOUND, 'user not found');
    }
    if (userRoles && !userRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    if (isUserExist.status === 'blocked') {
      throw new AppError(httpStatus.UNAUTHORIZED, 'your account is blocked');
    }

    if (isUserExist.isDeleted) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'your account is deleted');
    }

    if (!isUserExist.verification?.status) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'your account is not verified',
      );
    }
    req.user = decode;
    next();
  });
};
export default auth;
