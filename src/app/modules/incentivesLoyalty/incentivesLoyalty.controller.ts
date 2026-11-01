import { Request, Response } from 'express';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import httpStatus from 'http-status';
import { incentivesLoyaltyServices } from './incentivesLoyalty.service';

const getZoneRiderLoyaltyCards = catchAsync(
  async (req: Request, res: Response) => {
    const result = await incentivesLoyaltyServices.getZoneRiderLoyaltyCards(
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Rider incentives and loyalty cards retrieved successfully',
      data: result,
    });
  },
);

const getCustomerLoyalty = catchAsync(async (req: Request, res: Response) => {
  const result = await incentivesLoyaltyServices.getCustomerLoyalty(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer loyalty leaderboard retrieved successfully',
    data: result.data,
    meta: result.pagination,
  });
});

const getRiderBonuses = catchAsync(async (req: Request, res: Response) => {
  const result = await incentivesLoyaltyServices.getRiderBonuses(
    req.user.userId,
    req.query.filter as 'today' | 'weekly' | 'monthly',
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider bonuses retrieved successfully',
    data: result,
  });
});

export const incentivesLoyaltyControllers = {
  getZoneRiderLoyaltyCards,
  getCustomerLoyalty,
  getRiderBonuses,
};
