import { Response } from 'express';

type TMeta = {
  limit: number;
  page: number;
  total: number;
  totalPage: number;
  [key: string]: unknown;
  stats?: {
    active: number;
    resolvedToday: number;
    pendingReply: number;
  };
};

export type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  data: T;
  meta?: TMeta;
};

const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  res.status(data?.statusCode).json({
    success: data.success,
    message: data.message,
    data: data.data || {} || [],
    meta: data.meta,
  });
};

export default sendResponse;
