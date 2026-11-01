import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import {
  IGetChatsQuery,
  IGetMessagesQuery,
  IGetSupportMessagesPayload,
  ISendMessagePayload,
  ISendSupportMessagePayload,
} from './message.interface';

import { ALLOWED_BOOKING_STATUSES_FOR_CHAT } from './message.constants';

const SUPPORT_ADMIN_ROLES = [
  'admin',
  'sub_admin',
  'super_admin',
  'supper_admin',
];

const SUPPORT_CUSTOMER_ROLES = ['user', 'institute', 'rider'] as const;
const BOOKING_CUSTOMER_ROLES = ['user', 'institute'] as const;

const isSupportCustomerRole = (role: string) =>
  SUPPORT_CUSTOMER_ROLES.includes(
    role as (typeof SUPPORT_CUSTOMER_ROLES)[number],
  );

const isBookingCustomerRole = (role: string) =>
  BOOKING_CUSTOMER_ROLES.includes(
    role as (typeof BOOKING_CUSTOMER_ROLES)[number],
  );

const getBookingAndValidateParticipant = async (
  bookingId: string,
  authUserId: string,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      riderId: true,
      status: true,
      user: {
        select: {
          id: true,
          name: true,
          profilePicture: true,
        },
      },
      rider: {
        select: {
          id: true,
          name: true,
          profilePicture: true,
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (!booking.riderId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Chat is available only after a rider accepts this booking',
    );
  }

  if (!ALLOWED_BOOKING_STATUSES_FOR_CHAT.includes(booking.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Chat is not available for this booking status',
    );
  }

  if (authUserId !== booking.userId && authUserId !== booking.riderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not allowed to access chat for this booking',
    );
  }

  return booking;
};

const findOrCreateChatForBookingParticipants = async (
  userId: string,
  riderId: string,
) => {
  let chat = await prisma.chat.findFirst({
    where: {
      status: 'active',
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: riderId } } },
      ],
    },
  });

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        status: 'active',
        participants: {
          create: [{ userId }, { userId: riderId }],
        },
      },
    });
  }

  return chat;
};

const createMessageWithImages = async (params: {
  chatId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  imagePaths?: string[];
}) => {
  const normalizedText = params.text?.trim();
  const imagePaths = params.imagePaths || [];

  if (!normalizedText && !imagePaths.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please provide message text or at least one image',
    );
  }

  const message = await prisma.messages.create({
    data: {
      chatId: params.chatId,
      senderId: params.senderId,
      receiverId: params.receiverId,
      text: normalizedText || null,
      seen: false,
    },
  });

  if (imagePaths.length) {
    await Promise.all(
      imagePaths.map(image =>
        prisma.images.create({
          data: {
            image,
            referenceId: message.id,
          },
        }),
      ),
    );
  }

  await prisma.chat.update({
    where: { id: params.chatId },
    data: { updatedAt: new Date() },
  });

  const messageWithImages = await prisma.messages.findUnique({
    where: { id: message.id },
    include: {
      images: true,
    },
  });

  if (!messageWithImages) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create message');
  }

  return messageWithImages;
};

const getPaginationParams = (query: { page?: number; limit?: number }) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const getSupportChatById = async (chatId: string) => {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              profilePicture: true,
            },
          },
        },
      },
    },
  });

  if (!chat) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chat not found');
  }

  const hasCustomer = chat.participants.some(
    participant => isSupportCustomerRole(participant.user.role),
  );
  const hasSupportAdmin = chat.participants.some(participant =>
    SUPPORT_ADMIN_ROLES.includes(participant.user.role),
  );

  if (!hasCustomer || !hasSupportAdmin) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This is not a support chat');
  }

  return chat;
};

