import prisma from '../../shared/prisma';
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import { paginationHelper } from '../../helpers/pagination.helpers';
import { ICreateFeedback, IFeedbackQuery } from './feedback.interface';

const participantSelect = {
  id: true,
  name: true,
  profilePicture: true,
} as const;
const participants = {
  giver: { select: participantSelect },
  receiver: { select: participantSelect },
};

const ensureReceiver = async (receiverId: string) => {
  const receiver = await prisma.user.findFirst({
    where: { id: receiverId, isDeleted: false },
    select: { id: true },
  });
  if (!receiver)
    throw new AppError(httpStatus.NOT_FOUND, 'Feedback receiver not found');
};

const createFeedback = async (giverId: string, payload: ICreateFeedback) => {
  if (giverId.toLowerCase() === payload.receiverId.toLowerCase()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot give feedback to yourself',
    );
  }
  await ensureReceiver(payload.receiverId);
  return prisma.feedback.create({
    data: {
      giverId,
      receiverId: payload.receiverId,
      rating: payload.rating,
      text: payload.text,
      photo: payload.photo,
    },
    include: participants,
  });
};

const getFeedbackByUserId = async (
  receiverId: string,
  query: IFeedbackQuery,
) => {
  await ensureReceiver(receiverId);
  const { page, limit, skip } = paginationHelper.calculatePagination(query);
  const where = { receiverId };
  const [data, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: participants,
    }),
    prisma.feedback.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

export const feedbackServices = { createFeedback, getFeedbackByUserId };
