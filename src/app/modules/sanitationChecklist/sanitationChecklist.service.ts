import prisma from '../../shared/prisma';
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import { ISanitationChecklist } from './sanitationChecklist.interface';

const ensureExists = async (id: string) => {
  const entry = await prisma.sanitationChecklist.findUnique({ where: { id } });
  if (!entry)
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Sanitation checklist item not found',
    );
};
const create = async (payload: ISanitationChecklist) => {
  return prisma.sanitationChecklist.create({ data: payload });
};
const getAll = async () => {
  return prisma.sanitationChecklist.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
};
const update = async (id: string, payload: Partial<ISanitationChecklist>) => {
  await ensureExists(id);
  return prisma.sanitationChecklist.update({ where: { id }, data: payload });
};
const remove = async (id: string) => {
  await ensureExists(id);
  await prisma.sanitationChecklist.delete({ where: { id } });
  return {};
};

// One current progress record per user and checklist item.
const saveMyProgress = async (
  userId: string,
  checklistId: string,
  payload: { isCompleted: boolean; photos?: string[] },
) => {
  await ensureExists(checklistId);
  const key = { userId, checklistId };
  const data = {
    isCompleted: payload.isCompleted,
    completedAt: payload.isCompleted ? new Date() : null,
    ...(payload.photos !== undefined ? { photos: payload.photos } : {}),
  };
  return prisma.sanitationChecklistProgress.upsert({
    where: { userId_checklistId: key },
    create: { ...key, ...data },
    update: data,
  });
};

const getMyProgress = async (userId: string) => {
  const entries = await prisma.sanitationChecklist.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      progress: {
        where: { userId },
        select: { isCompleted: true, completedAt: true, photos: true },
      },
    },
  });
  return entries.map(({ progress, ...entry }) => ({
    ...entry,
    isCompleted: progress[0]?.isCompleted ?? false,
    completedAt: progress[0]?.completedAt ?? null,
    photos: progress[0]?.photos ?? [],
  }));
};

const isFullyChecked = async (userId: string) => {
  const [total, incomplete] = await Promise.all([
    prisma.sanitationChecklist.count(),
    prisma.sanitationChecklist.count({
      where: { progress: { none: { userId, isCompleted: true } } },
    }),
  ]);
  return total > 0 && incomplete === 0;
};

export const sanitationChecklistServices = {
  isFullyChecked,
  create,
  getAll,
  update,
  remove,
  saveMyProgress,
  getMyProgress,
};
