import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import { toPublicUploadPath } from 'app/utils/filePathSanitizer';
import { emergencySupportServices } from './emergencySupport.service';

const createEmergencySupport = catchAsync(
  async (req: Request, res: Response) => {
    const images = Array.isArray(req.files)
      ? req.files.map(file => toPublicUploadPath(file.path))
      : [];

    const result = await emergencySupportServices.createEmergencySupport(
      req.user.userId,
      { ...req.body, images },
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Emergency support incident submitted successfully',
      data: result,
    });
  },
);

const getEmergencySupports = catchAsync(
  async (req: Request, res: Response) => {
    const result = await emergencySupportServices.getEmergencySupports(
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Emergency support incidents retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  },
);

const updateEmergencySupportStatus = catchAsync(
  async (req: Request, res: Response) => {
    const result = await emergencySupportServices.updateEmergencySupportStatus(
      req.params.id as string,
      req.user.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Emergency support status updated successfully',
      data: result,
    });
  },
);

export const emergencySupportControllers = {
  createEmergencySupport,
  getEmergencySupports,
  updateEmergencySupportStatus,
};
