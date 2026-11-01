import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import { specialAccessService } from './specialAccess.service';

const createSpecialAccessUser = catchAsync(
  async (req: Request, res: Response) => {
    const result = await specialAccessService.createSpecialAccessUser(req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Special access user created successfully',
      data: result,
    });
  },
);

const getSpecialAccessUsers = catchAsync(
  async (req: Request, res: Response) => {
    const result = await specialAccessService.getSpecialAccessUsers(
      req.query as any,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Special access users retrieved successfully',
      data: result.users,
      meta: result.meta,
    });
  },
);

const deleteSpecialAccessUser = catchAsync(
  async (req: Request, res: Response) => {
    const result = await specialAccessService.deleteSpecialAccessUser(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Special access user deleted successfully',
      data: result,
    });
  },
);

export const specialAccessController = {
  createSpecialAccessUser,
  getSpecialAccessUsers,
  deleteSpecialAccessUser,
};
