import httpStatus from 'http-status';
import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';

type ItemInput = {
  name: string;
  description?: string;
  esgDimension?: string;
  eligibleRoles: string[];
  pointsCost: number;
  stockQuantity: number;
  isActive?: boolean;
};

const itemSelect = {
  id: true,
  name: true,
  description: true,
  esgDimension: true,
  eligibleRoles: true,
  pointsCost: true,
  stockQuantity: true,
  claimedQuantity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const getCatalogueForUser = async (userId: string, includeInactive = false) => {
  const [user, items, claims] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId, isDeleted: false },
      select: { id: true, role: true, rewardPoints: true },
    }),
    prisma.rewardCatalogueItem.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: itemSelect,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.rewardClaim.findMany({
      where: { userId, status: { in: ['pending', 'approved'] } },
      select: { itemId: true, status: true },
    }),
  ]);

  const claimStatusByItem = new Map(claims.map(claim => [claim.itemId, claim.status]));
  return {
    rewardPoints: user.rewardPoints,
    items: items.map(item => {
      const claimStatus = claimStatusByItem.get(item.id) || null;
      const remainingQuantity = Math.max(0, item.stockQuantity - item.claimedQuantity);
      const roleEligible = item.eligibleRoles.includes(user.role);
      const enoughPoints = user.rewardPoints >= item.pointsCost;
      const isClaimable =
        item.isActive &&
        roleEligible &&
        remainingQuantity > 0 &&
        enoughPoints &&
        !claimStatus;
      return {
        ...item,
        remainingQuantity,
        claimStatus,
        isClaimable,
        ineligibilityReason: isClaimable
          ? null
          : claimStatus === 'approved'
            ? 'already_claimed'
            : claimStatus === 'pending'
              ? 'claim_pending'
              : !item.isActive
                ? 'item_inactive'
                : !roleEligible
                  ? 'role_not_eligible'
                  : remainingQuantity === 0
                    ? 'out_of_stock'
                    : 'insufficient_points',
      };
    }),
  };
};

const createItem = (payload: ItemInput) => prisma.rewardCatalogueItem.create({ data: payload });

const updateItem = async (itemId: string, payload: Partial<ItemInput>) => {
  const item = await prisma.rewardCatalogueItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, 'Reward item not found');
  if (payload.stockQuantity !== undefined && payload.stockQuantity < item.claimedQuantity) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Stock cannot be lower than the already claimed quantity');
  }
  return prisma.rewardCatalogueItem.update({ where: { id: itemId }, data: payload });
};

const removeItem = async (itemId: string) => {
  const claims = await prisma.rewardClaim.count({ where: { itemId } });
  if (claims) {
    throw new AppError(httpStatus.CONFLICT, 'This reward has claim history and cannot be deleted; deactivate it instead');
  }
  await prisma.rewardCatalogueItem.delete({ where: { id: itemId } });
  return null;
};

const requestClaim = async (userId: string, itemId: string) => {
  const [user, item, activeClaim] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId, isDeleted: false }, select: { role: true, rewardPoints: true } }),
    prisma.rewardCatalogueItem.findUnique({ where: { id: itemId } }),
    prisma.rewardClaim.findFirst({ where: { userId, itemId, status: { in: ['pending', 'approved'] } } }),
  ]);
  if (!item || !item.isActive) throw new AppError(httpStatus.NOT_FOUND, 'Reward item is unavailable');
  if (activeClaim) throw new AppError(httpStatus.CONFLICT, 'You already have a pending or approved claim for this item');
  if (!item.eligibleRoles.includes(user.role)) throw new AppError(httpStatus.FORBIDDEN, 'You are not eligible for this reward item');
  if (item.claimedQuantity >= item.stockQuantity) throw new AppError(httpStatus.CONFLICT, 'Reward item is out of stock');
  if (user.rewardPoints < item.pointsCost) throw new AppError(httpStatus.BAD_REQUEST, 'You do not have enough reward points');
  return prisma.rewardClaim.create({ data: { userId, itemId, pointsCost: item.pointsCost } });
};

const getMyClaims = async (userId: string) => prisma.rewardClaim.findMany({
  where: { userId },
  include: { item: { select: itemSelect } },
  orderBy: { requestedAt: 'desc' },
});

const approveClaim = async (claimId: string, reviewerId: string, reviewNote?: string) =>
  prisma.$transaction(async tx => {
    const claim = await tx.rewardClaim.findUnique({
      where: { id: claimId },
      include: { item: true, user: { select: { rewardPoints: true } } },
    });
    if (!claim) throw new AppError(httpStatus.NOT_FOUND, 'Reward claim not found');
    if (claim.status !== 'pending') throw new AppError(httpStatus.CONFLICT, 'Only pending claims can be approved');
    if (!claim.item.isActive) throw new AppError(httpStatus.CONFLICT, 'Reward item is inactive');
    if (claim.user.rewardPoints < claim.pointsCost) throw new AppError(httpStatus.CONFLICT, 'User no longer has enough reward points');

    const stockUpdate = await tx.rewardCatalogueItem.updateMany({
      where: { id: claim.itemId, claimedQuantity: claim.item.claimedQuantity },
      data: { claimedQuantity: { increment: 1 } },
    });
    if (stockUpdate.count !== 1 || claim.item.claimedQuantity >= claim.item.stockQuantity) {
      throw new AppError(httpStatus.CONFLICT, 'Reward item is out of stock');
    }

    const pointsUpdate = await tx.user.updateMany({
      where: { id: claim.userId, rewardPoints: { gte: claim.pointsCost } },
      data: { rewardPoints: { decrement: claim.pointsCost } },
    });
    if (pointsUpdate.count !== 1) throw new AppError(httpStatus.CONFLICT, 'User no longer has enough reward points');

    return tx.rewardClaim.update({
      where: { id: claimId },
      data: { status: 'approved', reviewedById: reviewerId, reviewNote, reviewedAt: new Date() },
      include: { item: { select: itemSelect }, user: { select: { id: true, name: true, rewardPoints: true } } },
    });
  });

const rejectClaim = async (claimId: string, reviewerId: string, reviewNote?: string) => {
  const claim = await prisma.rewardClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw new AppError(httpStatus.NOT_FOUND, 'Reward claim not found');
  if (claim.status !== 'pending') throw new AppError(httpStatus.CONFLICT, 'Only pending claims can be rejected');
  return prisma.rewardClaim.update({
    where: { id: claimId },
    data: { status: 'rejected', reviewedById: reviewerId, reviewNote, reviewedAt: new Date() },
  });
};

const getAdminClaims = async () => prisma.rewardClaim.findMany({
  include: {
    item: { select: itemSelect },
    user: { select: { id: true, name: true, email: true, phoneNumber: true, role: true, rewardPoints: true } },
    reviewedBy: { select: { id: true, name: true } },
  },
  orderBy: { requestedAt: 'desc' },
});

export const rewardCatalogueServices = {
  getCatalogueForUser,
  createItem,
  updateItem,
  removeItem,
  requestClaim,
  getMyClaims,
  approveClaim,
  rejectClaim,
  getAdminClaims,
};
