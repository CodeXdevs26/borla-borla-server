import prisma from 'app/shared/prisma';
import { bookingStatus } from '@prisma/client';
import {
  IDashboardQuery,
  IPickupsPerHour,
  IAvgPickupTimeByDay,
  ICompletionRate,
  IZoneHealth,
  IPickupSuccessRate,
  IPickupSuccessRateQuery,
  IZoneRanking,
  ITopRider,
  IZoneTopPerformingRider,
  IRankingQuery,
  IZoneTopPerformingRidersQuery,
  IZoneDetails,
  IZoneTrendPoint,
  IZoneQuery,
  IZoneComparison,
  IZoneStat,
  IRiderListItem,
  IRiderListQuery,
} from './operations.interface';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const startOfMonth = (date: Date) => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const getDateKey = (date: Date, granularity: 'day' | 'month') => {
  if (granularity === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getDateLabel = (date: Date, granularity: 'day' | 'month') => {
  if (granularity === 'month') {
    return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
  }

  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
};

const resolvePickupSuccessRateWindow = async (
  query: IPickupSuccessRateQuery,
) => {
  const { period = 'all-time', startDate, endDate, zoneId } = query;
  const now = new Date();
  const resolvedEnd = endDate ? new Date(endDate) : now;

  if (startDate) {
    return {
      start: new Date(startDate),
      end: resolvedEnd,
      granularity:
        period === 'weekly' || period === 'monthly' ? 'day' : 'month',
    } as const;
  }

  if (period === 'weekly') {
    return {
      start: startOfDay(addDays(resolvedEnd, -6)),
      end: resolvedEnd,
      granularity: 'day' as const,
    };
  }

  if (period === 'monthly') {
    return {
      start: startOfDay(addDays(resolvedEnd, -29)),
      end: resolvedEnd,
      granularity: 'day' as const,
    };
  }

  if (period === 'yearly') {
    return {
      start: startOfMonth(addMonths(resolvedEnd, -11)),
      end: resolvedEnd,
      granularity: 'month' as const,
    };
  }

  const earliestBooking = await prisma.booking.findFirst({
    where: {
      status: {
        not: bookingStatus.cancelled,
      },
      ...(zoneId
        ? {
            rider: {
              zoneId,
            },
          }
        : {}),
    },
    orderBy: {
      requestedAt: 'asc',
    },
    select: {
      requestedAt: true,
    },
  });

  return {
    start: earliestBooking?.requestedAt
      ? startOfMonth(earliestBooking.requestedAt)
      : startOfMonth(resolvedEnd),
    end: resolvedEnd,
    granularity: 'month' as const,
  };
};

const buildPickupSuccessBuckets = (
  start: Date,
  end: Date,
  granularity: 'day' | 'month',
) => {
  const buckets: Array<{
    key: string;
    day: string;
    total: number;
    completed: number;
  }> = [];

  const cursor =
    granularity === 'month' ? startOfMonth(start) : startOfDay(start);
  const final = granularity === 'month' ? startOfMonth(end) : startOfDay(end);

  while (cursor <= final) {
    buckets.push({
      key: getDateKey(cursor, granularity),
      day: getDateLabel(cursor, granularity),
      total: 0,
      completed: 0,
    });

    if (granularity === 'month') {
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(1);
    } else {
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return buckets;
};

// Get pickups per hour
const getPickupsPerHour = async (query: IDashboardQuery) => {
  const { period = 'daily', startDate, endDate, zoneId } = query;

  // Calculate date range
  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'daily':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      default:
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
    }
  }

  const whereConditions: any = {
    requestedAt: {
      gte: start,
      lte: end,
    },
    status: {
      in: [
        'completed',
        'in_progress',
        'arrived_pickup',
        'garbage_ready',
        'garbage_collected',
        'arrived_dropoff',
      ],
    },
  };

  if (zoneId) {
    whereConditions.rider = {
      zoneId: zoneId,
    };
  }

  const bookings = await prisma.booking.findMany({
    where: whereConditions,
    select: {
      requestedAt: true,
    },
  });

  // Group by hour
  const hourlyData: { [key: string]: number } = {};
  const hours = [
    '6AM',
    '7AM',
    '8AM',
    '9AM',
    '10AM',
    '11AM',
    '12PM',
    '1PM',
    '2PM',
    '3PM',
    '4PM',
    '5PM',
    '6PM',
    '7PM',
    '8PM',
  ];

  // Initialize all hours with 0
  hours.forEach(hour => {
    hourlyData[hour] = 0;
  });

  bookings.forEach(booking => {
    const hour = booking.requestedAt.getHours();
    let hourLabel = '';

    if (hour >= 6 && hour < 12) {
      hourLabel = `${hour}AM`;
    } else if (hour === 12) {
      hourLabel = '12PM';
    } else if (hour > 12 && hour <= 20) {
      hourLabel = `${hour - 12}PM`;
    }

    if (hourLabel && hourlyData.hasOwnProperty(hourLabel)) {
      hourlyData[hourLabel]++;
    }
  });

  const data: IPickupsPerHour[] = hours.map(hour => ({
    hour,
    pickups: hourlyData[hour] || 0,
  }));

  return data;
};

// Get average pickup time by day of week
const getAvgPickupTimeByDay = async (query: IDashboardQuery) => {
  const { period = 'weekly', startDate, endDate, zoneId } = query;

  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      default:
        start = new Date(now);
        start.setDate(now.getDate() - 7);
    }
  }

  const whereConditions: any = {
    requestedAt: {
      gte: start,
      lte: end,
    },
    acceptedAt: { not: null },
    arrivedAtPickup: { not: null },
  };

  if (zoneId) {
    whereConditions.rider = {
      zoneId: zoneId,
    };
  }

  const bookings = await prisma.booking.findMany({
    where: whereConditions,
    select: {
      requestedAt: true,
      acceptedAt: true,
      arrivedAtPickup: true,
    },
  });

  // Group by day of week
  const dayData: { [key: string]: { total: number; count: number } } = {
    Mon: { total: 0, count: 0 },
    Tue: { total: 0, count: 0 },
    Wed: { total: 0, count: 0 },
    Thu: { total: 0, count: 0 },
    Fri: { total: 0, count: 0 },
    Sat: { total: 0, count: 0 },
    Sun: { total: 0, count: 0 },
  };

  bookings.forEach(booking => {
    if (booking.acceptedAt && booking.arrivedAtPickup) {
      const dayOfWeek = booking.requestedAt.getDay();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayLabel = days[dayOfWeek];

      // Calculate time difference in minutes
      const timeDiff =
        (booking.arrivedAtPickup.getTime() - booking.acceptedAt.getTime()) /
        1000 /
        60;

      dayData[dayLabel].total += timeDiff;
      dayData[dayLabel].count++;
    }
  });

  const data: IAvgPickupTimeByDay[] = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ].map(day => ({
    day,
    mins: Math.round(
      dayData[day].count > 0 ? dayData[day].total / dayData[day].count : 0,
    ),
  }));

  return data;
};

