import prisma from 'app/shared/prisma';
import { IFindRidersQuery } from './rider.interface';
import { getUserLocation } from './rider.helpers';
import {
  extractCoordinates,
  calculateDistance,
  formatEstimatedTime,
  calculateEstimatedPrice,
} from './rider.utils';
import { PRICING_CONFIG } from './rider.constants';

type TActivityReportFilter = 'today' | 'weekly' | 'monthly';

const getReportDateRange = (filter: TActivityReportFilter) => {
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

const toPercentage = (value: number, total: number) =>
  total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0;

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const getPerformanceBucketKey = (date: Date, filter: TActivityReportFilter) => {
  const day = date.toISOString().slice(0, 10);
  return filter === 'today'
    ? `${day}T${String(date.getUTCHours()).padStart(2, '0')}`
    : day;
};

const getPerformanceBucketLabel = (
  date: Date,
  filter: TActivityReportFilter,
) => {
  if (filter === 'today') {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
      timeZone: 'UTC',
    });
  }

  if (filter === 'weekly') {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

const buildPerformanceBuckets = (
  filter: TActivityReportFilter,
  startDate: Date,
  endDate: Date,
) => {
  const buckets: Array<{ key: string; label: string }> = [];
  const cursor = new Date(startDate);

  if (filter === 'today') {
    for (let hour = 0; hour <= endDate.getUTCHours(); hour += 1) {
      cursor.setUTCHours(hour, 0, 0, 0);
      buckets.push({
        key: getPerformanceBucketKey(cursor, filter),
        label: getPerformanceBucketLabel(cursor, filter),
      });
    }
    return buckets;
  }

  while (cursor <= endDate) {
    buckets.push({
      key: getPerformanceBucketKey(cursor, filter),
      label: getPerformanceBucketLabel(cursor, filter),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return buckets;
};

const getPerformance = async (
  riderId: string,
  filter: TActivityReportFilter = 'today',
) => {
  const { startDate, endDate } = getReportDateRange(filter);

  const [offerNotifications, acceptedBookings] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: riderId,
        type: 'new_booking_available',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { data: true, createdAt: true },
    }),
    prisma.booking.findMany({
      where: {
        riderId,
        acceptedAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        acceptedAt: true,
      },
    }),
  ]);

  const offeredBookingIds = new Set<string>();
  const offersByBucket = new Map<string, Set<string>>();
  for (const notification of offerNotifications) {
    const data = notification.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;

    const bookingId = (data as Record<string, unknown>).bookingId;
    if (typeof bookingId !== 'string') continue;

    offeredBookingIds.add(bookingId);
    const key = getPerformanceBucketKey(notification.createdAt, filter);
    const bucketOffers = offersByBucket.get(key) || new Set<string>();
    bucketOffers.add(bookingId);
    offersByBucket.set(key, bucketOffers);
  }

  const acceptedByBucket = new Map<
    string,
    { accepted: number; completed: number }
  >();
  for (const booking of acceptedBookings) {
    if (!booking.acceptedAt) continue;
    const key = getPerformanceBucketKey(booking.acceptedAt, filter);
    const bucket = acceptedByBucket.get(key) || { accepted: 0, completed: 0 };
    bucket.accepted += 1;
    if (booking.status === 'completed') bucket.completed += 1;
    acceptedByBucket.set(key, bucket);
  }

  const acceptedJobs = acceptedBookings.length;
  const completedJobs = acceptedBookings.filter(
    booking => booking.status === 'completed',
  ).length;
  const cancelledJobs = acceptedBookings.filter(
    booking => booking.status === 'cancelled',
  ).length;
  const totalOffers = offeredBookingIds.size;
  const acceptanceBase = Math.max(totalOffers, acceptedJobs);

  const performanceTrend = buildPerformanceBuckets(
    filter,
    startDate,
    endDate,
  ).map(bucket => {
    const accepted = acceptedByBucket.get(bucket.key) || {
      accepted: 0,
      completed: 0,
    };
    const offers = offersByBucket.get(bucket.key)?.size || 0;
    const bucketAcceptanceBase = Math.max(offers, accepted.accepted);

    return {
      label: bucket.label,
      acceptanceRate: toPercentage(accepted.accepted, bucketAcceptanceBase),
      completionRate: toPercentage(accepted.completed, accepted.accepted),
    };
  });

  return {
    acceptanceRate: toPercentage(acceptedJobs, acceptanceBase),
    acceptedJobs,
    totalJobs: acceptanceBase,
    completionRate: toPercentage(completedJobs, acceptedJobs),
    cancellationRate: toPercentage(cancelledJobs, acceptedJobs),
    performanceTrend,
  };
};

