import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { toPublicUploadPath } from '../../utils/filePathSanitizer';
import { feedbackServices } from './feedback.service';
import { feedbackValidations } from './feedback.validation';

const createFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await feedbackServices.createFeedback(req.user.userId, {
    ...req.body,
    photo: req.file ? toPublicUploadPath(req.file.path) : undefined,
  });
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Feedback submitted successfully',
    data: result,
  });
});

const getFeedbackByUserId = catchAsync(async (req: Request, res: Response) => {
  // Express 5 query is read-only; use the parsed pagination values directly.
  const { params, query } = feedbackValidations.getFeedbackZodSchema.parse({
    params: req.params,
    query: req.query,
  });
  const result = await feedbackServices.getFeedbackByUserId(
    params.userId,
    query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feedback retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const feedbackControllers = { createFeedback, getFeedbackByUserId };
