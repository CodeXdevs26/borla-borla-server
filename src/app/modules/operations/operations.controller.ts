import { Request, Response } from 'express';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import httpStatus from 'http-status';
import { operationsServices } from './operations.service';

const getPickupsPerHour = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getPickupsPerHour(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pickups per hour data retrieved successfully',
    data: result,
  });
});

const getAvgPickupTimeByDay = catchAsync(
  async (req: Request, res: Response) => {
    const result = await operationsServices.getAvgPickupTimeByDay(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Average pickup time by day retrieved successfully',
      data: result,
    });
  },
);

const getCompletionRate = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getCompletionRate(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Completion rate retrieved successfully',
    data: result,
  });
});

const getZoneHealth = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getZoneHealth(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone health data retrieved successfully',
    data: result,
  });
});

const getOperationsDashboard = catchAsync(
  async (req: Request, res: Response) => {
    const result = await operationsServices.getOperationsDashboard(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Operations dashboard data retrieved successfully',
      data: result,
    });
  },
);

const getPickupSuccessRate = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getPickupSuccessRate({
    ...req.query,
    zoneId:
      (req.params.zoneId as string | undefined) ??
      (req.query.zoneId as string | undefined),
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pickup success rate retrieved successfully',
    data: result,
  });
});

const getZoneRanking = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getZoneRanking(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone ranking retrieved successfully',
    data: result,
  });
});

const getTopRiders = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getTopRiders(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Top performing riders retrieved successfully',
    data: result,
  });
});

const getZoneTopPerformingRiders = catchAsync(
  async (req: Request, res: Response) => {
    const result = await operationsServices.getZoneTopPerformingRiders({
      ...req.query,
      zoneId: req.params.zoneId as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Zone top performing riders retrieved successfully',
      data: result,
    });
  },
);

const getZoneDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getZoneDetails({
    zoneId: req.params.zoneId as string,
    ...req.query,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone details retrieved successfully',
    data: result,
  });
});

const getZoneTrends = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getZoneTrends({
    zoneId: req.params.zoneId as string,
    ...req.query,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone performance trends retrieved successfully',
    data: result,
  });
});

const getZoneComparison = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getZoneComparison(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone comparison data retrieved successfully',
    data: result,
  });
});

const getZoneStats = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getZoneStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone statistics retrieved successfully',
    data: result,
  });
});

const getRidersList = catchAsync(async (req: Request, res: Response) => {
  const result = await operationsServices.getRidersList(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Riders list retrieved successfully',
    data: result.data,
    meta: result.pagination,
  });
});

export const operationsControllers = {
  getPickupsPerHour,
  getAvgPickupTimeByDay,
  getCompletionRate,
  getZoneHealth,
  getOperationsDashboard,
  getPickupSuccessRate,
  getZoneRanking,
  getTopRiders,
  getZoneTopPerformingRiders,
  getZoneDetails,
  getZoneTrends,
  getZoneComparison,
  getZoneStats,
  getRidersList,
};
