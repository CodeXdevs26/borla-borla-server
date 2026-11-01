import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ratingServices } from './rating.service';

// Create rating
const createRating = catchAsync(async (req: Request, res: Response) => {
  const result = await ratingServices.createRating(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Thank you for your feedback!',
    data: result,
  });
});

// Get rating by booking ID
const getRatingByBookingId = catchAsync(async (req: Request, res: Response) => {
  const result = await ratingServices.getRatingByBookingId(
    req.params.bookingId as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rating retrieved successfully',
    data: result,
  });
});

// Update rating
const updateRating = catchAsync(async (req: Request, res: Response) => {
  const result = await ratingServices.updateRating(
    req.params.bookingId as string,
    req.user.userId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rating updated successfully',
    data: result,
  });
});

// Delete rating
const deleteRating = catchAsync(async (req: Request, res: Response) => {
  const result = await ratingServices.deleteRating(
    req.params.bookingId as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rating deleted successfully',
    data: result,
  });
});

export const ratingControllers = {
  createRating,
  getRatingByBookingId,
  updateRating,
  deleteRating,
};
