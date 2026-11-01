import { Request, Response } from 'express';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import httpStatus from 'http-status';
import { dashboardServices } from './dashboard.service';

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardServices.getDashboardStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard statistics retrieved successfully',
    data: result,
  });
});

const getUserOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardServices.getUserOverview(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User overview data retrieved successfully',
    data: result,
  });
});

const getRevenueChart = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardServices.getRevenueChart(req.query as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Revenue chart data retrieved successfully',
    data: result,
  });
});

const getZoneComparison = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardServices.getZoneComparison(req.query as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone comparison data retrieved successfully',
    data: result,
  });
});

const getWasteDistribution = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardServices.getWasteDistribution(req.query as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Waste distribution data retrieved successfully',
    data: result,
  });
});

const getRecentAccounts = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardServices.getRecentAccounts(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recent accounts retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const dashboardControllers = {
  getDashboardStats,
  getUserOverview,
  getRevenueChart,
  getZoneComparison,
  getWasteDistribution,
  getRecentAccounts,
};