const findOrCreateSupportChatForUser = async (userId: string) => {
  const candidateChats = await prisma.chat.findMany({
    where: {
      status: 'active',
      participants: {
        some: {
          userId,
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              profilePicture: true,
            },
          },
        },
      },
    },
  });

  let chat = candidateChats.find(candidate =>
    candidate.participants.some(participant =>
      SUPPORT_ADMIN_ROLES.includes(participant.user.role),
    ),
  );

  if (!chat) {
    const admin = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'admin' },
          { role: 'sub_admin' },
          { role: 'supper_admin' },
        ],
        isDeleted: false,
        status: 'active',
      },
      select: {
        id: true,
      },
    });

    if (!admin) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No support agent is available at the moment',
      );
    }

    chat = await prisma.chat.create({
      data: {
        status: 'active',
        participants: {
          create: [{ userId }, { userId: admin.id }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });
  }

  return chat;
};

const sendMessage = async (
  authUserId: string,
  payload: ISendMessagePayload,
) => {
  const booking = await getBookingAndValidateParticipant(
    payload.bookingId,
    authUserId,
  );

  const userId = booking.userId;
  const riderId = booking.riderId as string;
  const receiverId = authUserId === userId ? riderId : userId;

  const chat = await findOrCreateChatForBookingParticipants(userId, riderId);
  const messageWithImages = await createMessageWithImages({
    chatId: chat.id,
    senderId: authUserId,
    receiverId,
    text: payload.text,
    imagePaths: payload.imagePaths,
  });

  return {
    id: messageWithImages.id,
    bookingId: booking.id,
    chatId: messageWithImages.chatId,
    senderId: messageWithImages.senderId,
    receiverId: messageWithImages.receiverId,
    text: messageWithImages.text,
    seen: messageWithImages.seen,
    images: messageWithImages.images,
    createdAt: messageWithImages.createdAt,
    updatedAt: messageWithImages.updatedAt,
  };
};

const getBookingMessages = async (
  authUserId: string,
  bookingId: string,
  query: IGetMessagesQuery,
) => {
  const booking = await getBookingAndValidateParticipant(bookingId, authUserId);

  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
  const skip = (page - 1) * limit;

  const chat = await prisma.chat.findFirst({
    where: {
      status: 'active',
      AND: [
        { participants: { some: { userId: booking.userId } } },
        { participants: { some: { userId: booking.riderId as string } } },
      ],
    },
  });

  if (!chat) {
    return {
      messages: [],
      meta: {
        page,
        limit,
        total: 0,
        totalPage: 0,
      },
      participants: {
        user: booking.user,
        rider: booking.rider,
      },
    };
  }

  const [messages, total] = await Promise.all([
    prisma.messages.findMany({
      where: {
        chatId: chat.id,
      },
      include: {
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.messages.count({
      where: {
        chatId: chat.id,
      },
    }),
  ]);

  if (messages.length) {
    await prisma.messages.updateMany({
      where: {
        chatId: chat.id,
        receiverId: authUserId,
        seen: false,
      },
      data: {
        seen: true,
      },
    });
  }

  return {
    messages,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    participants: {
      user: booking.user,
      rider: booking.rider,
    },
  };
};

const getChatMessages = async (authUserId: string, chatId: string) => {
  const chat = await prisma.chat.findUnique({
    where: {
      id: chatId,
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
              role: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  if (!chat) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chat not found');
  }

  const messages = await prisma.messages.findMany({
    where: {
      chatId,
    },
    include: {
      images: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    messages,
    participants: {
      user: chat.participants.find((participant) => {
        return participant.userId !== authUserId;
      })?.user || {
      id: '',
      name: '',
      profilePicture: '',
      role: '',
      phoneNumber: '',
    }
    }
  };
};

const getMyChats = async (authUserId: string, query: IGetChatsQuery) => {
  const { page, limit, skip } = getPaginationParams(query);

  const chats = await prisma.chat.findMany({
    where: {
      participants: {
        some: {
          userId: authUserId,
        },
      },
      status: 'active',
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
              role: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    skip,
    take: limit,
  });

  const total = await prisma.chat.count({
    where: {
      participants: {
        some: {
          userId: authUserId,
        },
      },
      status: 'active',
    },
  });

  const chatIds = chats.map(chat => chat.id);

  const bookingPairs = chats
    .map(chat => {
      const userParticipant = chat.participants.find(
        participant => isBookingCustomerRole(participant.user.role),
      );
      const riderParticipant = chat.participants.find(
        participant => participant.user.role === 'rider',
      );

      if (!userParticipant || !riderParticipant) {
        return null;
      }

      return {
        userId: userParticipant.userId,
        riderId: riderParticipant.userId,
      };
    })
    .filter(
      (
        pair,
      ): pair is {
        userId: string;
        riderId: string;
      } => Boolean(pair),
    );

  const uniqueBookingPairKeys = new Set(
    bookingPairs.map(pair => `${pair.userId}:${pair.riderId}`),
  );

  const uniqueBookingPairs = Array.from(uniqueBookingPairKeys).map(key => {
    const [userId, riderId] = key.split(':');
    return { userId, riderId };
  });

  const relatedBookings = uniqueBookingPairs.length
    ? await prisma.booking.findMany({
        where: {
          OR: uniqueBookingPairs.map(pair => ({
            userId: pair.userId,
            riderId: pair.riderId,
          })),
        },
        select: {
          id: true,
          userId: true,
          riderId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : [];

  const bookingMap = new Map<string, string>();
  for (const booking of relatedBookings) {
    if (!booking.riderId) {
      continue;
    }

    const key = `${booking.userId}:${booking.riderId}`;
    if (!bookingMap.has(key)) {
      bookingMap.set(key, booking.id);
    }
  }

  const lastMessages = chatIds.length
    ? await prisma.messages.findMany({
        where: {
          chatId: {
            in: chatIds,
          },
        },
        include: {
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : [];

  const lastMessageMap = new Map<string, (typeof lastMessages)[number]>();
  for (const message of lastMessages) {
    if (!lastMessageMap.has(message.chatId)) {
      lastMessageMap.set(message.chatId, message);
    }
  }

  const data = chats.map(chat => {
    const otherParticipant = chat.participants.find(
      participant => participant.userId !== authUserId,
    );

    const userParticipant = chat.participants.find(
      participant => isBookingCustomerRole(participant.user.role),
    );
    const riderParticipant = chat.participants.find(
      participant => participant.user.role === 'rider',
    );

    const bookingId =
      userParticipant && riderParticipant
        ? bookingMap.get(
            `${userParticipant.userId}:${riderParticipant.userId}`,
          ) || null
        : null;

    return {
      id: chat.id,
      status: chat.status,
      bookingId,
      otherParticipant: otherParticipant?.user || null,
      lastMessage: lastMessageMap.get(chat.id) || null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  });

  return {
    chats: data,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const sendSupportMessageByUser = async (
  authUserId: string,
  payload: ISendSupportMessagePayload,
) => {
  const chat = await findOrCreateSupportChatForUser(authUserId);
  const adminParticipant = chat.participants.find(participant =>
    SUPPORT_ADMIN_ROLES.includes(participant.user.role),
  );

  if (!adminParticipant) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No support agent is available at the moment',
    );
  }

  const messageWithImages = await createMessageWithImages({
    chatId: chat.id,
    senderId: authUserId,
    receiverId: adminParticipant.userId,
    text: payload.text,
    imagePaths: payload.imagePaths,
  });

  return {
    chatId: chat.id,
    message: messageWithImages,
  };
};

const getMySupportChats = async (authUserId: string, query: IGetChatsQuery) => {
  const { page, limit } = getPaginationParams(query);

  const chats = await prisma.chat.findMany({
    where: {
      status: 'active',
      participants: {
        some: {
          userId: authUserId,
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const supportChats = chats.filter(chat => {
    const hasUser = chat.participants.some(
      participant =>
        participant.userId === authUserId &&
        isSupportCustomerRole(participant.user.role),
    );
    const hasAdmin = chat.participants.some(participant =>
      SUPPORT_ADMIN_ROLES.includes(participant.user.role),
    );
    return hasUser && hasAdmin;
  });

  const total = supportChats.length;
  const skip = (page - 1) * limit;
  const paginatedChats = supportChats.slice(skip, skip + limit);

  const chatIds = paginatedChats.map(chat => chat.id);
  const lastMessages = chatIds.length
    ? await prisma.messages.findMany({
        where: {
          chatId: {
            in: chatIds,
          },
        },
        include: {
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : [];

  const lastMessageMap = new Map<string, (typeof lastMessages)[number]>();
  for (const message of lastMessages) {
    if (!lastMessageMap.has(message.chatId)) {
      lastMessageMap.set(message.chatId, message);
    }
  }

  const data = paginatedChats.map(chat => {
    const adminParticipant = chat.participants.find(participant =>
      SUPPORT_ADMIN_ROLES.includes(participant.user.role),
    );

    return {
      id: chat.id,
      status: chat.status,
      supportAgent: adminParticipant?.user || null,
      lastMessage: lastMessageMap.get(chat.id) || null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  });

  return {
    chats: data,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getSupportMessagesByChat = async (
  authUserId: string,
  payload: IGetSupportMessagesPayload,
  mode: 'user' | 'admin' | 'rider',
) => {
  const chat = await getSupportChatById(payload.chatId);

  if (mode === 'user') {
    const isCustomerParticipant = chat.participants.some(
      participant =>
        participant.userId === authUserId &&
        isSupportCustomerRole(participant.user.role),
    );

    if (!isCustomerParticipant) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not allowed to access this support chat',
      );
    }
  }

  if (mode === 'rider') {
    const isRiderParticipant = chat.participants.some(
      participant =>
        participant.userId === authUserId && participant.user.role === 'rider',
    );

    if (!isRiderParticipant) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not allowed to access this support chat',
      );
    }
  }

  const { page, limit, skip } = getPaginationParams(payload);

  const [messages, total] = await Promise.all([
    prisma.messages.findMany({
      where: {
        chatId: chat.id,
      },
      include: {
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.messages.count({
      where: {
        chatId: chat.id,
      },
    }),
  ]);

  await prisma.messages.updateMany({
    where: {
      chatId: chat.id,
      receiverId: authUserId,
      seen: false,
    },
    data: {
      seen: true,
    },
  });

  return {
    chatId: chat.id,
    participants: chat.participants.map(participant => participant.user),
    messages,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getAdminSupportChats = async (query: IGetChatsQuery) => {
  const { page, limit } = getPaginationParams(query);
  const searchTerm = query.searchTerm?.trim().toLowerCase();

  const chats = await prisma.chat.findMany({
    where: {
      status: 'active',
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  let supportChats = chats.filter(chat => {
    const hasCustomer = chat.participants.some(participant =>
      isSupportCustomerRole(participant.user.role),
    );
    const hasAdmin = chat.participants.some(participant =>
      SUPPORT_ADMIN_ROLES.includes(participant.user.role),
    );
    return hasCustomer && hasAdmin;
  });

  if (searchTerm) {
    supportChats = supportChats.filter(chat => {
      const customer = chat.participants.find(participant =>
        isSupportCustomerRole(participant.user.role),
      );

      const customerName = customer?.user?.name?.toLowerCase() || '';
      return customerName.includes(searchTerm);
    });
  }

  const supportChatIds = supportChats.map(chat => chat.id);
  const supportLastMessages = supportChatIds.length
    ? await prisma.messages.findMany({
        where: {
          chatId: {
            in: supportChatIds,
          },
        },
        select: {
          id: true,
          chatId: true,
          senderId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : [];

  const supportLastMessageMap = new Map<
    string,
    (typeof supportLastMessages)[number]
  >();
  for (const message of supportLastMessages) {
    if (!supportLastMessageMap.has(message.chatId)) {
      supportLastMessageMap.set(message.chatId, message);
    }
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const supportAdminUserIds = new Set(
    supportChats
      .flatMap(chat => chat.participants)
      .filter(participant =>
        SUPPORT_ADMIN_ROLES.includes(participant.user.role),
      )
      .map(participant => participant.userId),
  );

  const repliedTodayMessages = supportChatIds.length
    ? await prisma.messages.findMany({
        where: {
          chatId: {
            in: supportChatIds,
          },
          senderId: {
            in: Array.from(supportAdminUserIds),
          },
          createdAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
        select: {
          chatId: true,
        },
      })
    : [];

  const repliedTodayChatIds = new Set(
    repliedTodayMessages.map(message => message.chatId),
  );

  const pendingReply = supportChats.reduce((count, chat) => {
    const lastMessage = supportLastMessageMap.get(chat.id);

    if (!lastMessage) {
      return count + 1;
    }

    if (supportAdminUserIds.has(lastMessage.senderId)) {
      return count;
    }

    return count + 1;
  }, 0);

  const stats = {
    active: supportChats.length,
    resolvedToday: repliedTodayChatIds.size,
    pendingReply,
  };

  const total = supportChats.length;
  const skip = (page - 1) * limit;
  const paginatedChats = supportChats.slice(skip, skip + limit);

  const chatIds = paginatedChats.map(chat => chat.id);
  const lastMessages = chatIds.length
    ? await prisma.messages.findMany({
        where: {
          chatId: {
            in: chatIds,
          },
        },
        include: {
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : [];

  const lastMessageMap = new Map<string, (typeof lastMessages)[number]>();
  for (const message of lastMessages) {
    if (!lastMessageMap.has(message.chatId)) {
      lastMessageMap.set(message.chatId, message);
    }
  }

  const data = paginatedChats.map(chat => {
    const customer = chat.participants.find(participant =>
      isSupportCustomerRole(participant.user.role),
    );
    const supportAgent = chat.participants.find(participant =>
      SUPPORT_ADMIN_ROLES.includes(participant.user.role),
    );

    return {
      id: chat.id,
      status: chat.status,
      customer: customer?.user || null,
      supportAgent: supportAgent?.user || null,
      lastMessage: lastMessageMap.get(chat.id) || null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  });

  return {
    chats: data,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    stats,
  };
};

const replySupportMessageByAdmin = async (
  adminUserId: string,
  chatId: string,
  payload: ISendSupportMessagePayload,
) => {
  const chat = await getSupportChatById(chatId);

  const customer = chat.participants.find(participant =>
    isSupportCustomerRole(participant.user.role),
  );

  if (!customer) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Support customer not found');
  }

  const isAdminParticipant = chat.participants.some(
    participant => participant.userId === adminUserId,
  );

  if (!isAdminParticipant) {
    await prisma.participants.create({
      data: {
        chatId: chat.id,
        userId: adminUserId,
      },
    });
  }

  const messageWithImages = await createMessageWithImages({
    chatId: chat.id,
    senderId: adminUserId,
    receiverId: customer.userId,
    text: payload.text,
    imagePaths: payload.imagePaths,
  });

  return {
    chatId: chat.id,
    message: messageWithImages,
  };
};

export const messageServices = {
  sendMessage,
  getBookingMessages,
  getMyChats,
  sendSupportMessageByUser,
  getMySupportChats,
  getSupportMessagesByChat,
  getAdminSupportChats,
  replySupportMessageByAdmin,
};
