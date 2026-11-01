import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { savedPlaceService } from './savedPlace.service';

const createSavedPlace = catchAsync(async (req: Request, res: Response) => {
  const result = await savedPlaceService.createSavedPlace(
    req.user?.userId as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Saved place created successfully',
    data: result,
  });
});

const getMySavedPlaces = catchAsync(async (req: Request, res: Response) => {
  const result = await savedPlaceService.getMySavedPlaces(
    req.user?.userId as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      result.length === 0
        ? 'No saved places found'
        : 'Saved places retrieved successfully',
    data: result,
  });
});

const getSavedPlaceById = catchAsync(async (req: Request, res: Response) => {
  const result = await savedPlaceService.getSavedPlaceById(
    req.user?.userId as string,
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Saved place retrieved successfully',
    data: result,
  });
});

const updateSavedPlace = catchAsync(async (req: Request, res: Response) => {
  const result = await savedPlaceService.updateSavedPlace(
    req.user?.userId as string,
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Saved place updated successfully',
    data: result,
  });
});

const deleteSavedPlace = catchAsync(async (req: Request, res: Response) => {
  const result = await savedPlaceService.deleteSavedPlace(
    req.user?.userId as string,
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Saved place deleted successfully',
    data: result,
  });
});

export const savedPlaceController = {
  createSavedPlace,
  getMySavedPlaces,
  getSavedPlaceById,
  updateSavedPlace,
  deleteSavedPlace,
};