// Get overall completion rate
const getCompletionRate = async (query: IDashboardQuery) => {
  const { period = 'weekly', startDate, endDate, zoneId } = query;

  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'daily':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      default:
        start = new Date(now);
        start.setDate(now.getDate() - 7);
    }
  }

  const whereConditions: any = {
    requestedAt: {
      gte: start,
      lte: end,
    },
    status: {
      not: 'cancelled',
    },
  };

  if (zoneId) {
    whereConditions.rider = {
      zoneId: zoneId,
    };
  }

  const [totalBookings, completedBookings] = await Promise.all([
    prisma.booking.count({
      where: whereConditions,
    }),
    prisma.booking.count({
      where: {
        ...whereConditions,
        status: bookingStatus.completed,
      },
    }),
  ]);

  const completionRate =
    totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100)
      : 0;

  const data: ICompletionRate = {
    completionRate,
    totalBookings,
    completedBookings,
  };

  return data;
};

// Get zone health data
const getZoneHealth = async (query: IDashboardQuery) => {
  const { period = 'weekly', startDate, endDate } = query;

  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'daily':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      default:
        start = new Date(now);
        start.setDate(now.getDate() - 7);
    }
  }

  // Get all zones with their stats
  const zones = await prisma.zone.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      riders: {
        where: {
          role: 'rider',
          riderVerified: true,
          isDeleted: false,
        },
        select: {
          id: true,
          onlineStatus: true,
        },
      },
    },
  });

  const zoneHealthData: IZoneHealth[] = await Promise.all(
    zones.map(async zone => {
      const whereConditions = {
        requestedAt: {
          gte: start,
          lte: end,
        },
        rider: {
          zoneId: zone.id,
        },
        status: {
          not: bookingStatus.cancelled,
        },
      };

      const [totalRequests, completedRequests, bookingsWithWaitTime] =
        await Promise.all([
          prisma.booking.count({
            where: whereConditions,
          }),
          prisma.booking.count({
            where: {
              ...whereConditions,
              status: bookingStatus.completed,
            },
          }),
          prisma.booking.findMany({
            where: {
              ...whereConditions,
              acceptedAt: { not: null },
              arrivedAtPickup: { not: null },
            },
            select: {
              acceptedAt: true,
              arrivedAtPickup: true,
            },
          }),
        ]);

      // Calculate average wait time
      let avgWaitTimeMinutes = 0;
      if (bookingsWithWaitTime.length > 0) {
        const totalWaitTime = bookingsWithWaitTime.reduce((sum, booking) => {
          if (booking.acceptedAt && booking.arrivedAtPickup) {
            return (
              sum +
              (booking.arrivedAtPickup.getTime() - booking.acceptedAt.getTime())
            );
          }
          return sum;
        }, 0);
        avgWaitTimeMinutes = Math.round(
          totalWaitTime / bookingsWithWaitTime.length / 1000 / 60,
        );
      }

      const completionRate =
        totalRequests > 0
          ? Math.round((completedRequests / totalRequests) * 100)
          : 0;

      // Determine status based on completion rate and wait time
      let status: 'Healthy' | 'Watch' | 'Action Needed' = 'Healthy';
      if (completionRate < 80 || avgWaitTimeMinutes > 12) {
        status = 'Action Needed';
      } else if (completionRate < 90 || avgWaitTimeMinutes > 8) {
        status = 'Watch';
      }

      // Count available (online) riders
      const availableRiders = zone.riders.filter(
        r => r.onlineStatus === 'online',
      ).length;

      return {
        zone: zone.name,
        zoneId: zone.id,
        requests: totalRequests,
        completed: completedRequests,
        riders: availableRiders,
        avgWaitTime: `${avgWaitTimeMinutes} min`,
        completionRate,
        status,
      };
    }),
  );

  return zoneHealthData;
};

