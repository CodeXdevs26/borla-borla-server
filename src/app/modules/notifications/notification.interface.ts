export interface ICreateNotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface IGetNotificationsQuery {
  page?: string;
  limit?: string;
  isRead?: string;
}
