# Socket Messaging Guide

This document explains how realtime messaging works in the backend, including socket authentication, room strategy, and all current `on` listeners and `emit` events.

## 1. Where Socket Is Initialized

- Server bootstrap: `src/server.ts`
- Socket utility: `src/app/utils/socket.ts`
- Message emits from HTTP handlers: `src/app/modules/messages/message.controller.ts`

Socket is initialized once when HTTP server starts:

```ts
initializeSocket(server);
```

## 2. Authentication Flow

Socket authentication happens in `io.use(...)` middleware.

### Token sources (in order)

1. `socket.handshake.auth.token`
2. `socket.handshake.headers.authorization`

Helper used:

- `getSocketToken(socket)`

The token is normalized by removing `Bearer ` if present and then verified with:

- `config.jwt_access_secret`

If verification fails, connection is rejected with:

- `Unauthorized socket connection`

After success, user info is attached to `socket.user`:

```ts
socket.user = {
  _id: decoded.userId,
  email: '',
  role: decoded.role,
};
```

## 3. Room Strategy

When a socket connects, backend auto-joins the user room:

- `user:{userId}`

Chat rooms are dynamic and joined/left by client requests:

- `chat:{chatId}`

This gives two delivery options:

1. User-targeted delivery: `user:{userId}`
2. Chat-targeted delivery: `chat:{chatId}`

## 4. Acknowledgement Events

Every socket operation now returns a status acknowledgement event to the same client.

Success format:

```json
{
  "success": true,
  "...": "event-specific payload"
}
```

Failure format:

```json
{
  "success": false,
  "message": "error reason",
  "...": "event-specific payload"
}
```

Current acknowledgement events:

- `socket:connection:success`
- `chat:join:success`
- `chat:join:failure`
- `chat:leave:success`
- `chat:leave:failure`
- `chat:typing:success`
- `chat:typing:failure`
- `booking:location:update:success`
- `booking:location:update:failure`
- `socket:disconnect:success`

## 5. Server Listeners (`socket.on`)

### `chat:join`

Client tells server to join a chat room.

Client payload:

```ts
chatId: string;
```

Server action:

- `socket.join('chat:{chatId}')`

Ack emits:

- Success: `chat:join:success`
- Failure: `chat:join:failure` (e.g. missing `chatId`)

### `chat:leave`

Client tells server to leave a chat room.

Client payload:

```ts
chatId: string;
```

Server action:

- `socket.leave('chat:{chatId}')`

Ack emits:

- Success: `chat:leave:success`
- Failure: `chat:leave:failure` (e.g. missing `chatId`)

### `chat:typing`

Client sends typing state.

Client payload:

```ts
{
  chatId: string;
  isTyping: boolean;
}
```

Server broadcasts to others in the same room (not sender):

- Event: `chat:typing`
- Target: `chat:{chatId}`
- Payload:

```ts
{
  chatId: string;
  userId: string;
  isTyping: boolean;
}
```

Ack emits to sender:

- Success: `chat:typing:success`
- Failure: `chat:typing:failure` (e.g. missing `chatId`)

### `booking:location:update`

Rider sends current booking location to backend for realtime user tracking.

Client payload:

```ts
{
  bookingId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp?: string;
}
```

Server validation:

- Socket user must be a rider.
- `bookingId` must be present.
- `latitude` and `longitude` must be valid.
- Rider must be assigned to the booking.
- Booking status must allow tracking (`accepted`, `arrived_pickup`, `payment_collected`, `heading_to_station`, `in_progress`, `awaiting_payment`).

Server emit target:

- `user:{booking.userId}`

Server emit event to booking user:

- `booking:location:update`

Server emit payload:

```ts
{
  bookingId: string;
  riderId: string;
  userId: string;
  status: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  }
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: string;
}
```

Ack emits to rider:

- Success: `booking:location:update:success`
- Failure: `booking:location:update:failure`

## 6. Server Emit Helpers

Defined in `src/app/utils/socket.ts`.