// Get complete operations dashboard
const getOperationsDashboard = async (query: IDashboardQuery) => {
  const [
    pickupsPerHour,
    avgPickupTimeByDay,
    overallCompletionRate,
    zoneHealth,
  ] = await Promise.all([
    getPickupsPerHour(query),
    getAvgPickupTimeByDay(query),
    getCompletionRate(query),
    getZoneHealth(query),
  ]);

  return {
    pickupsPerHour,
    avgPickupTimeByDay,
    overallCompletionRate,
    zoneHealth,
  };
};

// Get pickup success rate by zone and period
const getPickupSuccessRate = async (query: IPickupSuccessRateQuery) => {
  const { zoneId } = query;
  const { start, end, granularity } =
    await resolvePickupSuccessRateWindow(query);

  const whereConditions: any = {
    requestedAt: {
      gte: start,
      lte: end,
    },
    status: {
      not: bookingStatus.cancelled,
    },
  };

  if (zoneId) {
    whereConditions.rider = {
      zoneId,
    };
  }

  const bookings = await prisma.booking.findMany({
    where: whereConditions,
    select: {
      requestedAt: true,
      status: true,
    },
  });

  const buckets = buildPickupSuccessBuckets(start, end, granularity);
  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]));

  bookings.forEach(booking => {
    const date = new Date(booking.requestedAt);
    const key = getDateKey(date, granularity);
    const bucket = bucketMap.get(key);

    if (bucket) {
      bucket.total++;

      if (booking.status === bookingStatus.completed) {
        bucket.completed++;
      }
    }
  });

  const successRates: IPickupSuccessRate[] = [];
  buckets.forEach(bucket => {
    const rate =
      bucket.total > 0
        ? Math.round((bucket.completed / bucket.total) * 100)
        : 0;

    successRates.push({
      day: bucket.day,
      rate,
    });
  });

  return successRates;
};

