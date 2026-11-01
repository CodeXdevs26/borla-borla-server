import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import { commissionServices } from './commission.service';

const getCurrentCommissionRate = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await commissionServices.getCurrentCommissionRate();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result
        ? 'Commission rate retrieved successfully'
        : 'No commission rate has been set yet',
      data: result,
    });
  },
);

const setCommissionRate = catchAsync(async (req: Request, res: Response) => {
  const result = await commissionServices.setCommissionRate(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Commission rate saved successfully',
    data: result,
  });
});

const updateCommissionRate = catchAsync(async (req: Request, res: Response) => {
  const result = await commissionServices.setCommissionRate(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Commission rate updated successfully',
    data: result,
  });
});

const deleteCommissionRate = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await commissionServices.deleteCommissionRate();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message,
      data: result,
    });
  },
);

export const commissionControllers = {
  getCurrentCommissionRate,
  setCommissionRate,
  updateCommissionRate,
  deleteCommissionRate,
};
