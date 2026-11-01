import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { messageServices } from './message.service';
import { IGetChatsQuery, IGetMessagesQuery } from './message.interface';
import { emitToChat, emitToUser } from '../../utils/socket';
import { toPublicUploadPath } from '@app/utils/filePathSanitizer';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const imagePaths = Array.isArray(req.files)
    ? req.files.map((file: any) => toPublicUploadPath(file.path))
    : [];

  const result = await messageServices.sendMessage(req.user.userId, {
    bookingId: req.params.bookingId as string,
    text: req.body.text,
    imagePaths,
  });

  emitToChat(result.chatId, 'message:new', result as Record<string, unknown>);
  emitToUser(
    result.receiverId,
    'message:new',
    result as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

const getBookingMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await messageServices.getBookingMessages(
    req.user.userId,
    req.params.bookingId as string,
    req.query as unknown as IGetMessagesQuery,
  );

  if (!result.messages || !result.messages.length) {
    console.log('No messages found for this booking.');
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'No messages found for this booking.',
      data: result.messages,
    });
    return;
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages retrieved successfully',
    data: result.messages,
    meta: result.meta,
  });
});

const getMyChats = catchAsync(async (req: Request, res: Response) => {
  const result = await messageServices.getMyChats(
    req.user.userId,
    req.query as unknown as IGetChatsQuery,
  );

  if (!result.chats || !result.chats.length) {
    console.log('No chats found.');
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'No chats found for this user.',
      data: result.chats,
    });
    return;
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Chats retrieved successfully',
    data: result.chats,
    meta: result.meta,
  });
});

const sendSupportMessageByUser = catchAsync(
  async (req: Request, res: Response) => {
    const imagePaths = Array.isArray(req.files)
      ? req.files.map((file: any) => toPublicUploadPath(file.path))
      : [];

    const result = await messageServices.sendSupportMessageByUser(
      req.user.userId,
      {
        text: req.body.text,
        imagePaths,
      },
    );

    emitToChat(
      result.chatId,
      'message:new',
      result.message as unknown as Record<string, unknown>,
    );
    emitToUser(
      result.message.receiverId,
      'message:new',
      result.message as unknown as Record<string, unknown>,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Support message sent successfully',
      data: result,
    });
  },
);

const getMySupportChats = catchAsync(async (req: Request, res: Response) => {
  const result = await messageServices.getMySupportChats(
    req.user.userId,
    req.query as unknown as IGetChatsQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Support chats retrieved successfully',
    data: result.chats,
    meta: result.meta,
  });
});

const getMySupportMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await messageServices.getSupportMessagesByChat(
    req.user.userId,
    {
      chatId: req.params.chatId as string,
      page: req.query.page as unknown as number,
      limit: req.query.limit as unknown as number,
    },
    req.user.role, // Pass the user role to the service
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Support messages retrieved successfully',
    data: result.messages,
    meta: result.meta,
  });
});

const getAdminSupportChats = catchAsync(async (req: Request, res: Response) => {
  const result = await messageServices.getAdminSupportChats(
    req.query as unknown as IGetChatsQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Support chats retrieved successfully',
    data: result.chats,
    meta: {
      ...result.meta,
      stats: result.stats,
    },
  });
});

const getAdminSupportMessages = catchAsync(
  async (req: Request, res: Response) => {
    const result = await messageServices.getSupportMessagesByChat(
      req.user.userId,
      {
        chatId: req.params.chatId as string,
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
      },
      'admin',
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Support messages retrieved successfully',
      data: result.messages,
      meta: result.meta,
    });
  },
);

const replySupportMessageByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const imagePaths = Array.isArray(req.files)
      ? req.files.map((file: any) => file.path)
      : [];

    const result = await messageServices.replySupportMessageByAdmin(
      req.user.userId,
      req.params.chatId as string,
      {
        text: req.body.text,
        imagePaths,
      },
    );

    emitToChat(
      result.chatId,
      'message:new',
      result.message as unknown as Record<string, unknown>,
    );
    emitToUser(
      result.message.receiverId,
      'message:new',
      result.message as unknown as Record<string, unknown>,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Support reply sent successfully',
      data: result,
    });
  },
);

export const messageControllers = {
  sendMessage,
  getBookingMessages,
  getMyChats,
  sendSupportMessageByUser,
  getMySupportChats,
  getMySupportMessages,
  getAdminSupportChats,
  getAdminSupportMessages,
  replySupportMessageByAdmin,
};
