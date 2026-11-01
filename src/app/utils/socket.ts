import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from 'app/config';
import prisma from 'app/shared/prisma';

type IJwtSocketPayload = {
  userId: string;
  role: string;
};

type IBookingLocationPayload = {
  bookingId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp?: string;
};

const ADMIN_SOCKET_ROLES = [
  'admin',
  'sub_admin',
  'supper_admin',
  'super_admin',
] as const;

const REALTIME_MONITOR_ADMINS_ROOM = 'admins:realtime-monitor';

let io: Server | null = null;

const emitOperationSuccess = (
  socket: Parameters<Server['on']>[1] extends (arg: infer S) => any ? S : any,
  event: string,
  payload: Record<string, unknown>,
) => {
  socket.emit(`${event}:success`, {
    success: true,
    ...payload,
  });
};

const emitOperationFailure = (
  socket: Parameters<Server['on']>[1] extends (arg: infer S) => any ? S : any,
  event: string,
  message: string,
  payload: Record<string, unknown> = {},
) => {
  socket.emit(`${event}:failure`, {
    success: false,
    message,
    ...payload,
  });
};

const getSocketToken = (socket: any): string | null => {
  const authToken = socket?.handshake?.auth?.token;
  const headerToken = socket?.handshake?.headers?.authorization;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim().replace(/^Bearer\s+/i, '');
  }

  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim().replace(/^Bearer\s+/i, '');
  }

  return null;
};

const isValidCoordinate = (value: unknown, min: number, max: number) => {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
};

const isAdminSocketRole = (role: unknown) => {
  return typeof role === 'string' && ADMIN_SOCKET_ROLES.includes(role as any);
};