// Get zone performance ranking
const getZoneRanking = async (query: IRankingQuery) => {
  const {
    period = 'monthly',
    startDate,
    endDate,
    limit: limitParam = 10,
  } = query;
  const limit =
    typeof limitParam === 'string' ? parseInt(limitParam, 10) : limitParam;

  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    currentStart = new Date(startDate);
  } else {
    switch (period) {
      case 'weekly':
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 30);
        break;
      default:
        currentStart = new Date(now);
        currentStart.setHours(0, 0, 0, 0);
    }
  }

  // Calculate previous period for growth comparison
  const periodDuration = currentEnd.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - periodDuration);
  const previousEnd = new Date(currentStart);

  // Get all zones with their bookings
  const zones = await prisma.zone.findMany({
    where: {
      isDeleted: false,
    },
    include: {
      riders: {
        where: {
          riderVerified: true,
        },
        include: {
          bookingsAsRider: {
            where: {
              status: bookingStatus.completed,
              completedAt: {
                gte: currentStart,
                lte: currentEnd,
              },
            },
            select: {
              price: true,
            },
          },
        },
      },
    },
  });

  // Calculate metrics for each zone
  const zoneMetrics = await Promise.all(
    zones.map(async zone => {
      // Current period metrics
      const currentRevenue = zone.riders.reduce(
        (sum, rider) =>
          sum +
          rider.bookingsAsRider.reduce(
            (total, booking) => total + (booking.price || 0),
            0,
          ),
        0,
      );

      const currentPickups = zone.riders.reduce(
        (sum, rider) => sum + rider.bookingsAsRider.length,
        0,
      );

      // Previous period metrics for growth calculation
      const previousBookings = await prisma.booking.count({
        where: {
          status: bookingStatus.completed,
          completedAt: {
            gte: previousStart,
            lte: previousEnd,
          },
          rider: {
            zoneId: zone.id,
          },
        },
      });

      const previousRevenue = await prisma.booking.aggregate({
        where: {
          status: bookingStatus.completed,
          completedAt: {
            gte: previousStart,
            lte: previousEnd,
          },
          rider: {
            zoneId: zone.id,
          },
        },
        _sum: {
          price: true,
        },
      });

      // Calculate growth
      const prevRev = previousRevenue._sum.price || 0;
      const growth =
        prevRev > 0
          ? Number((((currentRevenue - prevRev) / prevRev) * 100).toFixed(1))
          : currentRevenue > 0
            ? 100
            : 0;

      return {
        zoneId: zone.id,
        zone: zone.name,
        revenue: currentRevenue,
        pickups: currentPickups,
        growth,
      };
    }),
  );

  // Sort by revenue and add rank
  const sortedZones = zoneMetrics
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  const rankedZones: IZoneRanking[] = sortedZones.map((zone, index) => {
    // Determine status based on performance
    let status: 'High' | 'Medium' | 'Low' = 'Low';
    if (zone.growth >= 8 && zone.pickups >= 700) {
      status = 'High';
    } else if (zone.growth >= 3 && zone.pickups >= 500) {
      status = 'Medium';
    }

    return {
      rank: index + 1,
      zoneId: zone.zoneId,
      zone: zone.zone,
      revenue: zone.revenue,
      pickups: zone.pickups,
      growth: zone.growth,
      status,
    };
  });

  return rankedZones;
};

