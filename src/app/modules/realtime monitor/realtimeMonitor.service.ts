import prisma from 'app/shared/prisma';
import {
  IRealtimeMonitorStats,
  IRealtimeRiderListResponse,
  IRealtimeRiderItem,
  IRealtimeActivityResponse,
  IRealtimeActivityItem,
} from './realtimeMonitor.interface';
import {
  calculateAverageWaitTimeMinutes,
  createStatCard,
  getLowerIsBetterImprovementPercent,
  getPercentChange,
  getRelativeTimeLabel,
  mapRiderRealtimeStatus,
  toActivityProgress,
  toActivityStatus,
} from './realtimeMonitor.helpers';

import { bookingStatus } from '@prisma/client';

const ONGOING_STATUSES: bookingStatus[] = [
  bookingStatus.accepted,
  bookingStatus.arrived_pickup,
  bookingStatus.garbage_ready,
  bookingStatus.garbage_collected,
  bookingStatus.payment_collected,
  bookingStatus.heading_to_station,
  bookingStatus.in_progress,
  bookingStatus.arrived_dropoff,
  bookingStatus.awaiting_payment,
];

const getRealtimeMonitorStats = async (): Promise<IRealtimeMonitorStats> => {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const [
    ongoingRides,
    completedToday,
    acceptedTodayAvg,
    onlineRiders,
    busyRiders,
    ongoingRidesYesterday,
    completedYesterday,
    acceptedYesterdayAvg,
    onlineRidersYesterday,
    busyRidersYesterday,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        status: {
          in: ONGOING_STATUSES,
        },
      },
    }),
    prisma.booking.count({
      where: {
        status: bookingStatus.completed,
        completedAt: {
          gte: startOfToday,
        },
      },
    }),
    prisma.booking.findMany({
      where: {
        acceptedAt: { not: null, gte: startOfToday },
      },
      select: {
        requestedAt: true,
        acceptedAt: true,
      },
    }),
    prisma.user.count({
      where: {
        role: 'rider',
        riderVerified: true,
        onlineStatus: 'online',
        isDeleted: false,
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ONGOING_STATUSES },
        riderId: { not: null },
      },
      select: {
        riderId: true,
      },
    }),
    prisma.booking.count({
      where: {
        status: {
          in: ONGOING_STATUSES,
        },
        updatedAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    }),
    prisma.booking.count({
      where: {
        status: bookingStatus.completed,
        completedAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    }),
    prisma.booking.findMany({
      where: {
        acceptedAt: {
          not: null,
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
      select: {
        requestedAt: true,
        acceptedAt: true,
      },
    }),
    prisma.user.count({
      where: {
        role: 'rider',
        riderVerified: true,
        onlineStatus: 'online',
        isDeleted: false,
        updatedAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ONGOING_STATUSES },
        riderId: { not: null },
        updatedAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
      select: {
        riderId: true,
      },
    }),
  ]);

  const busyRiderIdSet = new Set(
    busyRiders.map(item => item.riderId).filter(Boolean) as string[],
  );

  const avgWaitTimeMinutes = calculateAverageWaitTimeMinutes(acceptedTodayAvg);
  const avgWaitTimeMinutesYesterday =
    calculateAverageWaitTimeMinutes(acceptedYesterdayAvg);

  const availableRiders = Math.max(onlineRiders - busyRiderIdSet.size, 0);
  const busyRiderYesterdayIdSet = new Set(
    busyRidersYesterday.map(item => item.riderId).filter(Boolean) as string[],
  );
  const availableRidersYesterday = Math.max(
    onlineRidersYesterday - busyRiderYesterdayIdSet.size,
    0,
  );

  const ongoingRidesGrowth = getPercentChange(
    ongoingRides,
    ongoingRidesYesterday,
  );
  const availableRidersGrowth = getPercentChange(
    availableRiders,
    availableRidersYesterday,
  );
  const completedTodayGrowth = getPercentChange(
    completedToday,
    completedYesterday,
  );
  const avgWaitTimeImprovementGrowth = getLowerIsBetterImprovementPercent(
    avgWaitTimeMinutes,
    avgWaitTimeMinutesYesterday,
  );

  const ongoingRidesIncrease = ongoingRides > ongoingRidesYesterday;
  const availableRidersIncrease = availableRiders > availableRidersYesterday;
  const completedTodayIncrease = completedToday > completedYesterday;
  const avgWaitTimeMinutesIncrease =
    avgWaitTimeMinutes > avgWaitTimeMinutesYesterday;

  return {
    ongoingRides: createStatCard(
      ongoingRides.toString(),
      ongoingRidesIncrease,
      ongoingRidesGrowth,
    ),
    availableRiders: createStatCard(
      availableRiders.toString(),
      availableRidersIncrease,
      availableRidersGrowth,
    ),
    completedToday: createStatCard(
      completedToday.toString(),
      completedTodayIncrease,
      completedTodayGrowth,
    ),
    avgWaitTimeMinutes: createStatCard(
      `${avgWaitTimeMinutes} min`,
      avgWaitTimeMinutesIncrease,
      avgWaitTimeImprovementGrowth,
      'Min Improvement',
    ),
  };
};

const getRealtimeRiders = async (query: {
  page?: string;
  limit?: string;
}): Promise<IRealtimeRiderListResponse> => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
  const skip = (page - 1) * limit;

  const [riders, busyRiders, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: 'rider',
        riderVerified: true,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        profilePicture: true,
        onlineStatus: true,
        location: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ONGOING_STATUSES },
        riderId: { not: null },
      },
      select: {
        riderId: true,
      },
    }),
    prisma.user.count({
      where: {
        role: 'rider',
        riderVerified: true,
        isDeleted: false,
      },
    }),
  ]);

  const busyRiderIdSet = new Set(
    busyRiders.map(item => item.riderId).filter(Boolean) as string[],
  );

  const data: IRealtimeRiderItem[] = riders.map(rider => {
    const isBusy = busyRiderIdSet.has(rider.id);
    const mappedStatus = mapRiderRealtimeStatus(rider.onlineStatus, isBusy);

    const coordinates =
      rider.location &&
      typeof rider.location === 'object' &&
      Array.isArray((rider.location as any).coordinates)
        ? (rider.location as any).coordinates
        : [];

    const longitude = coordinates.length >= 2 ? Number(coordinates[0]) : null;
    const latitude = coordinates.length >= 2 ? Number(coordinates[1]) : null;

    return {
      id: rider.id,
      name: rider.name,
      avatar: rider.profilePicture || null,
      status: mappedStatus.status,
      mapStatus: mappedStatus.mapStatus,
      latitude,
      longitude,
    };
  });

  return {
    riders: data,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getRealtimeLiveLocations = async () => {
  const result = await getRealtimeRiders({ page: '1', limit: '1000' });
  return result.riders.filter(
    rider => rider.latitude !== null && rider.longitude !== null,
  );
};

const getRealtimeActivities = async (query: {
  page?: string;
  limit?: string;
}): Promise<IRealtimeActivityResponse> => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
  const skip = (page - 1) * limit;

  const whereClause = {
    status: {
      in: [
        bookingStatus.pending,
        bookingStatus.accepted,
        bookingStatus.arrived_pickup,
        bookingStatus.garbage_ready,
        bookingStatus.garbage_collected,
        bookingStatus.payment_collected,
        bookingStatus.heading_to_station,
        bookingStatus.in_progress,
        bookingStatus.arrived_dropoff,
        bookingStatus.awaiting_payment,
      ],
    },
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        pickupAddress: true,
        wasteCategory: true,
        wasteSize: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
          },
        },
        rider: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.booking.count({
      where: whereClause,
    }),
  ]);

  const activities: IRealtimeActivityItem[] = bookings.map(booking => ({
    id: booking.id,
    status: toActivityStatus(booking.status),
    assignee: booking.user.name,
    time: getRelativeTimeLabel(booking.updatedAt),
    rider:
      booking.rider?.name ||
      (booking.status === bookingStatus.pending ? 'Unassigned' : 'Assigned'),
    location: booking.pickupAddress,
    type:
      booking.wasteCategory.charAt(0).toUpperCase() +
      booking.wasteCategory.slice(1),
    weight: `${booking.wasteSize} kg`,
    progress: toActivityProgress(booking.status),
  }));

  return {
    activities,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

export const realtimeMonitorService = {
  getRealtimeMonitorStats,
  getRealtimeRiders,
  getRealtimeLiveLocations,
  getRealtimeActivities,
};
