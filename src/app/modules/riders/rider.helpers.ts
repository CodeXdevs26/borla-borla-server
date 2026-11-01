import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import { ICoordinates } from './rider.interface';
import { extractCoordinates } from './rider.utils';

// Get user's location from database
export const getUserLocation = async (
  userId: string,
): Promise<ICoordinates> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { location: true, isDeleted: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'User account is deleted');
  }

  const coordinates = extractCoordinates(user.location);
  if (!coordinates) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Location is required. Please update your location first.',
    );
  }

  return coordinates;
};