const getActivityReport = async (
  riderId: string,
  filter: TActivityReportFilter = 'today',
) => {
  const { startDate, endDate } = getReportDateRange(filter);

  const [offerNotifications, acceptedBookings, completedCollections, earnings] =
    await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: riderId,
          type: 'new_booking_available',
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { data: true },
      }),
      prisma.booking.findMany({
        where: {
          riderId,
          acceptedAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          status: true,
          acceptedAt: true,
          completedAt: true,
          cancelledAt: true,
        },
      }),
      prisma.booking.findMany({
        where: {
          riderId,
          status: 'completed',
          completedAt: { gte: startDate, lte: endDate },
        },
        select: {
          station: {
            select: {
              zone: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          riderId,
          type: 'RIDE_PAYMENT',
          createdAt: { gte: startDate, lte: endDate },
          OR: [
            { status: 'success' },
            {
              booking: {
                is: {
                  paymentMethod: 'cash',
                  isPaidByCustomer: true,
                },
              },
            },
          ],
        },
        select: {
          amount: true,
          riderEarnings: true,
        },
      }),
    ]);

  const offeredBookingIds = new Set<string>();
  for (const notification of offerNotifications) {
    const data = notification.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const bookingId = (data as Record<string, unknown>).bookingId;
      if (typeof bookingId === 'string') offeredBookingIds.add(bookingId);
    }
  }

  const acceptedCount = acceptedBookings.length;
  const completedCount = acceptedBookings.filter(
    booking => booking.status === 'completed',
  ).length;
  const cancelledCount = acceptedBookings.filter(
    booking => booking.status === 'cancelled',
  ).length;
  const offeredCount = offeredBookingIds.size;
  const acceptanceBase = Math.max(offeredCount, acceptedCount);

  const totalActiveMilliseconds = acceptedBookings.reduce((total, booking) => {
    if (!booking.acceptedAt) return total;
    const terminalTime = booking.completedAt || booking.cancelledAt || endDate;
    return (
      total + Math.max(0, terminalTime.getTime() - booking.acceptedAt.getTime())
    );
  }, 0);
  const onlineTimeSeconds = Math.floor(totalActiveMilliseconds / 1000);

  const totalEarnings = earnings.reduce(
    (total, transaction) =>
      total + (transaction.riderEarnings ?? transaction.amount ?? 0),
    0,
  );

  const zoneCounts = new Map<
    string,
    { zoneId: string | null; zoneName: string; collections: number }
  >();
  for (const collection of completedCollections) {
    const zoneId = collection.station?.zone?.id || null;
    const zoneName = collection.station?.zone?.name || 'Unassigned zone';
    const key = zoneId || zoneName;
    const current = zoneCounts.get(key);
    if (current) {
      current.collections += 1;
    } else {
      zoneCounts.set(key, { zoneId, zoneName, collections: 1 });
    }
  }

  const totalCollections = completedCollections.length;
  const collectionsByZone = Array.from(zoneCounts.values())
    .sort((a, b) => b.collections - a.collections)
    .map(zone => ({
      ...zone,
      percentage: toPercentage(zone.collections, totalCollections),
    }));

  return {
    totalEarnings: Number(totalEarnings.toFixed(2)),
    acceptanceRate: toPercentage(acceptedCount, acceptanceBase),
    completionRate: toPercentage(completedCount, acceptedCount),
    cancellationRate: toPercentage(cancelledCount, acceptedCount),
    onlineTime: formatDuration(onlineTimeSeconds),
    collectionsByZone,
  };
};

// Find available riders within radius
const findAvailableRiders = async (userId: string, query: IFindRidersQuery) => {
  const { radius = 10 } = query;
  let { latitude, longitude } = query;

  // Get user's location if not provided in query
  if (!latitude || !longitude) {
    const userLocation = await getUserLocation(userId);
    latitude = userLocation.latitude;
    longitude = userLocation.longitude;
  }

  // Fetch all verified, online riders
  const riders = await prisma.user.findMany({
    where: {
      role: 'rider',
      riderVerified: true,
      isDeleted: false,
      onlineStatus: 'online',
      location: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      profilePicture: true,
      location: true,
      locationName: true,
      onlineStatus: true,
    },
  });

  // Process riders: calculate distance, filter by radius, and enrich with metadata
  const ridersWithinRadius = riders
    .map(rider => {
      const riderCoords = extractCoordinates(rider.location);
      if (!riderCoords) return null;

      const distance = calculateDistance(
        latitude!,
        longitude!,
        riderCoords.latitude,
        riderCoords.longitude,
      );

      // Filter out riders outside the radius
      if (distance > radius) return null;

      // Calculate time and price estimates
      const timeInMinutes = Math.round(
        (distance / PRICING_CONFIG.avgSpeed) * 60,
      );
      const estimatedTime = formatEstimatedTime(timeInMinutes);
      const estimatedPrice = calculateEstimatedPrice(distance, timeInMinutes);

      return {
        ...rider,
        distance: parseFloat(distance.toFixed(2)),
        estimatedTime,
        estimatedPrice,
      };
    })
    .filter((rider): rider is NonNullable<typeof rider> => rider !== null)
    .sort((a, b) => a.distance - b.distance);

  return {
    riders: ridersWithinRadius,
    meta: {
      page: 1,
      limit: ridersWithinRadius.length,
      total: ridersWithinRadius.length,
      totalPage: 1,
      radius,
      searchLocation: { latitude, longitude },
    },
  };
};

export const riderServices = {
  findAvailableRiders,
  getActivityReport,
  getPerformance,
};
