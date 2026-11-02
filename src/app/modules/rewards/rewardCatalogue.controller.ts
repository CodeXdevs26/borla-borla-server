import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import { rewardCatalogueServices as services } from './rewardCatalogue.service';

const getMyCatalogue = catchAsync(async (req: Request, res: Response) => {
  const data = await services.getCatalogueForUser(req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reward catalogue retrieved successfully', data });
});

const requestClaim = catchAsync(async (req: Request, res: Response) => {
  const data = await services.requestClaim(req.user.userId, req.params.itemId as string);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Reward claim request submitted for approval', data });
});

const getMyClaims = catchAsync(async (req: Request, res: Response) => {
  const data = await services.getMyClaims(req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reward claims retrieved successfully', data });
});

const createItem = catchAsync(async (req: Request, res: Response) => {
  const data = await services.createItem(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Reward item created successfully', data });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const data = await services.updateItem(req.params.itemId as string, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reward item updated successfully', data });
});

const removeItem = catchAsync(async (req: Request, res: Response) => {
  await services.removeItem(req.params.itemId as string);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reward item deleted successfully', data: null });
});

const getAdminItems = catchAsync(async (req: Request, res: Response) => {
  const data = await services.getCatalogueForUser(req.params.userId as string, true);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'User reward eligibility retrieved successfully', data });
});

const getAdminClaims = catchAsync(async (_req: Request, res: Response) => {
  const data = await services.getAdminClaims();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reward claims retrieved successfully', data });
});

const approveClaim = catchAsync(async (req: Request, res: Response) => {
  const data = await services.approveClaim(req.params.claimId as string, req.user.userId, req.body.reviewNote);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reward claim approved and points deducted', data });
});

const rejectClaim = catchAsync(async (req: Request, res: Response) => {
  const data = await services.rejectClaim(req.params.claimId as string, req.user.userId, req.body.reviewNote);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reward claim rejected', data });
});

export const rewardCatalogueControllers = {
  getMyCatalogue,
  requestClaim,
  getMyClaims,
  createItem,
  updateItem,
  removeItem,
  getAdminItems,
  getAdminClaims,
  approveClaim,
  rejectClaim,
};