// Get top performing riders
const getTopRiders = async (query: IRankingQuery) => {
  const {
    period = 'weekly',
    startDate,
    endDate,
    limit: limitParam = 5,
  } = query;
  const limit =
    typeof limitParam === 'string' ? parseInt(limitParam, 10) : limitParam;

  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      default:
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
    }
  }

  // Get all riders with their completed bookings in period
  const riders = await prisma.user.findMany({
    where: {
      riderVerified: true,
      role: 'rider',
      isDeleted: false,
    },
    include: {
      bookingsAsRider: {
        where: {
          status: bookingStatus.completed,
          completedAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          price: true,
        },
      },
      zone: {
        select: {
          name: true,
        },
      },
    },
  });

  // Calculate metrics for each rider
  const riderMetrics = await Promise.all(
    riders.map(async rider => {
      const trips = rider.bookingsAsRider.length;
      const earnings = rider.bookingsAsRider.reduce(
        (sum, booking) => sum + (booking.price || 0),
        0,
      );

      // Get average rating
      const bookingIds = rider.bookingsAsRider.map(b => b.id);
      const ratings = await prisma.rating.findMany({
        where: {
          bookingId: {
            in: bookingIds,
          },
        },
        select: {
          rating: true,
        },
      });

      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;

      return {
        riderId: rider.id,
        name: rider.name,
        zone: rider.zone?.name || 'Unassigned',
        trips,
        earnings,
        rating: Number(avgRating.toFixed(1)),
      };
    }),
  );

  // Filter riders with at least 1 trip and sort by trips
  const sortedRiders = riderMetrics
    .filter(r => r.trips > 0)
    .sort((a, b) => b.trips - a.trips || b.earnings - a.earnings)
    .slice(0, limit);

  const topRiders: ITopRider[] = sortedRiders.map((rider, index) => ({
    rank: index + 1,
    riderId: rider.riderId,
    name: rider.name,
    zone: rider.zone,
    trips: rider.trips,
    earnings: rider.earnings,
    rating: rider.rating,
  }));

  return topRiders;
};

const getZoneTopPerformingRiders = async (
  query: IZoneTopPerformingRidersQuery,
) => {
  const {
    zoneId,
    period = 'weekly',
    startDate,
    endDate,
    limit: limitParam = 5,
  } = query;

  const limit =
    typeof limitParam === 'string' ? parseInt(limitParam, 10) : limitParam;

  const zone = await prisma.zone.findUnique({
    where: {
      id: zoneId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!zone) {
    throw new Error('Zone not found');
  }

  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'daily':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      default:
        start = new Date(now);
        start.setDate(now.getDate() - 7);
    }
  }

  const riders = await prisma.user.findMany({
    where: {
      riderVerified: true,
      role: 'rider',
      isDeleted: false,
      zoneId,
    },
    include: {
      bookingsAsRider: {
        where: {
          status: bookingStatus.completed,
          completedAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          price: true,
        },
      },
    },
  });

  const riderMetrics = await Promise.all(
    riders.map(async rider => {
      const trips = rider.bookingsAsRider.length;
      const earnings = rider.bookingsAsRider.reduce(
        (sum, booking) => sum + (booking.price || 0),
        0,
      );

      const bookingIds = rider.bookingsAsRider.map(b => b.id);
      const ratings = await prisma.rating.findMany({
        where: {
          bookingId: {
            in: bookingIds,
          },
        },
        select: {
          rating: true,
        },
      });

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating.rating, 0) /
            ratings.length
          : 0;

      return {
        name: rider.name,
        zone: zone.name,
        trips,
        earnings,
        rating: Number(averageRating.toFixed(1)),
      };
    }),
  );

  const sortedRiders = riderMetrics
    .filter(rider => rider.trips > 0)
    .sort(
      (a, b) =>
        b.trips - a.trips || b.earnings - a.earnings || b.rating - a.rating,
    )
    .slice(0, limit);

  const topPerformingRiders: IZoneTopPerformingRider[] = sortedRiders.map(
    (rider, index) => ({
      rank: index + 1,
      name: rider.name,
      zone: rider.zone,
      trips: rider.trips,
      earnings: rider.earnings,
      rating: rider.rating,
    }),
  );

  return topPerformingRiders;
};

