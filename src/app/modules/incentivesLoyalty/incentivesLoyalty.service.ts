import { bookingStatus } from '@prisma/client';
import prisma from 'app/shared/prisma';
import {
  ICustomerLoyaltyBadge,
  ICustomerLoyaltyEntry,
  ICustomerLoyaltyQuery,
  IRiderLoyaltyCard,
  IZoneRiderLoyaltyCardsQuery,
} from './incentivesLoyalty.interface';

const DAILY_TARGET_RIDES = 25;
type TRiderBonusFilter = 'today' | 'weekly' | 'monthly';

const RIDER_BONUS_JOB_TARGETS: Record<TRiderBonusFilter, number> = {
  today: Number(process.env.BONUS_DAILY_JOB_TARGET) || 5,
  weekly: Number(process.env.BONUS_WEEKLY_JOB_TARGET) || 10,
  monthly: Number(process.env.BONUS_MONTHLY_JOB_TARGET) || 40,
};

const getRiderBonusDateRange = (filter: TRiderBonusFilter) => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCHours(0, 0, 0, 0);

  if (filter === 'weekly') {
    startDate.setUTCDate(startDate.getUTCDate() - 6);
  } else if (filter === 'monthly') {
    startDate.setUTCDate(startDate.getUTCDate() - 29);
  }

  return { startDate, endDate };
};

