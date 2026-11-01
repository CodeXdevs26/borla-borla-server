import { Request, Response } from 'express';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import httpStatus from 'http-status';
import { earningsServices } from './earnings.service';

const getEarnings = catchAsync(async (req: Request, res: Response) => {
  const result = await earningsServices.getEarnings(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Earnings list retrieved successfully',
    data: result.data,
    meta: result.pagination,
  });
});

const getEarningDetailsById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await earningsServices.getEarningDetailsById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Earning details retrieved successfully',
      data: result,
    });
  },
);

const getRiderEarnings = catchAsync(async (req: Request, res: Response) => {
  const riderId = (req.user as any)?.userId;
  const filter =
    (req.query.filter as 'today' | 'weekly' | 'monthly') || 'monthly';
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;

  const result = await earningsServices.getRiderEarnings(
    riderId,
    filter,
    page,
    limit,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider earnings retrieved successfully',
    data: result.data,
    meta: result.pagination,
  });
});

const getRiderEarningDetails = catchAsync(
  async (req: Request, res: Response) => {
    const result = await earningsServices.getRiderEarningDetails(
      req.user.userId,
      req.query.filter as 'today' | 'weekly' | 'monthly',
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Rider earning details retrieved successfully',
      data: result,
    });
  },
);

export const earningsControllers = {
  getEarnings,
  getEarningDetailsById,
  getRiderEarnings,
  getRiderEarningDetails,
};
