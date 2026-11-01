import { Request, Response } from 'express';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import httpStatus from 'http-status';
import { stationServices } from './station.service';
import pick from 'app/utils/pick';

const createStation = catchAsync(async (req: Request, res: Response) => {
  const result = await stationServices.createStation(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Station created successfully',
    data: result,
  });
});

const getAllStations = catchAsync(async (req: Request, res: Response) => {
  const query = pick(req.query, ['zoneId', 'searchTerm', 'page', 'limit']);
  const result = await stationServices.getAllStations(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stations retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getStationById = catchAsync(async (req: Request, res: Response) => {
  const result = await stationServices.getStationById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Station retrieved successfully',
    data: result,
  });
});

const updateStation = catchAsync(async (req: Request, res: Response) => {
  const result = await stationServices.updateStation(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Station updated successfully',
    data: result,
  });
});

const deleteStation = catchAsync(async (req: Request, res: Response) => {
  const result = await stationServices.deleteStation(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getMyStations = catchAsync(async (req: Request, res: Response) => {
  const riderId = req.user.userId;

  const result = await stationServices.getStationsByRiderZone(riderId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your assigned stations retrieved successfully',
    data: result,
  });
});

export const stationControllers = {
  createStation,
  getAllStations,
  getStationById,
  updateStation,
  deleteStation,
  getMyStations,
};
