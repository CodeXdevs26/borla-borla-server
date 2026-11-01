import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import { notificationService } from './notification.service';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.getMyNotifications(
    req.user.userId,
    req.query as any,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    data: result.notifications,
    meta: result.meta,
  });
});

const markNotificationAsRead = catchAsync(
  async (req: Request, res: Response) => {
    const result = await notificationService.markNotificationAsRead(
      req.user.userId,
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Notification marked as read',
      data: result,
    });
  },
);

const markAllNotificationsAsRead = catchAsync(
  async (req: Request, res: Response) => {
    const result = await notificationService.markAllNotificationsAsRead(
      req.user.userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All notifications marked as read',
      data: result,
    });
  },
);

export const notificationController = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
