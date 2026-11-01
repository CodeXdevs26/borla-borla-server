import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import { emitToUser } from 'app/utils/socket';
import {
  ICreateNotificationPayload,
  IGetNotificationsQuery,
} from './notification.interface';

const createNotificationForUser = async (
  payload: ICreateNotificationPayload,
) => {
  const notification = await (prisma as any).notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || null,
    },
  });

  emitToUser(payload.userId, 'notification:new', {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  });

  return notification;
};

const createNotificationForUsers = async (
  userIds: string[],
  payload: Omit<ICreateNotificationPayload, 'userId'>,
) => {
  if (!userIds.length) return [];

  const notifications = await Promise.all(
    userIds.map(userId =>
      createNotificationForUser({
        userId,
        ...payload,
      }),
    ),
  );

  return notifications;
};

const getMyNotifications = async (
  userId: string,
  query: IGetNotificationsQuery,
) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {
    userId,
  };

  if (query.isRead === 'true') {
    whereClause.isRead = true;
  } else if (query.isRead === 'false') {
    whereClause.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    (prisma as any).notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    (prisma as any).notification.count({
      where: whereClause,
    }),
    (prisma as any).notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  return {
    notifications,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
      unreadCount,
    },
  };
};

const markNotificationAsRead = async (
  userId: string,
  notificationId: string,
) => {
  return (prisma as any).notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
    },
  });
};

const markAllNotificationsAsRead = async (userId: string) => {
  await (prisma as any).notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return {
    success: true,
  };
};

const notifyRiderSignup = async (params: { userId: string; name: string }) => {
  const { userId, name } = params;

  await notificationService.createNotificationForUser({
    userId,
    type: 'rider_signup_pending_approval',
    title: 'Rider Registration Submitted',
    message:
      'Your rider account has been created and is pending admin approval.',
    data: {
      riderUserId: userId,
    },
  });

  const admins = await prisma.user.findMany({
    where: {
      isDeleted: false,
      status: 'active',
      role: {
        in: ['admin', 'sub_admin', 'supper_admin'],
      },
    },
    select: {
      id: true,
    },
  });

  await notificationService.createNotificationForUsers(
    admins.map(admin => admin.id),
    {
      type: 'new_rider_registration',
      title: 'New Rider Registration',
      message: `${name} registered as a rider and is waiting for approval.`,
      data: {
        riderUserId: userId,
        riderName: name,
      },
    },
  );
};

export const notificationService = {
  createNotificationForUser,
  createNotificationForUsers,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyRiderSignup,
};
