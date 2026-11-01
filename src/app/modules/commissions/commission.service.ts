import AppError from 'app/error/AppError';
import prisma from 'app/shared/prisma';
import httpStatus from 'http-status';
import { ICommissionRatePayload } from './commission.interface';

const COMMISSION_RATE_ID = 'global';
const DEFAULT_COMMISSION_RATE = 20;
const commissionModel = (prisma as any).commissionRate;

const getCurrentCommissionRate = async () => {
  return commissionModel.findUnique({
    where: {
      id: COMMISSION_RATE_ID,
    },
  });
};

const getActiveCommissionRateValue = async () => {
  const commission = await getCurrentCommissionRate();
  return commission?.rate ?? DEFAULT_COMMISSION_RATE;
};

const setCommissionRate = async (payload: ICommissionRatePayload) => {
  return commissionModel.upsert({
    where: {
      id: COMMISSION_RATE_ID,
    },
    create: {
      id: COMMISSION_RATE_ID,
      rate: payload.rate,
    },
    update: {
      rate: payload.rate,
    },
  });
};

const deleteCommissionRate = async () => {
  const existingCommission = await getCurrentCommissionRate();

  if (!existingCommission) {
    throw new AppError(httpStatus.NOT_FOUND, 'Commission rate not found');
  }

  await commissionModel.delete({
    where: {
      id: COMMISSION_RATE_ID,
    },
  });

  return {
    success: true,
    message: 'Commission rate deleted successfully',
  };
};

export const commissionServices = {
  getCurrentCommissionRate,
  getActiveCommissionRateValue,
  setCommissionRate,
  deleteCommissionRate,
};
