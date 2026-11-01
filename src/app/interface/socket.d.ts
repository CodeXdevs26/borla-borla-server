import 'socket.io';
interface IUser {
  _id: ObjectId | string;
  email: string;
  role: string;
}

declare module 'socket.io' {
  interface Socket {
    user: IUser;
  }
}
