import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import { riderServices } from './rider.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

// Find available riders within radius
const findAvailableRiders = catchAsync(async (req: Request, res: Response) => {
  const result = await riderServices.findAvailableRiders(
    req.user.userId,
    req.query,
  );

  const message = !result.riders.length
    ? `No riders available within ${result.meta.radius}km radius`
    : `Found ${result.riders.length} rider(s) within ${result.meta.radius}km`;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result.riders,
    meta: result.meta,
  });
});

const getActivityReport = catchAsync(async (req: Request, res: Response) => {
  const result = await riderServices.getActivityReport(
    req.user.userId,
    req.query.filter as 'today' | 'weekly' | 'monthly',
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider activity report retrieved successfully',
    data: result,
  });
});

const getPerformance = catchAsync(async (req: Request, res: Response) => {
  const result = await riderServices.getPerformance(
    req.user.userId,
    req.query.filter as 'today' | 'weekly' | 'monthly',
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider performance retrieved successfully',
    data: result,
  });
});

export const riderControllers = {
  findAvailableRiders,
  getActivityReport,
  getPerformance,
};
