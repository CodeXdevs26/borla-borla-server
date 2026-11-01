import prisma from 'app/shared/prisma';
import { IPageContentResponse } from './contentPages.interface';

const getOrCreateContents = async () => {
  const contents = await (prisma.contents as any).findFirst();
  if (contents) return contents;

  return (prisma.contents as any).create({
    data: {
      aboutUs: '',
      termsAndCondition: '',
      privacyPolicy: '',
    },
  });
};

const getPageContent = async (
  key: 'aboutUs' | 'termsAndCondition' | 'privacyPolicy',
): Promise<IPageContentResponse> => {
  const contents = await getOrCreateContents();
  const normalizedContents = contents as Record<string, string | null>;

  return {
    key,
    content: normalizedContents[key] ?? null,
  };
};

const updatePageContent = async (
  key: 'aboutUs' | 'termsAndCondition' | 'privacyPolicy',
  content: string,
): Promise<IPageContentResponse> => {
  const contents = await getOrCreateContents();

  const updated = await (prisma.contents as any).update({
    where: { id: contents.id },
    data: { [key]: content },
  });

  const normalizedUpdated = updated as Record<string, string | null>;

  return {
    key,
    content: normalizedUpdated[key] ?? null,
  };
};

export const contentPagesService = {
  getPageContent,
  updatePageContent,
};