### `emitToUser(userId, event, payload)`

Emits event to room:

- `user:{userId}`

### `emitToChat(chatId, event, payload)`

Emits event to room:

- `chat:{chatId}`

## 7. Booking Events Emitted From Backend

### `booking:new`

Emitted when a booking is created and its pickup location falls inside a rider's zone.

Targets:

1. Verified riders assigned to the matching zone through `emitToUser(riderId, 'booking:new', payload)`

Payload includes:

- `bookingId`
- `userId`
- `status`
- `pickupAddress`
- `pickupLocation`
- `wasteCategory`
- `binSize`
- `binQuantity`
- `wasteSize`
- `estimatedDistance`
- `estimatedTime`
- `price`
- `createdAt`
- `user`

This event is what the rider dashboard listens to for new available work.

### `booking:tracking:started`

Emitted to booking user immediately after rider accepts a booking.

Payload includes:

- `bookingId`
- `riderId`
- `userId`
- `status`
- `message`

This event tells the customer app to begin listening for `booking:location:update`.

## 8. Message Events Emitted From Backend

Currently emitted event name:

- `message:new`

### Emitted after booking message is sent

Location:

- `message.controller.ts` -> `sendMessage`

Targets:

1. `chat:{chatId}` via `emitToChat`
2. `user:{receiverId}` via `emitToUser`

Payload:

- full created message response object from `messageServices.sendMessage(...)`
- includes fields like `id`, `chatId`, `senderId`, `receiverId`, `text`, `images`, timestamps

### Emitted after user sends support message

Location:

- `message.controller.ts` -> `sendSupportMessageByUser`

Targets:

1. `chat:{chatId}`
2. `user:{receiverId}`

Payload:

- `result.message` from `messageServices.sendSupportMessageByUser(...)`

### Emitted after admin replies in support chat

Location:

- `message.controller.ts` -> `replySupportMessageByAdmin`

Targets:

1. `chat:{chatId}`
2. `user:{receiverId}`

Payload:

- `result.message` from `messageServices.replySupportMessageByAdmin(...)`

## 9. Frontend Integration Checklist

1. Connect socket with JWT token in `auth.token`.
2. Listen for `connect_error` to catch unauthorized token issues.
3. On entering a chat screen, emit `chat:join` with `chatId`.
4. On leaving chat screen, emit `chat:leave` with `chatId`.
5. Send typing indicators using `chat:typing`.
6. Listen for business events:

- `message:new`
- `chat:typing`
- `booking:new`
- `booking:tracking:started`
- `booking:location:update`

7. Listen for acknowledgement events:

- `chat:join:success` / `chat:join:failure`
- `chat:leave:success` / `chat:leave:failure`
- `chat:typing:success` / `chat:typing:failure`
- `booking:location:update:success` / `booking:location:update:failure`
- `socket:connection:success`

## 10. Minimal Client Example

```ts
import { io } from 'socket.io-client';

const socket = io('http://0.0.0.0:5000', {
  auth: {
    token: accessToken, // can be raw token or Bearer token
  },
});

socket.on('connect', () => {
  console.log('connected', socket.id);
});

socket.on('connect_error', err => {
  console.error('socket auth failed:', err.message);
});

socket.emit('chat:join', chatId);

socket.on('chat:join:success', payload => {
  console.log('join ok:', payload);
});

socket.on('chat:join:failure', payload => {
  console.error('join failed:', payload);
});

socket.on('message:new', message => {
  console.log('new message:', message);
});

socket.emit('chat:typing', { chatId, isTyping: true });

socket.on('chat:typing', payload => {
  console.log('typing:', payload);
});

socket.on('chat:typing:failure', payload => {
  console.error('typing failed:', payload);
});
```

## 10. Notes

- If socket server is not initialized and emit helpers are called, helpers safely no-op.
- CORS origin for socket is from `config.client_Url` (fallback `*`).
- Event names are string literals; keep frontend and backend names identical.
- Query-string token (e.g. `?token=...`) is not read by current backend.
