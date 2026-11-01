import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import { referralServices } from './referral.service';

const getMyReferralHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await referralServices.getMyReferralHistory(
    req.user.userId,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Referral history retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const referralControllers = {
  getMyReferralHistory,
};