// Get zone details with KPIs
const getZoneDetails = async (query: IZoneQuery) => {
  const { zoneId, period = 'monthly', startDate, endDate } = query;

  // Validate zone exists
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { name: true },
  });

  if (!zone) {
    throw new Error('Zone not found');
  }

  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    currentStart = new Date(startDate);
  } else {
    switch (period) {
      case 'weekly':
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 30);
        break;
      default:
        currentStart = new Date(now);
        currentStart.setHours(0, 0, 0, 0);
    }
  }

  // Calculate previous period for growth
  const periodDuration = currentEnd.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - periodDuration);
  const previousEnd = new Date(currentStart);

  // Get current period metrics
  const [currentBookings, currentRevenue, activeRiders, ratings] =
    await Promise.all([
      // Total pickups
      prisma.booking.count({
        where: {
          status: bookingStatus.completed,
          completedAt: {
            gte: currentStart,
            lte: currentEnd,
          },
          rider: {
            zoneId: zoneId,
          },
        },
      }),
      // Total revenue
      prisma.booking.aggregate({
        where: {
          status: bookingStatus.completed,
          completedAt: {
            gte: currentStart,
            lte: currentEnd,
          },
          rider: {
            zoneId: zoneId,
          },
        },
        _sum: {
          price: true,
        },
      }),
      // Active riders count
      prisma.user.count({
        where: {
          zoneId: zoneId,
          riderVerified: true,
          role: 'rider',
          isDeleted: false,
        },
      }),
      // Get all ratings for completed bookings in zone
      prisma.rating.findMany({
        where: {
          booking: {
            status: bookingStatus.completed,
            completedAt: {
              gte: currentStart,
              lte: currentEnd,
            },
            rider: {
              zoneId: zoneId,
            },
          },
        },
        select: {
          rating: true,
        },
      }),
    ]);

  // Get previous period revenue for growth calculation
  const previousRevenue = await prisma.booking.aggregate({
    where: {
      status: bookingStatus.completed,
      completedAt: {
        gte: previousStart,
        lte: previousEnd,
      },
      rider: {
        zoneId: zoneId,
      },
    },
    _sum: {
      price: true,
    },
  });

  // Calculate metrics
  const totalRevenue = currentRevenue._sum.price || 0;
  const totalPickups = currentBookings;
  const avgRating =
    ratings.length > 0
      ? Number(
          (
            ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          ).toFixed(1),
        )
      : 0;

  const prevRev = previousRevenue._sum.price || 0;
  const growth =
    prevRev > 0
      ? Number((((totalRevenue - prevRev) / prevRev) * 100).toFixed(1))
      : totalRevenue > 0
        ? 100
        : 0;

  // Determine status
  let status: 'High' | 'Medium' | 'Low' = 'Low';
  if (growth >= 8 && totalPickups >= 700) {
    status = 'High';
  } else if (growth >= 3 && totalPickups >= 500) {
    status = 'Medium';
  }

  const zoneDetails: IZoneDetails = {
    zoneId,
    zoneName: zone.name,
    totalRevenue,
    totalPickups,
    avgRating,
    activeRiders,
    growth,
    status,
  };

  return zoneDetails;
};

// Get zone performance trends (daily pickups and revenue)
const getZoneTrends = async (query: IZoneQuery) => {
  const { zoneId, period = 'weekly', startDate, endDate } = query;

  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    // Default to 7 days for weekly view
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  }

  // Get all completed bookings in date range for this zone
  const bookings = await prisma.booking.findMany({
    where: {
      status: bookingStatus.completed,
      completedAt: {
        gte: start,
        lte: end,
      },
      rider: {
        zoneId: zoneId,
      },
    },
    select: {
      completedAt: true,
      price: true,
    },
  });

  // Group by day
  const dayMap = new Map<string, { pickups: number; revenue: number }>();

  bookings.forEach(booking => {
    const date = new Date(booking.completedAt!);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { pickups: 0, revenue: 0 });
    }

    const dayData = dayMap.get(dayKey)!;
    dayData.pickups++;
    dayData.revenue += booking.price || 0;
  });

  // Convert to array
  const trends: IZoneTrendPoint[] = [];
  const sortedDays = Array.from(dayMap.keys()).sort();

  sortedDays.forEach((dayKey, index) => {
    const dayData = dayMap.get(dayKey)!;
    trends.push({
      day: `Day ${index + 1}`,
      pickups: dayData.pickups,
      revenue: Math.round(dayData.revenue),
    });
  });

  return trends;
};

