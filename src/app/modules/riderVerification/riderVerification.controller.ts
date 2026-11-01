import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import { riderVerificationServices } from './riderVerification.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

// Get all riders for verification
const getPendingRiders = catchAsync(async (req: Request, res: Response) => {
  const result = await riderVerificationServices.getPendingRiders(req.query);

  const message = !result.data.length
    ? 'No riders found'
    : 'Riders retrieved successfully';

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result.data,
    meta: result.meta,
  });
});

// Get single rider details
const getRiderById = catchAsync(async (req: Request, res: Response) => {
  const result = await riderVerificationServices.getRiderById(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider details retrieved successfully',
    data: result,
  });
});

// Approve rider
const approveRider = catchAsync(async (req: Request, res: Response) => {
  const result = await riderVerificationServices.approveRider(
    req.params.id as string,
    req.body.zoneId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider approved successfully',
    data: result,
  });
});

// Reject rider
const rejectRider = catchAsync(async (req: Request, res: Response) => {
  const result = await riderVerificationServices.rejectRider(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider rejected successfully',
    data: result,
  });
});

// Get verification statistics
const getVerificationStats = catchAsync(async (req: Request, res: Response) => {
  const result = await riderVerificationServices.getVerificationStats();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Verification statistics retrieved successfully',
    data: result,
  });
});

export const riderVerificationControllers = {
  getPendingRiders,
  getRiderById,
  approveRider,
  rejectRider,
  getVerificationStats,
};
