import prisma from '../../shared/prisma';
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import { ISafetyToolkitSection } from './safetyToolkit.interface';

const createSection = async (payload: ISafetyToolkitSection) => {
  return prisma.safetyToolkitSection.create({
    data: { title: payload.title, items: payload.items },
  });
};
const getAllSections = async () => {
  return prisma.safetyToolkitSection.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
};
const ensureSection = async (id: string) => {
  const section = await prisma.safetyToolkitSection.findUnique({
    where: { id },
  });
  if (!section)
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Safety toolkit section not found',
    );
};
const updateSection = async (
  id: string,
  payload: Partial<ISafetyToolkitSection>,
) => {
  await ensureSection(id);
  return prisma.safetyToolkitSection.update({ where: { id }, data: payload });
};
const deleteSection = async (id: string) => {
  await ensureSection(id);
  await prisma.safetyToolkitSection.delete({ where: { id } });
  return {};
};
export const safetyToolkitServices = {
  createSection,
  getAllSections,
  updateSection,
  deleteSection,
};