// Get zone comparison (all zones revenue and pickups)
const getZoneComparison = async (query: IDashboardQuery) => {
  const { period = 'monthly', startDate, endDate } = query;

  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      default:
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
    }
  }

  // Get all zones
  const zones = await prisma.zone.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Get metrics for each zone
  const zoneMetrics = await Promise.all(
    zones.map(async zone => {
      const [revenue, pickups] = await Promise.all([
        // Total revenue
        prisma.booking.aggregate({
          where: {
            status: bookingStatus.completed,
            completedAt: {
              gte: start,
              lte: end,
            },
            rider: {
              zoneId: zone.id,
            },
          },
          _sum: {
            price: true,
          },
        }),
        // Total pickups
        prisma.booking.count({
          where: {
            status: bookingStatus.completed,
            completedAt: {
              gte: start,
              lte: end,
            },
            rider: {
              zoneId: zone.id,
            },
          },
        }),
      ]);

      return {
        zone: zone.name,
        revenue: revenue._sum.price || 0,
        pickups,
      };
    }),
  );

  // Sort by revenue descending
  const sortedZones = zoneMetrics.sort((a, b) => b.revenue - a.revenue);

  const comparison: IZoneComparison[] = sortedZones.map(zone => ({
    zone: zone.zone,
    revenue: zone.revenue,
    pickups: zone.pickups,
  }));

  return comparison;
};

// Get zone statistics with rider counts
const getZoneStats = async () => {
  const zones = await prisma.zone.findMany({
    where: {
      isDeleted: false,
    },
    include: {
      riders: {
        where: {
          riderVerified: true,
          role: 'rider',
          isDeleted: false,
        },
        select: {
          id: true,
          onlineStatus: true,
        },
      },
    },
  });

  const zoneStats: IZoneStat[] = zones.map(zone => ({
    zoneId: zone.id,
    name: zone.name,
    totalRiders: zone.riders.length,
    activeNow: zone.riders.filter(r => r.onlineStatus === 'online').length,
  }));

  return zoneStats;
};

// Get riders list with pagination
const getRidersList = async (query: IRiderListQuery) => {
  const {
    search,
    zoneId,
    status,
    page: pageParam = 1,
    limit: limitParam = 12,
  } = query;

  const page =
    typeof pageParam === 'string' ? parseInt(pageParam, 10) : pageParam;
  const limit =
    typeof limitParam === 'string' ? parseInt(limitParam, 10) : limitParam;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    riderVerified: true,
    role: 'rider',
    isDeleted: false,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (zoneId) {
    where.zoneId = zoneId;
  }

  // For status filtering, we'll handle it after fetching
  // since "Busy" is derived from active bookings

  // Get riders
  const [riders, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        zone: {
          select: {
            name: true,
          },
        },
        bookingsAsRider: {
          where: {
            status: {
              in: [
                bookingStatus.accepted,
                bookingStatus.arrived_pickup,
                bookingStatus.garbage_ready,
                bookingStatus.garbage_collected,
                bookingStatus.in_progress,
                bookingStatus.arrived_dropoff,
              ],
            },
          },
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Get completed trips count for each rider
  const riderIds = riders.map(r => r.id);
  const completedTrips = await prisma.booking.groupBy({
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
  });

  const completedTripsMap = new Map(
    completedTrips.map(ct => [ct.riderId!, ct._count.id]),
  );

  // Map riders to response format
  let riderList: IRiderListItem[] = riders.map(rider => {
    // Determine status
    let riderStatus: 'Online' | 'Offline' | 'Busy' = 'Offline';
    if (rider.bookingsAsRider.length > 0) {
      riderStatus = 'Busy';
    } else if (rider.onlineStatus === 'online') {
      riderStatus = 'Online';
    }

    return {
      riderId: rider.id,
      name: rider.name,
      email: rider.email,
      location: rider.locationName || 'N/A',
      zipCode: 'N/A', // Not in schema, can be added later
      zoneId: rider.zoneId,
      zoneName: rider.zone?.name || null,
      completedTrips: completedTripsMap.get(rider.id) || 0,
      status: riderStatus,
    };
  });

  // Apply status filter if provided
  if (status) {
    riderList = riderList.filter(r => r.status === status);
  }

  return {
    data: riderList,
    pagination: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
  };
};

export const operationsServices = {
  getPickupsPerHour,
  getAvgPickupTimeByDay,
  getCompletionRate,
  getZoneHealth,
  getOperationsDashboard,
  getPickupSuccessRate,
  getZoneRanking,
  getTopRiders,
  getZoneTopPerformingRiders,
  getZoneDetails,
  getZoneTrends,
  getZoneComparison,
  getZoneStats,
  getRidersList,
};
