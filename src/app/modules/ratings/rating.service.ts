import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import { ICreateRating, IUpdateRating } from './rating.interface';

// Create a rating for a booking
const createRating = async (userId: string, payload: ICreateRating) => {
  const { bookingId, rating, feedback } = payload;

  // Check if booking exists
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      rider: {
        select: {
          id: true,
          name: true,
        },
      },
      rating: true,
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  // Verify user is the owner of the booking
  if (booking.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not the owner of this booking',
    );
  }

  // Check if booking is completed
  // if (booking.status !== 'completed') {
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'Can only rate completed bookings',
  //   );
  // }

  // Check if rating already exists
  if (booking.rating) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already rated this booking. Use update endpoint to modify your rating.',
    );
  }

  // Create rating
  const newRating = await prisma.rating.create({
    data: {
      bookingId,
      rating,
      feedback,
    },
    include: {
      booking: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              profilePicture: true,
            },
          },
          rider: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              profilePicture: true,
            },
          },
        },
      },
    },
  });

  return newRating;
};

// Get rating by booking ID
const getRatingByBookingId = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      riderId: true,
      status: true,
      user: {
        select: {
          id: true,
          name: true,
          profilePicture: true,
        },
      },
      rider: {
        select: {
          id: true,
          name: true,
          profilePicture: true,
        },
      },
      rating: true,
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  // Check if user has access to view this rating
  if (booking.userId !== userId && booking.riderId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have access to view this rating',
    );
  }

  if (!booking.rating) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No rating found for this booking',
    );
  }

  return {
    id: booking.rating.id,
    bookingId: booking.id,
    rating: booking.rating.rating,
    feedback: booking.rating.feedback,
    createdAt: booking.rating.createdAt,
    updatedAt: booking.rating.updatedAt,
    user: booking.user,
    rider: booking.rider,
    status: booking.status,
  };
};

// Update rating
const updateRating = async (
  bookingId: string,
  userId: string,
  payload: IUpdateRating,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      rating: true,
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  // Verify user is the owner of the booking
  if (booking.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not the owner of this booking',
    );
  }

  // Check if booking has a rating
  if (!booking.rating) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No rating found for this booking. Use create endpoint to add a rating.',
    );
  }

  // Update rating
  const updatedRating = await prisma.rating.update({
    where: { id: booking.rating.id },
    data: {
      ...(payload.rating && { rating: payload.rating }),
      ...(payload.feedback !== undefined && { feedback: payload.feedback }),
    },
    include: {
      booking: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              profilePicture: true,
            },
          },
          rider: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              profilePicture: true,
            },
          },
        },
      },
    },
  });

  return updatedRating;
};

// Delete rating
const deleteRating = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      rating: true,
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  // Verify user is the owner of the booking
  if (booking.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not the owner of this booking',
    );
  }

  // Check if booking has a rating
  if (!booking.rating) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No rating found for this booking',
    );
  }

  // Delete rating (cascade will handle the relation)
  await prisma.rating.delete({
    where: { id: booking.rating.id },
  });

  return { message: 'Rating deleted successfully' };
};

export const ratingServices = {
  createRating,
  getRatingByBookingId,
  updateRating,
  deleteRating,
};
