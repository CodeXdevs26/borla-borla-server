import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { safetyToolkitServices as services } from './safetyToolkit.service';

const createSection = catchAsync(async (req: Request, res: Response) => {
  const data = await services.createSection(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Safety toolkit section created',
    data,
  });
});
const getAllSections = catchAsync(async (_req: Request, res: Response) => {
  const data = await services.getAllSections();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Safety toolkit sections retrieved',
    data,
  });
});
const updateSection = catchAsync(async (req: Request, res: Response) => {
  const data = await services.updateSection(
    req.params.sectionId as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Safety toolkit section updated',
    data,
  });
});
const deleteSection = catchAsync(async (req: Request, res: Response) => {
  const data = await services.deleteSection(req.params.sectionId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Safety toolkit section deleted',
    data,
  });
});
export const safetyToolkitControllers = {
  createSection,
  getAllSections,
  updateSection,
  deleteSection,
};
