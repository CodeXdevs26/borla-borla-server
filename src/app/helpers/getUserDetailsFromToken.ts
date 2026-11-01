import * as jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import AppError from '../error/AppError';
import config from '../config';
import prisma from '../shared/prisma';

const getUserDetailsFromToken = async (token: string) => {
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'you are not authorized!');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decode: any = await jwt.verify(
    token,
    config.jwt_access_secret as string,
  );
  const user = await prisma.user.findUnique({
    where: { id: decode.userId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      profilePicture: true,
      phoneNumber: true,
      dateOfBirth: true,
      customerId: true,
      location: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      // Exclude password
    },
  });
  return user;
};

export default getUserDetailsFromToken;
