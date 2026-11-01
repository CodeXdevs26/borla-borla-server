import prisma from 'app/shared/prisma';
import { IReferralHistoryQuery } from './referral.interface';

const getMyReferralHistory = async (
  userId: string,
  query: IReferralHistoryQuery,
) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const requestedLimit = Number(query.limit) > 0 ? Number(query.limit) : 10;
  const limit = Math.min(requestedLimit, 100);
  const skip = (page - 1) * limit;

  const [user, referrals, total] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        referralProfile: {
          select: { code: true },
        },
        referredBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            referralProfile: {
              select: { code: true },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        referredById: userId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({
      where: {
        referredById: userId,
        isDeleted: false,
      },
    }),
  ]);

  return {
    data: {
      referralCode: user.referralProfile?.code || null,
      referredBy: user.referredBy
        ? {
            id: user.referredBy.id,
            name: user.referredBy.name,
            email: user.referredBy.email,
            role: user.referredBy.role,
            referralCode: user.referredBy.referralProfile?.code || null,
          }
        : null,
      totalReferrals: total,
      referrals,
    },
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

export const referralServices = {
  getMyReferralHistory,
};
