import { Request, Response } from 'express';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import httpStatus from 'http-status';
import { realtimeMonitorService } from './realtimeMonitor.service';

const getRealtimeMonitorStats = catchAsync(
  async (req: Request, res: Response) => {
    const result = await realtimeMonitorService.getRealtimeMonitorStats();
    console.log('/realtime-monitor/stats:');
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Realtime monitor stats retrieved successfully',
      data: result,
    });
  },
);

const getRealtimeRiders = catchAsync(async (req: Request, res: Response) => {
  const result = await realtimeMonitorService.getRealtimeRiders(
    req.query as any,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Realtime riders retrieved successfully',
    data: result.riders,
    meta: result.meta,
  });
});

const getRealtimeLiveLocations = catchAsync(
  async (req: Request, res: Response) => {
    const result = await realtimeMonitorService.getRealtimeLiveLocations();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Realtime rider locations retrieved successfully',
      data: result,
    });
  },
);

const getRealtimeActivities = catchAsync(
  async (req: Request, res: Response) => {
    const result = await realtimeMonitorService.getRealtimeActivities(
      req.query as any,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Realtime activities retrieved successfully',
      data: result.activities,
      meta: result.meta,
    });
  },
);

export const realtimeMonitorController = {
  getRealtimeMonitorStats,
  getRealtimeRiders,
  getRealtimeLiveLocations,
  getRealtimeActivities,
};
