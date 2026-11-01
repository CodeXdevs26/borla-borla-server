import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../users/user.constants';
import validateRequest from '../../middleware/validateRequest';
import { messageControllers } from './message.controller';
import { messageValidations } from './message.validation';
import fileUpload from '../../middleware/fileUpload';
import path from 'path';

const router = Router();
const imageUpload = fileUpload(
  path.join(process.cwd(), 'public', 'uploads', 'chat-images'),
);

router.get(
  '/my-chats',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  validateRequest(messageValidations.getChatsZodSchema),
  messageControllers.getMyChats,
);

router.get(
  '/booking/:bookingId',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  validateRequest(messageValidations.getMessagesZodSchema),
  messageControllers.getBookingMessages,
);

router.post(
  '/booking/:bookingId',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  imageUpload.array('images', 5),
  validateRequest(messageValidations.sendMessageZodSchema),
  messageControllers.sendMessage,
);

// support messages routes

router.post(
  '/support',
  auth(
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
    USER_ROLE.sub_admin,
  ),
  imageUpload.array('images', 5),
  validateRequest(messageValidations.sendSupportMessageZodSchema),
  messageControllers.sendSupportMessageByUser,
);

router.get(
  '/support/my-chats',
  auth(
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
    USER_ROLE.sub_admin,
  ),
  validateRequest(messageValidations.adminSupportChatsZodSchema),
  messageControllers.getMySupportChats,
);

router.get(
  '/support/my-chats/:chatId/messages',
  auth(
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
    USER_ROLE.sub_admin,
  ),
  validateRequest(messageValidations.supportMessagesByChatZodSchema),
  messageControllers.getMySupportMessages,
);

router.get(
  '/support/admin/chats',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  validateRequest(messageValidations.adminSupportChatsZodSchema),
  messageControllers.getAdminSupportChats,
);

router.get(
  '/support/admin/chats/:chatId/messages',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  validateRequest(messageValidations.supportMessagesByChatZodSchema),
  messageControllers.getAdminSupportMessages,
);

router.post(
  '/support/admin/chats/:chatId/reply',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  imageUpload.array('images', 5),
  validateRequest(messageValidations.adminReplySupportZodSchema),
  messageControllers.replySupportMessageByAdmin,
);

export const messageRoutes = router;