export const initializeSocket = (server: HttpServer) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: config.client_Url || '*',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = getSocketToken(socket);
      if (!token) {
        return next(new Error('Unauthorized socket connection'));
      }

      const decoded = jwt.verify(
        token,
        config.jwt_access_secret as string,
      ) as IJwtSocketPayload;

      socket.user = {
        _id: decoded.userId,
        email: '',
        role: decoded.role,
      };

      return next();
    } catch (_error) {
      return next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', socket => {
    const userId = String(socket.user?._id || '');
    const socketRole = String(socket.user?.role || '');
    console.log(`User connected to socket: ${userId}`);
    if (userId) {
      socket.join(`user:${userId}`);
      emitOperationSuccess(socket, 'socket:connection', {
        userId,
      });
    }

    if (isAdminSocketRole(socketRole)) {
      socket.join(REALTIME_MONITOR_ADMINS_ROOM);
    }

    socket.on('chat:join', (chatId: string) => {
      try {
        if (!chatId || !String(chatId).trim()) {
          emitOperationFailure(socket, 'chat:join', 'chatId is required');
          return;
        }

        socket.join(`chat:${chatId}`);

        console.log(`User ${userId} joined chat ${chatId}`);
        console.log(`typeof ${typeof chatId}`);

        emitOperationSuccess(socket, 'chat:join', {
          chatId,
          userId,
        });
      } catch (_error) {
        emitOperationFailure(socket, 'chat:join', 'Failed to join chat room', {
          chatId,
        });
      }
    });

    socket.on('chat:leave', (chatId: string) => {
      try {
        if (!chatId || !String(chatId).trim()) {
          emitOperationFailure(socket, 'chat:leave', 'chatId is required');
          return;
        }

        socket.leave(`chat:${chatId}`);
        emitOperationSuccess(socket, 'chat:leave', {
          chatId,
          userId,
        });
      } catch (_error) {
        emitOperationFailure(
          socket,
          'chat:leave',
          'Failed to leave chat room',
          { chatId },
        );
      }
    });

    socket.on(
      'chat:typing',
      (payload: { chatId: string; isTyping: boolean }) => {
        try {
          if (!payload?.chatId || !String(payload.chatId).trim()) {
            emitOperationFailure(socket, 'chat:typing', 'chatId is required');
            return;
          }

          socket.to(`chat:${payload.chatId}`).emit('chat:typing', {
            chatId: payload.chatId,
            userId,
            isTyping: !!payload.isTyping,
          });
          console.log(
            `User ${userId} is ${payload.isTyping ? 'typing...' : 'stopped typing.'} in chat ${payload.chatId}`,
          );

          emitOperationSuccess(socket, 'chat:typing', {
            chatId: payload.chatId,
            userId,
            isTyping: !!payload.isTyping,
          });
        } catch (_error) {
          emitOperationFailure(
            socket,
            'chat:typing',
            'Failed to send typing state',
            {
              chatId: payload?.chatId || null,
            },
          );
        }
      },
    );

    socket.on(
      'booking:location:update',
      async (payload: IBookingLocationPayload) => {
        try {
          if (socket.user?.role !== 'rider') {
            emitOperationFailure(
              socket,
              'booking:location:update',
              'Only riders can send booking location updates',
            );
            return;
          }

          if (!payload?.bookingId || !String(payload.bookingId).trim()) {
            emitOperationFailure(
              socket,
              'booking:location:update',
              'bookingId is required',
            );
            return;
          }

          if (
            !isValidCoordinate(payload.latitude, -90, 90) ||
            !isValidCoordinate(payload.longitude, -180, 180)
          ) {
            emitOperationFailure(
              socket,
              'booking:location:update',
              'Valid latitude and longitude are required',
            );
            return;
          }

          const booking = await prisma.booking.findUnique({
            where: { id: payload.bookingId },
            select: {
              id: true,
              userId: true,
              riderId: true,
              status: true,
            },
          });

          if (!booking) {
            emitOperationFailure(
              socket,
              'booking:location:update',
              'Booking not found',
              { bookingId: payload.bookingId },
            );
            return;
          }

          if (booking.riderId !== userId) {
            emitOperationFailure(
              socket,
              'booking:location:update',
              'You are not assigned to this booking',
              { bookingId: payload.bookingId },
            );
            return;
          }

          if (
            ![
              'accepted',
              'arrived_pickup',
              'garbage_ready',
              'garbage_collected',
              'payment_collected',
              'heading_to_station',
              'in_progress',
              'awaiting_payment',
            ].includes(booking.status)
          ) {
            emitOperationFailure(
              socket,
              'booking:location:update',
              `Cannot send location update for booking status: ${booking.status}`,
              { bookingId: payload.bookingId, status: booking.status },
            );
            return;
          }

          emitToUser(booking.userId, 'booking:location:update', {
            bookingId: booking.id,
            riderId: userId,
            userId: booking.userId,
            status: booking.status,
            location: {
              type: 'Point',
              coordinates: [payload.longitude, payload.latitude],
            },
            latitude: payload.latitude,
            longitude: payload.longitude,
            heading:
              typeof payload.heading === 'number' &&
              Number.isFinite(payload.heading)
                ? payload.heading
                : null,
            speed:
              typeof payload.speed === 'number' &&
              Number.isFinite(payload.speed)
                ? payload.speed
                : null,
            accuracy:
              typeof payload.accuracy === 'number' &&
              Number.isFinite(payload.accuracy)
                ? payload.accuracy
                : null,
            timestamp: payload.timestamp || new Date().toISOString(),
          });

          const rider = await prisma.user.update({
            where: { id: userId },
            data: {
              location: {
                type: 'Point',
                coordinates: [payload.longitude, payload.latitude],
              },
              onlineStatus: 'online',
            },
            select: {
              id: true,
              name: true,
              profilePicture: true,
            },
          });

          const realtimeTimestamp =
            payload.timestamp || new Date().toISOString();

          getIO()
            .to(REALTIME_MONITOR_ADMINS_ROOM)
            .emit('realtime:rider:location:update', {
              id: rider.id,
              name: rider.name,
              avatar: rider.profilePicture || null,
              status: 'Busy',
              mapStatus: 'active',
              latitude: payload.latitude,
              longitude: payload.longitude,
              bookingId: booking.id,
              bookingStatus: booking.status,
              timestamp: realtimeTimestamp,
            });

          emitOperationSuccess(socket, 'booking:location:update', {
            bookingId: booking.id,
            userId: booking.userId,
            riderId: userId,
            status: booking.status,
          });
        } catch (_error) {
          emitOperationFailure(
            socket,
            'booking:location:update',
            'Failed to send booking location update',
            { bookingId: payload?.bookingId || null },
          );
        }
      },
    );

    socket.on('disconnect', reason => {
      console.log(
        `User disconnected from socket: ${userId}, reason: ${reason}`,
      );
      emitOperationSuccess(socket, 'socket:disconnect', {
        userId,
        reason,
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket server has not been initialized');
  }

  return io;
};

export const emitToUser = (
  userId: string,
  event: string,
  payload: Record<string, unknown>,
) => {
  console.log(
    `Emitting event '${event}' to user ${userId} with payload:`,
    payload,
  );
  if (!io || !userId) return 0;

  const room = `user:${userId}`;
  const connectedSocketCount = io.sockets.adapter.rooms.get(room)?.size || 0;
  console.log(
    `Emitting '${event}' to ${room} (${connectedSocketCount} connected socket(s)).`,
  );
  io.to(room).emit(event, payload);
  return connectedSocketCount;
};

export const emitToChat = (
  chatId: string,
  event: string,
  payload: Record<string, unknown>,
) => {
  if (!io || !chatId) return;
  io.to(`chat:${chatId}`).emit(event, payload);
};
