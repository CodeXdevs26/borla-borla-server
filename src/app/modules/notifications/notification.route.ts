import { Router } from 'express';
import auth from 'app/middleware/auth';
import validateRequest from 'app/middleware/validateRequest';
import { notificationController } from './notification.controller';
import { notificationValidation } from './notification.validation';

const router = Router();

router.get(
  '/my',
  auth('user', 'institute', 'rider', 'admin', 'sub_admin', 'supper_admin'),
  validateRequest(notificationValidation.getNotificationsZodSchema),
  notificationController.getMyNotifications,
);

router.patch(
  '/:id/read',
  auth('user', 'institute', 'rider', 'admin', 'sub_admin', 'supper_admin'),
  notificationController.markNotificationAsRead,
);

router.patch(
  '/read-all',
  auth('user', 'institute', 'rider', 'admin', 'sub_admin', 'supper_admin'),
  notificationController.markAllNotificationsAsRead,
);

export const notificationRoutes = router;
