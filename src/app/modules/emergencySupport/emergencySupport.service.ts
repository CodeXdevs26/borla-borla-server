import AppError from 'app/error/AppError';
import prisma from 'app/shared/prisma';
import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import {
  ICreateEmergencySupport,
  IEmergencySupportQuery,
  IUpdateEmergencySupportStatus,
} from './emergencySupport.interface';

const createEmergencySupport = async (
  userId: string,
  payload: ICreateEmergencySupport,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phoneNumber: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile not found');
  }

  const { phoneNumber, ...incident } = payload;
  const contactPhoneNumber = phoneNumber || user.phoneNumber;
  if (!contactPhoneNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please add a phone number to your profile before requesting emergency support',
    );
  }

  return prisma.emergencySupport.create({
    data: {
      userId,
      ...incident,
      location: payload.location as unknown as Prisma.InputJsonValue,
      contactName: user.name,
      contactPhoneNumber,
      contactEmail: user.email,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
  });
};

const getEmergencySupports = async (query: IEmergencySupportQuery) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const requestedLimit = Number(query.limit) > 0 ? Number(query.limit) : 10;
  const limit = Math.min(requestedLimit, 100);
  const skip = (page - 1) * limit;
  const where = query.status ? { status: query.status } : {};

  const [data, total] = await Promise.all([
    prisma.emergencySupport.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            role: true,
          },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
    prisma.emergencySupport.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const updateEmergencySupportStatus = async (
  id: string,
  adminId: string,
  payload: IUpdateEmergencySupportStatus,
) => {
  const incident = await prisma.emergencySupport.findUnique({ where: { id } });

  if (!incident) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Emergency support incident not found',
    );
  }

  return prisma.emergencySupport.update({
    where: { id },
    data: {
      status: payload.status,
      resolvedAt: payload.status === 'resolved' ? new Date() : null,
      resolvedById: payload.status === 'resolved' ? adminId : null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      resolvedBy: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
};

export const emergencySupportServices = {
  createEmergencySupport,
  getEmergencySupports,
  updateEmergencySupportStatus,
};
