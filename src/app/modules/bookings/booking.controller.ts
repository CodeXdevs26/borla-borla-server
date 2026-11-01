import fs from 'fs';
import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import {
  acceptedBookingsQuerySchema,
  historyPageQuerySchema,
} from './booking.validation';
import { bookingServices } from './booking.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { IGetBookingsQuery } from './booking.interface';
import { toPublicUploadPath } from '@app/utils/filePathSanitizer';

// Create a new booking (User)
const createBooking = catchAsync(async (req: Request, res: Response) => {
  // Handle multiple uploaded files
  if (req.files && Array.isArray(req.files)) {
    req.body.wasteImages = req.files.map((file: any) =>
      toPublicUploadPath(file.path),
    );
  }

  const result = await bookingServices.createBooking(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Booking created successfully. Finding you a nearby rider...',
    data: result,
  });
});

const deleteBooking = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.deleteBooking(
    req.params.id as string,
    req.user.userId,
  );

  if (!result) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Booking not found',
      data: null,
    });
  }

  if (result.wasteImages) {
    result.wasteImages.forEach((image: string) => {
      fs.unlinkSync(image);
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking deleted successfully',
    data: result,
  });
});

// Get available bookings for riders
const getAvailableBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.getAvailableBookingsForRider(
    req.user.userId,
    req.query as unknown as IGetBookingsQuery,
  );

  const message = !result.bookings.length
    ? 'No bookings available in your area'
    : 'Available bookings retrieved successfully';

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result.bookings,
    meta: result.meta,
  });
});

// Get user's own bookings
const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.getMyBookings(
    req.user.userId,
    req.query as unknown as IGetBookingsQuery,
  );

  const message = !result.bookings.length
    ? 'No bookings found'
    : 'Bookings retrieved successfully';

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result.bookings,
    meta: result.meta,
  });
});

const getAcceptedBookings = catchAsync(async (req: Request, res: Response) => {
  const query = acceptedBookingsQuerySchema.parse(req.query);
  const result = await bookingServices.getAcceptedBookings(
    req.user.userId,
    query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Accepted bookings retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

// Get rider's accepted bookings
const getRiderBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.getRiderBookings(
    req.user.userId,
    req.query as unknown as IGetBookingsQuery,
  );

  const message = !result.bookings.length
    ? 'No bookings found'
    : 'Bookings retrieved successfully';

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result.bookings,
    meta: result.meta,
  });
});

// Get booking by ID
const getBookingById = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.getBookingById(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking retrieved successfully',
    data: result,
  });
});

// Accept booking (Rider)
const acceptBooking = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.acceptBooking(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking accepted successfully',
    data: result,
  });
});

const retryRiderSearch = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.retryRiderSearch(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider search restarted for another two hours',
    data: result,
  });
});

// Decline booking (Rider)
const declineBooking = catchAsync(async (req: Request, res: Response) => {
  const reason = req.body.reason || 'No reason provided';
  const result = await bookingServices.declineBooking(
    req.params.id as string,
    req.user.userId,
    reason,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking declined successfully',
    data: result,
  });
});

// Update booking status
const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.updateBookingStatus(
    req.params.id as string,
    req.user.userId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking status updated successfully',
    data: result,
  });
});

// Mark arrived at pickup (Rider)
const markArrivedAtPickup = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.markArrivedAtPickup(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Marked as arrived at pickup. Customer has been notified.',
    data: result,
  });
});

// Mark payment collected at pickup (Rider)
const markPaymentCollectedAtPickup = catchAsync(
  async (req: Request, res: Response) => {
    const result = await bookingServices.markPaymentCollectedAtPickup(
      req.params.id as string,
      req.user.userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Payment collected at pickup. Customer has been notified.',
      data: result,
    });
  },
);

// Mark heading to station (Rider)
const markHeadingToStation = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.markHeadingToStation(
    req.params.id as string,
    req.user.userId,
    req.body.stationId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Marked as heading to station. Customer has been notified.',
    data: result,
  });
});

// Mark completed (Rider)
const markCompleted = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.markCompleted(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Marked as completed. Customer has been notified.',
    data: result,
  });
});

// Start collection (Rider)
const startCollection = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.startCollection(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Collection started successfully',
    data: result,
  });
});

// Mark arrived at dropoff (Rider)
const markArrivedAtDropoff = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.markArrivedAtDropoff(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Marked as arrived at dropoff location',
    data: result,
  });
});

// Request payment (Rider)
const requestPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.requestPayment(
    req.params.id as string,
    req.user.userId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment requested. Customer will be notified.',
    data: result,
  });
});

const getHistoryPage = catchAsync(async (req: Request, res: Response) => {
  const query = historyPageQuerySchema.parse(req.query);
  const { meta, ...data } = await bookingServices.getHistoryPage(
    req.user.userId,
    query,
    req.user.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking history retrieved successfully',
    data,
    meta,
  });
});

const getRiderAcceptedBookingDetails = catchAsync(
  async (req: Request, res: Response) => {
    const query = acceptedBookingsQuerySchema.parse(req.query);
    const result = await bookingServices.getRiderAcceptedBookingDetails(
      req.user.userId,
      query,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Accepted bookings retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  },
);

const giveGarbage = catchAsync(async (req: Request, res: Response) => {
  const data = await bookingServices.giveGarbage(
    req.params.id as string,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Garbage is ready. The rider has been notified.',
    data,
  });
});
const collectGarbage = catchAsync(async (req: Request, res: Response) => {
  const data = await bookingServices.collectGarbage(
    req.params.id as string,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Garbage collected. The customer can now pay.',
    data,
  });
});

export const bookingControllers = {
  giveGarbage,
  collectGarbage,
  getRiderAcceptedBookingDetails,
  getHistoryPage,
  getAcceptedBookings,
  createBooking,
  deleteBooking,
  getAvailableBookings,
  getMyBookings,
  getRiderBookings,
  getBookingById,
  acceptBooking,
  declineBooking,
  updateBookingStatus,
  markArrivedAtPickup,
  startCollection,
  markArrivedAtDropoff,
  requestPayment,
  retryRiderSearch,
  markPaymentCollectedAtPickup,
  markHeadingToStation,
  markCompleted,
};