const getRiderBonuses = async (
  riderId: string,
  filter: TRiderBonusFilter = 'today',
) => {
  const { startDate, endDate } = getRiderBonusDateRange(filter);
  const targetJobs = RIDER_BONUS_JOB_TARGETS[filter];

  const [completedJobs, bonusTransactions] = await Promise.all([
    prisma.booking.count({
      where: {
        riderId,
        status: bookingStatus.completed,
        completedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId: riderId,
        type: 'BONUS',
        status: 'success',
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        amount: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  const totalBonuses = bonusTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const goalTitle =
    filter === 'today'
      ? 'Daily Goal'
      : filter === 'weekly'
        ? 'Weekly Goal'
        : 'Monthly Goal';

  return {
    goalTitle,
    completedJobs,
    targetJobs,
    progressPercentage: Math.min(
      100,
      Number(((completedJobs / targetJobs) * 100).toFixed(2)),
    ),
    totalBonuses: Number(totalBonuses.toFixed(2)),
    recentBonuses: bonusTransactions.slice(0, 4).map(transaction => ({
      title: transaction.description || 'Bonus',
      amount: Number(transaction.amount.toFixed(2)),
      date: transaction.createdAt,
      paymentMethod: 'Mobile Money',
    })),
  };
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};

const getZoneRiderLoyaltyCards = async (query: IZoneRiderLoyaltyCardsQuery) => {
  const { zoneId, zoneName, limit: limitParam } = query;

  const limit =
    typeof limitParam === 'string'
      ? parseInt(limitParam, 10)
      : typeof limitParam === 'number'
        ? limitParam
        : undefined;

  let resolvedZoneId = zoneId;

  if (!resolvedZoneId && zoneName) {
    const zone = await prisma.zone.findFirst({
      where: {
        isDeleted: false,
        name: {
          contains: zoneName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (!zone) {
      return [];
    }

    resolvedZoneId = zone.id;
  }

  const riders = await prisma.user.findMany({
    where: {
      ...(resolvedZoneId
        ? { zoneId: resolvedZoneId }
        : { zoneId: { not: null } }),
      role: 'rider',
      riderVerified: true,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!riders.length) {
    return [];
  }

  const riderIds = riders.map(rider => rider.id);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  const [totalCompletedRides, todayCompletedRides, ratings] = await Promise.all(
    [
      prisma.booking.groupBy({
        by: ['riderId'],
        where: {
          riderId: {
            in: riderIds,
          },
          status: bookingStatus.completed,
        },
        _count: {
          id: true,
        },
      }),
      prisma.booking.groupBy({
        by: ['riderId'],
        where: {
          riderId: {
            in: riderIds,
          },
          status: bookingStatus.completed,
          completedAt: {
            gte: dayStart,
            lt: nextDayStart,
          },
        },
        _count: {
          id: true,
        },
      }),
      prisma.rating.findMany({
        where: {
          booking: {
            riderId: {
              in: riderIds,
            },
            status: bookingStatus.completed,
          },
        },
        select: {
          rating: true,
          booking: {
            select: {
              riderId: true,
            },
          },
        },
      }),
    ],
  );

  const totalRideMap = new Map(
    totalCompletedRides.map(item => [item.riderId!, item._count.id]),
  );

  const todayRideMap = new Map(
    todayCompletedRides.map(item => [item.riderId!, item._count.id]),
  );

  const ratingSummaryMap = new Map<string, { sum: number; count: number }>();

  ratings.forEach(item => {
    const riderId = item.booking.riderId;
    if (!riderId) {
      return;
    }

    const current = ratingSummaryMap.get(riderId) || { sum: 0, count: 0 };

    ratingSummaryMap.set(riderId, {
      sum: current.sum + item.rating,
      count: current.count + 1,
    });
  });

  const riderCards: IRiderLoyaltyCard[] = riders.map(rider => {
    const rideCount = totalRideMap.get(rider.id) || 0;
    const todayRides = todayRideMap.get(rider.id) || 0;
    const extraRidesCompleted = todayRides - DAILY_TARGET_RIDES;

    const ratingSummary = ratingSummaryMap.get(rider.id);
    const rating = ratingSummary
      ? Number((ratingSummary.sum / ratingSummary.count).toFixed(1))
      : 0;

    return {
      name: rider.name,
      riderId: rider.id,
      initials: getInitials(rider.name),
      rideCount,
      rating,
      todayRides,
      totalRides: DAILY_TARGET_RIDES,
      extraRidesCompleted,
      status:
        todayRides >= DAILY_TARGET_RIDES ? 'bonus-eligible' : 'in-progress',
    };
  });

  const sortedCards = riderCards.sort(
    (a, b) =>
      b.todayRides - a.todayRides ||
      b.extraRidesCompleted - a.extraRidesCompleted ||
      b.rideCount - a.rideCount ||
      b.rating - a.rating,
  );

  return typeof limit === 'number' && limit > 0
    ? sortedCards.slice(0, limit)
    : sortedCards;
};

const getCustomerLoyalty = async (query: ICustomerLoyaltyQuery) => {
  const { search, page: pageParam = 1, limit: limitParam = 10 } = query;

  const page =
    typeof pageParam === 'string' ? parseInt(pageParam, 10) : pageParam;
  const limit =
    typeof limitParam === 'string' ? parseInt(limitParam, 10) : limitParam;

  const whereUsers: any = {
    role: { in: ['user', 'institute'] },
    isDeleted: false,
  };

  if (search) {
    whereUsers.OR = [
      {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        phoneNumber: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const customers = await prisma.user.findMany({
    where: whereUsers,
    select: {
      id: true,
      name: true,
      profilePicture: true,
    },
  });

  if (!customers.length) {
    return {
      data: [] as ICustomerLoyaltyEntry[],
      pagination: {
        total: 0,
        page,
        limit,
        totalPage: 0,
      },
    };
  }

  const customerIds = customers.map(customer => customer.id);

  const [createdBookings, completedBookings, ratings] = await Promise.all([
    prisma.booking.groupBy({
      by: ['userId'],
      where: {
        userId: {
          in: customerIds,
        },
      },
      _count: {
        id: true,
      },
    }),
    prisma.booking.groupBy({
      by: ['userId'],
      where: {
        userId: {
          in: customerIds,
        },
        status: bookingStatus.completed,
      },
      _count: {
        id: true,
      },
    }),
    prisma.rating.findMany({
      where: {
        booking: {
          userId: {
            in: customerIds,
          },
          status: bookingStatus.completed,
        },
      },
      select: {
        rating: true,
        booking: {
          select: {
            userId: true,
          },
        },
      },
    }),
  ]);

  const createdMap = new Map(
    createdBookings.map(item => [item.userId, item._count.id]),
  );

  const completedMap = new Map(
    completedBookings.map(item => [item.userId, item._count.id]),
  );

  const ratingSummaryMap = new Map<string, { sum: number; count: number }>();

  ratings.forEach(item => {
    const customerId = item.booking.userId;
    const current = ratingSummaryMap.get(customerId) || { sum: 0, count: 0 };

    ratingSummaryMap.set(customerId, {
      sum: current.sum + item.rating,
      count: current.count + 1,
    });
  });

  const rankedCustomers = customers
    .map(customer => {
      const totalBookingsCreated = createdMap.get(customer.id) || 0;
      const completedCount = completedMap.get(customer.id) || 0;
      const ratingSummary = ratingSummaryMap.get(customer.id);

      const rating = ratingSummary
        ? Number((ratingSummary.sum / ratingSummary.count).toFixed(1))
        : 0;

      const points = completedCount * 10 + totalBookingsCreated;

      const badges: ICustomerLoyaltyBadge[] = [];
      if (completedCount >= 100) {
        badges.push({
          label: '100 Rides',
          variant: 'info',
        });
      }

      return {
        id: customer.id,
        name: customer.name,
        profilePicture: customer.profilePicture,
        completedBookings: completedCount,
        totalBookingsCreated,
        points,
        rating,
        badges,
      };
    })
    .filter(customer => customer.totalBookingsCreated > 0)
    .sort(
      (a, b) =>
        b.completedBookings - a.completedBookings ||
        b.totalBookingsCreated - a.totalBookingsCreated,
    )
    .map((customer, index) => {
      const rank = index + 1;

      const badges = [...customer.badges];
      if (rank === 1) {
        badges.unshift({
          label: 'Top Performer',
          variant: 'primary',
        });
      }

      return {
        id: customer.id,
        rank,
        name: customer.name,
        profilePicture: customer.profilePicture,
        points: customer.points,
        rides: customer.completedBookings,
        rating: customer.rating,
        badges,
        totalBookingsCreated: customer.totalBookingsCreated,
        completedBookings: customer.completedBookings,
      } as ICustomerLoyaltyEntry;
    });

  const total = rankedCustomers.length;
  const totalPage = total > 0 ? Math.ceil(total / limit) : 0;
  const skip = (page - 1) * limit;

  return {
    data: rankedCustomers.slice(skip, skip + limit),
    pagination: {
      total,
      page,
      limit,
      totalPage,
    },
  };
};

export const incentivesLoyaltyServices = {
  getRiderBonuses,
  getZoneRiderLoyaltyCards,
  getCustomerLoyalty,
};
