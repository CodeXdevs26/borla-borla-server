import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import { STATUS_MAP } from './booking.constants';
import { Prisma } from '../../../generated/prisma';
import { getHistoryRange, HistoryFilter } from './booking.history';
import {
  ICreateBooking,
  IGetBookingsQuery,
  IUpdateBookingStatus,
} from './booking.interface';
import {
  validateBookingQuery,
  normalizeZoneBoundary,
  isPointInsideBoundary,
  estimateTimeInMinutes,
  formatEstimatedTime,
} from './booking.utils';
import {
  calculateDistance,
  calculateBookingEstimatedPrice,
  calculateBookingFinalPrice,
} from './../riders/rider.utils';
import { commissionServices } from '../commissions/commission.service';
import { emitToUser } from '../../utils/socket';
import { notificationService } from '../notifications/notification.service';
import { rewardPointServices } from '../rewards/rewardPoints.service';
import { log } from 'node:console';

const RIDER_SEARCH_INTERVAL_MS = 15 * 60 * 1000;
const RIDER_SEARCH_DURATION_MS = 2 * 60 * 60 * 1000;
const RIDER_SEARCH_LOCK_MS = 2 * 60 * 1000;

// Helper function to get rider statistics
const getRiderStats = async (riderId: string) => {
  // Get average rating for this rider
  const ratingStats = await prisma.rating.aggregate({
    where: {
      booking: {
        riderId: riderId,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  // Get count of completed bookings
  const completedBookingsCount = await prisma.booking.count({
    where: {
      riderId: riderId,
      status: 'completed',
    },
  });

  return {
    averageRating: ratingStats._avg.rating || 0,
    totalRatings: ratingStats._count.rating || 0,
    completedBookings: completedBookingsCount,
  };
};

// Helper function to attach rider stats to a booking
const attachRiderStatsToBooking = async (booking: any) => {
  if (booking.riderId && booking.rider) {
    const riderStats = await getRiderStats(booking.riderId);
    return {
      ...booking,
      rider: {
        ...booking.rider,
        averageRating: riderStats.averageRating,
        totalRatings: riderStats.totalRatings,
        completedBookings: riderStats.completedBookings,
      },
    };
  }
  return booking;
};

const getRidersForBookingNotification = async (pickupLocation: {
  type: 'Point';
  coordinates: [number, number];
}) => {
  const riders = await prisma.user.findMany({
    where: {
      role: 'rider',
      riderVerified: true,
      isDeleted: false,
      zoneId: { not: null },
    },
    select: {
      id: true,
      name: true,
      zoneId: true,
      zone: {
        select: {
          id: true,
          isDeleted: true,
          boundary: true,
        },
      },
    },
  });

  const ridersInMatchingZones = riders
    .filter(rider => {
      if (!rider.zone || rider.zone.isDeleted || !rider.zone.boundary) {
        return false;
      }

      return isPointInsideBoundary(
        pickupLocation.coordinates,
        rider.zone.boundary,
      );
    })
    .map(rider => ({
      id: rider.id,
      name: rider.name,
      zoneId: rider.zoneId,
    }));

  return ridersInMatchingZones;
};

const buildBookingNotificationData = (booking: any) => ({
  bookingId: booking.id,
  userId: booking.userId,
  status: booking.status,
  pickupAddress: booking.pickupAddress,
  pickupLocation: booking.pickupLocation,
  wasteCategory: booking.wasteCategory,
  binSize: booking.binSize,
  binQuantity: booking.binQuantity,
  wasteSize: booking.wasteSize,
  estimatedDistance: booking.estimatedDistance,
  estimatedTime: booking.estimatedTime,
  price: booking.price,
});

/** Run one durable rider-search pass. A short database lock prevents two app
 * instances from processing the same booking at the same time. */
const processRiderSearch = async (bookingId: string) => {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + RIDER_SEARCH_LOCK_MS);
  const lock = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      status: 'pending',
      riderId: null,
      riderSearchStatus: 'active',
      OR: [
        { riderSearchLockUntil: null },
        { riderSearchLockUntil: { lt: now } },
      ],
    },
    data: { riderSearchLockUntil: lockUntil },
  });

  if (lock.count === 0) return null;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!booking || booking.status !== 'pending' || booking.riderId)
      return null;

    const expiresAt =
      booking.riderSearchExpiresAt ||
      new Date(now.getTime() + RIDER_SEARCH_DURATION_MS);

    if (expiresAt <= now) {
      const expired = await prisma.booking.updateMany({
        where: {
          id: booking.id,
          status: 'pending',
          riderId: null,
          riderSearchStatus: 'active',
        },
        data: {
          riderSearchStatus: 'expired',
          nextRiderSearchAt: null,
          riderSearchLockUntil: null,
          creatorSearchExpiredNotifiedAt: now,
        },
      });

      if (expired.count > 0) {
        emitToUser(booking.userId, 'booking:rider-search-expired', {
          bookingId: booking.id,
          searchCycle: booking.riderSearchCycle,
          canRequestAgain: true,
          message:
            'No rider accepted your booking within two hours. You can request another rider search.',
        });
        await notificationService.createNotificationForUser({
          userId: booking.userId,
          type: 'booking_rider_search_expired',
          title: 'No Rider Accepted Your Booking',
          message:
            'No rider accepted your booking within two hours. You can request another rider search.',
          data: {
            bookingId: booking.id,
            searchCycle: booking.riderSearchCycle,
            canRequestAgain: true,
          },
        });
      }
      return null;
    }

    const pickupLocation = booking.pickupLocation as {
      type: 'Point';
      coordinates: [number, number];
    };
    const matchingRiders =
      await getRidersForBookingNotification(pickupLocation);
    const alreadyNotified = new Set(booking.notifiedRiderIds);
    const newRiderIds = matchingRiders
      .map(rider => rider.id)
      .filter(riderId => !alreadyNotified.has(riderId));

    // Reserve these riders in the current cycle before sending, preventing a
    // second worker from producing duplicate notifications.
    const reserved = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        status: 'pending',
        riderId: null,
        riderSearchStatus: 'active',
      },
      data: {
        riderSearchStartedAt: booking.riderSearchStartedAt || now,
        riderSearchExpiresAt: expiresAt,
        lastRiderSearchAt: now,
        nextRiderSearchAt: new Date(now.getTime() + RIDER_SEARCH_INTERVAL_MS),
        notifiedRiderIds: [...booking.notifiedRiderIds, ...newRiderIds],
        riderSearchLockUntil: null,
      },
    });

    // A rider may have accepted while the zone query was running.
    if (reserved.count === 0) return null;

    if (newRiderIds.length > 0) {
      const data = buildBookingNotificationData(booking);
      await notificationService.createNotificationForUsers(newRiderIds, {
        type: 'new_booking_available',
        title: 'New Booking Available',
        message: 'A new booking is available in your zone.',
        data,
      });

      newRiderIds.forEach(riderId => {
        emitToUser(riderId, 'booking:new', {
          ...data,
          createdAt: booking.createdAt,
          user: booking.user,
          message: 'A new booking is available in your zone.',
        });
      });
    }

    // The first search runs immediately when a booking is created. Every
    // subsequent persisted 15-minute search reports that the booking still
    // has no accepting rider, while keeping the final two-hour expiry event
    // separate.
    if (booking.lastRiderSearchAt) {
      const searchStartedAt = booking.riderSearchStartedAt || now;
      const searchAttempt = Math.max(
        2,
        Math.floor(
          (now.getTime() - searchStartedAt.getTime()) /
            RIDER_SEARCH_INTERVAL_MS,
        ) + 1,
      );
      const nextSearchAt = new Date(now.getTime() + RIDER_SEARCH_INTERVAL_MS);

      emitToUser(booking.userId, 'booking:rider-search-no-match', {
        bookingId: booking.id,
        searchCycle: booking.riderSearchCycle,
        searchAttempt,
        notifiedRiderCount: newRiderIds.length,
        nextSearchAt: nextSearchAt.toISOString(),
        searchExpiresAt: expiresAt.toISOString(),
        message:
          'No rider has accepted your booking yet. We will continue searching.',
      });
    }

    return { notifiedRiderCount: newRiderIds.length };
  } catch (error) {
    await prisma.booking
      .update({
        where: { id: bookingId },
        data: { riderSearchLockUntil: null },
      })
      .catch(() => undefined);
    throw error;
  }
};

const processDueRiderSearches = async () => {
  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'pending',
      riderId: null,
      riderSearchStatus: 'active',
      OR: [
        { nextRiderSearchAt: { lte: now } },
        { riderSearchExpiresAt: { lte: now } },
      ],
    },
    select: { id: true },
    orderBy: { nextRiderSearchAt: 'asc' },
    take: 50,
  });

  for (const booking of bookings) {
    try {
      await processRiderSearch(booking.id);
    } catch (error) {
      console.error(`Rider search failed for booking ${booking.id}:`, error);
    }
  }
};

// Create a new booking (User)
const createBooking = async (userId: string, payload: ICreateBooking) => {
  // Verify user exists and is not a rider
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isDeleted: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'User account is deleted');
  }

  if (user.role === 'rider') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Riders cannot create booking requests',
    );
  }

  // Create GeoJSON Point for pickup location
  const pickupLocation: {
    type: 'Point';
    coordinates: [number, number];
  } = {
    type: 'Point',
    coordinates: [payload.pickupLongitude, payload.pickupLatitude],
  };

  // Create GeoJSON Point for dropoff location if provided
  let dropoffLocation = null;
  if (payload.dropoffLatitude && payload.dropoffLongitude) {
    dropoffLocation = {
      type: 'Point',
      coordinates: [payload.dropoffLongitude, payload.dropoffLatitude],
    };
  }

  // Handle scheduling
  let scheduledFor: Date | undefined = undefined;
  if (payload.isScheduled && payload.scheduledFor) {
    scheduledFor = new Date(payload.scheduledFor);

    // Validate that scheduled date is in the future
    if (scheduledFor <= new Date()) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Scheduled time must be in the future',
      );
    }
  }

  const estimatedPrice = calculateBookingEstimatedPrice(payload.wasteSize);
  const booking = await prisma.booking.create({
    data: {
      userId,
      wasteCategory: payload.wasteCategory,
      wasteImages: payload.wasteImages,
      binSize: payload.binSize,
      binQuantity: payload.binQuantity,
      wasteSize: payload.wasteSize,
      pickupLocation,
      pickupAddress: payload.pickupAddress,
      dropoffLocation,
      dropoffAddress: payload.dropoffAddress,
      vehicleType: payload.vehicleType,
      estimatedDistance: payload.estimatedDistance,
      estimatedTime: payload.estimatedTime,
      paymentMethod: payload.paymentMethod,
      // The customer sees this before rider assignment. It is replaced by the
      // main price when a rider accepts and the chargeable distance is known.
      price: estimatedPrice,
      neighbours: payload.neighbours || [],
      status: 'pending',
      // Scheduling fields
      isScheduled: payload.isScheduled || false,
      scheduledFor: scheduledFor,
      scheduledDate: payload.scheduledDate,
      riderSearchStatus: 'active',
      riderSearchCycle: 1,
      riderSearchStartedAt: new Date(),
      riderSearchExpiresAt: new Date(Date.now() + RIDER_SEARCH_DURATION_MS),
      nextRiderSearchAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
    },
  });

  await processRiderSearch(booking.id);

  return prisma.booking.findUnique({
    where: { id: booking.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
    },
  });
};

const getEstimatedBookingPrice = (weight: number) => ({
  weight,
  baseFee: 20,
  weightRatePerKg: 1.5,
  estimatedPrice: calculateBookingEstimatedPrice(weight),
  currency: 'GHS',
});

const deleteBooking = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.delete({
    where: { id: bookingId, userId: userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
    },
  });

  return booking;
};

// Get available bookings for riders (within their assigned zone)
const getAvailableBookingsForRider = async (
  riderId: string,
  query: IGetBookingsQuery,
) => {
  console.log('get available bookings for rider called with query:', query);
  // Verify rider exists and is verified, and get their zone
  const rider = await prisma.user.findUnique({
    where: { id: riderId },
    select: {
      role: true,
      riderVerified: true,
      zoneId: true,
      isDeleted: true,
      location: true,
      zone: {
        select: {
          id: true,
          name: true,
          boundary: true,
        },
      },
    },
  });

  console.log('rider', rider);
  console.log(JSON.stringify(rider?.zone?.boundary, null, 2));

  if (!rider) {
    throw new AppError(httpStatus.NOT_FOUND, 'Rider not found');
  }

  if (rider.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'Rider account is deleted');
  }

  if (rider.role !== 'rider') {
    throw new AppError(httpStatus.FORBIDDEN, 'Only riders can access this');
  }

  if (!rider.riderVerified) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your rider account is not verified yet',
    );
  }

  if (!rider.zoneId || !rider.zone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have not been assigned to a zone yet. Please contact admin.',
    );
  }

  // Validate and sanitize query parameters
  const { status, page, limit, populateUser } = validateBookingQuery(query);

  const skip = (page - 1) * limit;

  // Get the zone boundary
  const zoneBoundary = normalizeZoneBoundary(rider.zone.boundary as any);

  const bookingsPipeline: any[] = [
    {
      $match: {
        status: status,
        riderId: null,
        riderSearchStatus: 'active',
        $and: [
          {
            $or: [
              { riderSearchExpiresAt: null },
              {
                riderSearchExpiresAt: {
                  $gt: { $date: new Date().toISOString() },
                },
              },
            ],
          },
        ],
      },
    },
    // {
    //   $match: {
    //     pickupLocation: {
    //       $geoWithin: {
    //         $geometry: zoneBoundary,
    //       },
    //     },
    //   },
    // },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ];

  if (populateUser) {
    bookingsPipeline.push(
      {
        $lookup: {
          from: 'User',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    );
  }

  bookingsPipeline.push({
    $project: {
      _id: 1,
      userId: 1,
      riderId: 1,
      wasteCategory: 1,
      wasteImages: 1,
      binSize: 1,
      binQuantity: 1,
      wasteSize: 1,
      pickupLocation: 1,
      pickupAddress: 1,
      dropoffLocation: 1,
      dropoffAddress: 1,
      vehicleType: 1,
      estimatedDistance: 1,
      estimatedTime: 1,
      paymentMethod: 1,
      price: 1,
      neighbours: 1,
      status: 1,
      isScheduled: 1,
      scheduledFor: 1,
      scheduledDate: 1,
      createdAt: 1,
      updatedAt: 1,
      ...(populateUser
        ? {
            'user._id': 1,
            'user.name': 1,
            'user.email': 1,
            'user.phoneNumber': 1,
            'user.profilePicture': 1,
          }
        : {}),
    },
  });

  // Use MongoDB's $geoWithin operator to find bookings within the zone boundary
  const bookingsInZone = await prisma.booking.aggregateRaw({
    pipeline: bookingsPipeline,
  });

  // Get total count of bookings in zone
  const totalCountResult = await prisma.booking.aggregateRaw({
    pipeline: [
      // Count with exactly the same filters as the listing, without pagination.
      ...bookingsPipeline.filter(stage => stage.$match),
      {
        $count: 'total',
      },
    ],
  });

  const total =
    Array.isArray(totalCountResult) && totalCountResult.length > 0
      ? (totalCountResult[0] as any).total
      : 0;

  // Transform the results to match the expected format
  const getRiderMainPrice = (booking: any) => {
    let chargeableDistance = 0;
    const riderCoordinates = (rider.location as any)?.coordinates;
    const pickupCoordinates = booking.pickupLocation?.coordinates;
    if (Array.isArray(riderCoordinates) && Array.isArray(pickupCoordinates)) {
      const [riderLongitude, riderLatitude] = riderCoordinates.map(Number);
      const [pickupLongitude, pickupLatitude] = pickupCoordinates.map(Number);
      if ([riderLongitude, riderLatitude, pickupLongitude, pickupLatitude].every(Number.isFinite)) {
        chargeableDistance = calculateDistance(
          riderLatitude,
          riderLongitude,
          pickupLatitude,
          pickupLongitude,
        );
      }
    }
    return calculateBookingFinalPrice(Number(booking.wasteSize), chargeableDistance);
  };

  const bookings = Array.isArray(bookingsInZone)
    ? bookingsInZone.map((booking: any) => ({
        id: booking._id.$oid,
        userId: booking.userId.$oid,
        riderId: booking.riderId?.$oid || null,
        wasteCategory: booking.wasteCategory,
        wasteImages: booking.wasteImages,
        binSize: booking.binSize,
        binQuantity: booking.binQuantity,
        wasteSize: booking.wasteSize,
        pickupLocation: booking.pickupLocation,
        pickupAddress: booking.pickupAddress,
        dropoffLocation: booking.dropoffLocation,
        dropoffAddress: booking.dropoffAddress,
        vehicleType: booking.vehicleType,
        estimatedDistance: booking.estimatedDistance,
        estimatedTime: booking.estimatedTime,
        paymentMethod: booking.paymentMethod,
        // Riders see the main price calculated for their current location.
        price: getRiderMainPrice(booking),
        neighbours: booking.neighbours || [],
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        isScheduled: booking.isScheduled,
        scheduledFor: booking.scheduledFor,
        scheduledDate: booking.scheduledDate,
        user:
          populateUser && booking.user
            ? {
                id: booking.user._id.$oid,
                name: booking.user.name,
                email: booking.user.email,
                phoneNumber: booking.user.phoneNumber,
                profilePicture: booking.user.profilePicture,
              }
            : null,
      }))
    : [];

  return {
    bookings,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
      zone: {
        id: rider.zone.id,
        name: rider.zone.name,
      },
    },
  };
};

const getHistoryPage = async (
  userId: string,
  query: { filter: HistoryFilter; page: number; limit: number },
  role?: string,
) => {
  const { filter, page, limit } = query;
  const range = getHistoryRange(filter);
  const where: Prisma.BookingWhereInput = {
    // Customers see bookings they created; riders see bookings assigned to them.
    ...(role === 'rider' ? { riderId: userId } : { userId }),
    ...(range
      ? {
          OR: [
            { status: 'completed', completedAt: range },
            { status: 'cancelled', cancelledAt: range },
            // Older records may not have a terminal timestamp.
            {
              status: 'completed',
              OR: [{ completedAt: null }, { completedAt: { isSet: false } }],
              createdAt: range,
            },
            {
              status: 'cancelled',
              OR: [{ cancelledAt: null }, { cancelledAt: { isSet: false } }],
              createdAt: range,
            },
          ],
        }
      : { status: { in: ['completed', 'cancelled'] } }),
  };
  const [bookings, total, weight, payment] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        wasteSize: true,
        binQuantity: true,
        wasteCategory: true,
        riderId: true,
        rider: { select: { id: true, name: true, profilePicture: true } },
      },
    }),
    prisma.booking.count({ where }),
    prisma.booking.aggregate({
      where: { AND: [where, { status: 'completed' }] },
      _sum: { wasteSize: true },
    }),
    prisma.booking.aggregate({
      where: {
        AND: [
          where,
          {
            isRefunded: false,
            OR: [{ isPaid: true }, { isPaidByCustomer: true }],
          },
        ],
      },
      _sum: { price: true },
    }),
  ]);
  const riderIds = [
    ...new Set(
      bookings
        .map(booking => booking.riderId)
        .filter((id): id is string => !!id),
    ),
  ];
  const riderStats = new Map(
    await Promise.all(
      riderIds.map(async id => [id, await getRiderStats(id)] as const),
    ),
  );
  return {
    summary: {
      filter,
      kgDeposited: Number((weight._sum.wasteSize ?? 0).toFixed(2)),
      paid: Number((payment._sum.price ?? 0).toFixed(2)),
      currency: 'GHS',
    },
    bookings: bookings.map(booking => ({
      id: booking.id,
      status: booking.status,
      statusLabel: booking.status === 'completed' ? 'Completed' : 'Cancelled',
      rider: booking.rider
        ? { ...booking.rider, ...riderStats.get(booking.rider.id) }
        : null,
      wasteSize: booking.wasteSize,
      binQuantity: booking.binQuantity,
      wasteCategory: booking.wasteCategory,
      receipt: {
        bookingId: booking.id,
        detailsEndpoint: `/api/v1/bookings/${booking.id}`,
      },
    })),
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

// Get user's own bookings
const getMyBookings = async (userId: string, query: IGetBookingsQuery) => {
  let { status, page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const whereCondition: any = {
    userId,
  };

  if (status) {
    status = STATUS_MAP[status] || status; // Map to internal status if needed
  }

  if (status && typeof status === 'string') {
    whereCondition.status = status;
  }

  if (status && typeof status === 'object' && Array.isArray(status)) {
    whereCondition.status = { in: status };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereCondition,
      skip,
      take: Number(limit),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
            location: true,
            locationName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.booking.count({ where: whereCondition }),
  ]);

  // Get unique rider IDs from bookings
  const riderIds = [
    ...new Set(bookings.map(b => b.riderId).filter(Boolean) as string[]),
  ];

  // Fetch rider stats for all riders
  const riderStatsMap = new Map();
  await Promise.all(
    riderIds.map(async riderId => {
      const stats = await getRiderStats(riderId);
      riderStatsMap.set(riderId, stats);
    }),
  );

  // Attach rider stats to bookings
  const bookingsWithStats = bookings.map(booking => ({
    ...booking,
    rider: booking.rider
      ? {
          ...booking.rider,
          averageRating: riderStatsMap.get(booking.riderId)?.averageRating || 0,
          totalRatings: riderStatsMap.get(booking.riderId)?.totalRatings || 0,
          completedBookings:
            riderStatsMap.get(booking.riderId)?.completedBookings || 0,
        }
      : null,
  }));

  return {
    bookings: bookingsWithStats,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getRiderAcceptedBookingDetails = async (
  riderId: string,
  query: { page: number; limit: number },
) => {
  const { page, limit } = query;
  const where = { riderId, status: 'accepted' as const };
  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ acceptedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        pickupAddress: true,
        pickupLocation: true,
        price: true,
        isPaid: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

// Card data for bookings currently waiting for this rider to start collection.
const getAcceptedBookings = async (
  riderId: string,
  query: { page: number; limit: number },
) => {
  const { page, limit } = query;
  const where = { riderId, status: 'accepted' as const };
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ acceptedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        estimatedDistance: true,
        paymentMethod: true,
        price: true,
        scheduledFor: true,
        acceptedAt: true,
        requestedAt: true,
        user: {
          select: { name: true, role: true, profilePicture: true },
        },
        station: { select: { address: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);
  const data = bookings.map(({ user, station, ...booking }) => ({
    pickupAddress: booking.pickupAddress,
    estimatedDistance: booking.estimatedDistance,
    price: booking.price,
    customer: {
      name: user.name,
      profilePicture: user.profilePicture,
      roleLabel:
        user.role === 'institute'
          ? 'Institution'
          : user.role === 'user'
            ? 'User'
            : user.role,
    },
    dropoffAddress: booking.dropoffAddress ?? station?.address ?? null,
    distanceUnit: 'km',
    currency: 'GHS',
    paymentLabel: booking.paymentMethod === 'cash' ? 'Cash' : 'Hubtel',
    displayTime:
      booking.scheduledFor ?? booking.acceptedAt ?? booking.requestedAt,
  }));
  return {
    data,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

// Get rider's accepted bookings
const getRiderBookings = async (riderId: string, query: IGetBookingsQuery) => {
  let { status, page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const whereCondition: any = {
    riderId,
  };

  if (status) {
    status = STATUS_MAP[status] || status; // Map to internal status if needed
  }

  if (status && typeof status === 'string') {
    whereCondition.status = status;
  }

  if (status && typeof status === 'object' && Array.isArray(status)) {
    whereCondition.status = { in: status };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereCondition,
      skip,
      take: Number(limit),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
            location: true,
            locationName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.booking.count({ where: whereCondition }),
  ]);

  // Get rider stats for this specific rider
  const riderStats = await getRiderStats(riderId);

  // Attach rider stats to all bookings
  const bookingsWithStats = bookings.map(booking => ({
    ...booking,
    rider: booking.rider
      ? {
          ...booking.rider,
          averageRating: riderStats.averageRating,
          totalRatings: riderStats.totalRatings,
          completedBookings: riderStats.completedBookings,
        }
      : null,
  }));

  return {
    bookings: bookingsWithStats,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

// Get booking by ID
const getBookingById = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
      rider: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
          location: true,
          locationName: true,
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  // Check if user has access to this booking
  if (booking.userId !== userId && booking.riderId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have access to this booking',
    );
  }

  // Add rider stats if rider exists
  if (booking.riderId) {
    const riderStats = await getRiderStats(booking.riderId);
    return {
      ...booking,
      rider: booking.rider
        ? {
            ...booking.rider,
            averageRating: riderStats.averageRating,
            totalRatings: riderStats.totalRatings,
            completedBookings: riderStats.completedBookings,
          }
        : null,
    };
  }

  return booking;
};

// Accept booking (Rider)
const acceptBooking = async (bookingId: string, riderId: string) => {
  // Verify rider
  const rider = await prisma.user.findUnique({
    where: { id: riderId },
    select: {
      role: true,
      riderVerified: true,
      isDeleted: true,
      location: true,
      wasteCapacity: true,
    },
  });

  if (!rider) {
    throw new AppError(httpStatus.NOT_FOUND, 'Rider not found');
  }

  if (rider.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'Rider account is deleted');
  }

  if (rider.role !== 'rider') {
    throw new AppError(httpStatus.FORBIDDEN, 'Only riders can accept bookings');
  }

  if (!rider.riderVerified) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your rider account is not verified yet',
    );
  }

  // Get booking with pickup location
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      riderId: true,
      pickupLocation: true,
      price: true,
      wasteSize: true,
      riderSearchStatus: true,
      riderSearchExpiresAt: true,
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.status !== 'pending') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot accept booking with status: ${booking.status}`,
    );
  }

  if (booking.riderId) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Booking has already been accepted by another rider',
    );
  }

  const bookingWeight = booking.wasteSize;
  if (
    !rider.wasteCapacity ||
    !Number.isFinite(rider.wasteCapacity) ||
    rider.wasteCapacity <= 0
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Set a valid waste capacity in kg before accepting bookings',
    );
  }
  if (
    !Number.isFinite(bookingWeight) ||
    bookingWeight <= 0 ||
    bookingWeight > rider.wasteCapacity
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Booking weight exceeds your waste capacity or is invalid',
    );
  }
  if (
    booking.riderSearchStatus !== 'active' ||
    (booking.riderSearchExpiresAt && booking.riderSearchExpiresAt <= new Date())
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Rider search has expired. The customer must retry the search',
    );
  }

  // Calculate distance and time
  let estimatedDistance: number | null = null;
  let estimatedTime: string | null = null;
  let chargeableDistance = 0;

  if (rider.location && booking.pickupLocation) {
    try {
      const riderLoc = rider.location as {
        type: string;
        coordinates: [number, number];
      };
      const pickupLoc = booking.pickupLocation as {
        type: string;
        coordinates: [number, number];
      };

      if (
        riderLoc.coordinates &&
        riderLoc.coordinates.length === 2 &&
        pickupLoc.coordinates &&
        pickupLoc.coordinates.length === 2
      ) {
        const [riderLon, riderLat] = riderLoc.coordinates;
        const [pickupLon, pickupLat] = pickupLoc.coordinates;

        estimatedDistance = calculateDistance(
          riderLat,
          riderLon,
          pickupLat,
          pickupLon,
        );
        const estimatedMinutes = estimateTimeInMinutes(estimatedDistance);
        estimatedTime = formatEstimatedTime(estimatedMinutes);
        chargeableDistance = estimatedDistance;
        console.log(
          `Calculated chargeable distance: ${estimatedDistance} km, estimated time: ${estimatedTime}`,
        );
      }
    } catch (error) {
      console.error('Error calculating distance:', error);
      // Continue without distance/time if calculation fails
    }
  }

  const calculatedPrice = calculateBookingFinalPrice(
    booking.wasteSize,
    chargeableDistance,
  );

  // Update booking
  const updatedBooking = await prisma.booking
    .update({
      where: {
        id: bookingId,
        status: 'pending',
        riderSearchStatus: 'active',
        AND: [
          { OR: [{ riderId: null }, { riderId: { isSet: false } }] },
          {
            OR: [
              { riderSearchExpiresAt: null },
              { riderSearchExpiresAt: { isSet: false } },
              { riderSearchExpiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      data: {
        riderId,
        status: 'accepted',
        acceptedAt: new Date(),
        estimatedDistance,
        estimatedTime,
        price: calculatedPrice,
        riderSearchStatus: 'accepted',
        nextRiderSearchAt: null,
        riderSearchLockUntil: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
          },
        },
      },
    })
    .catch((error: unknown) => {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new AppError(
          httpStatus.CONFLICT,
          'Booking is no longer available. It may have been accepted, cancelled or expired. Refresh the available bookings.',
        );
      }
      throw error;
    });

  await notificationService.createNotificationForUsers(
    [updatedBooking.userId, riderId],
    {
      type: 'booking_accepted',
      title: 'Booking Accepted',
      message: `${updatedBooking.rider?.name || 'A rider'} accepted your booking.`,
      data: {
        bookingId: updatedBooking.id,
        riderId,
        userId: updatedBooking.userId,
        status: updatedBooking.status,
      },
    },
  );

  emitToUser(updatedBooking.userId, 'booking:accepted', {
    bookingId: updatedBooking.id,
    riderId,
    userId: updatedBooking.userId,
    status: updatedBooking.status,
    message: `${updatedBooking.rider?.name || 'A rider'} accepted your booking.`,
  });

  emitToUser(updatedBooking.userId, 'booking:tracking:started', {
    bookingId: updatedBooking.id,
    riderId,
    userId: updatedBooking.userId,
    status: updatedBooking.status,
    message: 'Live tracking has started for your booking.',
  });

  return updatedBooking;
};

const retryRiderSearch = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      riderId: true,
      status: true,
      riderSearchStatus: true,
      riderSearchCycle: true,
    },
  });

  if (!booking || booking.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }
  if (booking.status !== 'pending' || booking.riderId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only an unaccepted pending booking can search again',
    );
  }
  if (booking.riderSearchStatus !== 'expired') {
    throw new AppError(
      httpStatus.CONFLICT,
      'The current rider search is still active',
    );
  }

  const now = new Date();
  const restarted = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      status: 'pending',
      riderId: null,
      riderSearchStatus: 'expired',
    },
    data: {
      riderSearchStatus: 'active',
      riderSearchCycle: booking.riderSearchCycle + 1,
      riderSearchStartedAt: now,
      riderSearchExpiresAt: new Date(now.getTime() + RIDER_SEARCH_DURATION_MS),
      nextRiderSearchAt: now,
      lastRiderSearchAt: null,
      notifiedRiderIds: [],
      creatorSearchExpiredNotifiedAt: null,
      riderSearchLockUntil: null,
    },
  });

  if (restarted.count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      'The booking search state changed. Please refresh and try again.',
    );
  }

  await processRiderSearch(booking.id);
  return prisma.booking.findUnique({ where: { id: booking.id } });
};

// Stop the current two-hour search without cancelling the customer's booking.
// All scheduler and rider-accept queries require riderSearchStatus "active".
const stopRiderSearch = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true, riderId: true, status: true, riderSearchStatus: true },
  });

  if (!booking || booking.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }
  if (booking.status !== 'pending' || booking.riderId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only an unaccepted pending booking search can be stopped');
  }
  if (booking.riderSearchStatus !== 'active') {
    throw new AppError(httpStatus.CONFLICT, 'Rider search is not currently active');
  }

  const stopped = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      userId,
      status: 'pending',
      riderId: null,
      riderSearchStatus: 'active',
    },
    data: {
      riderSearchStatus: 'stopped',
      nextRiderSearchAt: null,
      riderSearchLockUntil: null,
    },
  });

  if (stopped.count !== 1) {
    throw new AppError(httpStatus.CONFLICT, 'Rider search changed before it could be stopped');
  }

  return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
};

// Update booking status
const updateBookingStatus = async (
  bookingId: string,
  userId: string,
  payload: IUpdateBookingStatus,
) => {
  if (payload.status === 'accepted') {
    return acceptBooking(bookingId, userId);
  }
  if (payload.status === 'completed') {
    return markCompleted(bookingId, userId);
  }
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  // Check if user has access to update this booking
  if (booking.userId !== userId && booking.riderId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have access to update this booking',
    );
  }

  const updateData: any = {
    status: payload.status,
  };
  if (
    payload.status === 'in_progress' &&
    (booking.riderId !== userId ||
      !booking.garbageCollectedAt ||
      !booking.isPaid)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Garbage collection and payment must be confirmed before starting collection',
    );
  }

  // Set timestamp based on status
  if (payload.status === 'cancelled') {
    updateData.cancelledAt = new Date();
    updateData.riderSearchStatus = 'cancelled';
    updateData.nextRiderSearchAt = null;
    updateData.riderSearchLockUntil = null;
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
      rider: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
    },
  });

  return updatedBooking;
};

// Decline booking (Rider)
const declineBooking = async (
  bookingId: string,
  riderId: string,
  reason?: string,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  // Riders can only decline pending bookings that are not yet assigned
  // if (booking.status !== 'pending' && booking.status === 'accepted') {
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'Can only decline pending bookings',
  //   );
  // }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason,
      riderSearchStatus: 'cancelled',
      nextRiderSearchAt: null,
      riderSearchLockUntil: null,
    },
  });

  // Just return success - the booking remains available for other riders
  return { message: 'Booking declined successfully' };
};

// Mark rider arrived at pickup (Rider)
const markArrivedAtPickup = async (bookingId: string, riderId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.riderId !== riderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not assigned to this booking',
    );
  }

  if (booking.status !== 'accepted' && booking.status !== 'arrived_pickup') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark arrived from status: ${booking.status}`,
    );
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'arrived_pickup',
      arrivedAtPickup: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
      rider: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
    },
  });

  await notificationService.createNotificationForUsers(
    [updatedBooking.userId, riderId],
    {
      type: 'rider_arrived_pickup',
      title: 'Rider Arrived at Pickup',
      message: `${updatedBooking.rider?.name || 'Your rider'} has arrived at the pickup point.`,
      data: {
        bookingId: updatedBooking.id,
        riderId,
        userId: updatedBooking.userId,
        status: updatedBooking.status,
      },
    },
  );

  emitToUser(updatedBooking.userId, 'booking:arrived_pickup', {
    bookingId: updatedBooking.id,
    riderId,
    userId: updatedBooking.userId,
    status: updatedBooking.status,
    canPay: false,
    message: `${updatedBooking.rider?.name || 'Your rider'} has arrived at the pickup point.`,
  });

  // TODO: Send notification to customer that rider has arrived

  return updatedBooking;
};

const confirmHandover = async (
  bookingId: string,
  actorId: string,
  action: 'ready' | 'collect',
) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  const expectedActor = action === 'ready' ? booking.userId : booking.riderId;
  if (expectedActor !== actorId)
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You cannot confirm this handover',
    );
  if (!booking.riderId)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No rider is assigned to this booking',
    );
  const from = action === 'ready' ? 'arrived_pickup' : 'garbage_ready';
  const status = action === 'ready' ? 'garbage_ready' : 'garbage_collected';
  // A network retry must not create a second notification or move the booking backwards.
  if (booking.status === status) return booking;
  if (booking.status !== from)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot confirm garbage ${action} from status: ${booking.status}`,
    );
  const claimed = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      userId: booking.userId,
      riderId: booking.riderId,
      status: from,
    },
    data: {
      status,
      ...(action === 'ready'
        ? { garbageReadyAt: new Date() }
        : { garbageCollectedAt: new Date() }),
    },
  });
  if (!claimed.count)
    throw new AppError(
      httpStatus.CONFLICT,
      'Booking changed. Refresh before confirming handover',
    );
  const updatedBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });
  const event =
    action === 'ready' ? 'booking:garbage_ready' : 'booking:garbage_collected';
  const message =
    action === 'ready'
      ? 'The customer is ready to give the garbage. Confirm collection after receiving it.'
      : 'The rider has collected your garbage. You can now pay.';
  const data = {
    bookingId,
    userId: booking.userId,
    riderId: booking.riderId,
    status,
    canPay: action === 'collect',
    message,
  };
  const recipients = [booking.userId, booking.riderId];
  recipients.forEach(userId => emitToUser(userId, event, data));
  await notificationService.createNotificationForUsers(recipients, {
    type:
      action === 'ready'
        ? 'booking_garbage_ready'
        : 'booking_garbage_collected',
    title: action === 'ready' ? 'Garbage Ready' : 'Garbage Collected',
    message,
    data,
  });
  return updatedBooking;
};
const giveGarbage = (bookingId: string, userId: string) =>
  confirmHandover(bookingId, userId, 'ready');
const collectGarbage = (bookingId: string, riderId: string) =>
  confirmHandover(bookingId, riderId, 'collect');

// Mark payment collected at pickup (Rider)
const markPaymentCollectedAtPickup = async (
  bookingId: string,
  riderId: string,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.riderId !== riderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not assigned to this booking',
    );
  }

  if (booking.status !== 'garbage_collected') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark payment collected from status: ${booking.status}`,
    );
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'payment_collected',
      isPaid: true,
      paidAt: new Date(),
      paymentCollectedAt: new Date(),
    },
  });

  console.log(
    `Booking ${bookingId} marked as payment collected by rider ${riderId}`,
  );

  console.log(
    'Updated booking after marking payment collected:',
    updatedBooking,
  );

  await notificationService.createNotificationForUsers(
    [updatedBooking.userId, riderId],
    {
      type: 'booking_payment_collected',
      title: 'Payment Collected',
      message: 'Payment has been collected for this booking.',
      data: {
        bookingId: updatedBooking.id,
        riderId,
        userId: updatedBooking.userId,
        status: updatedBooking.status,
      },
    },
  );

  emitToUser(updatedBooking.userId, 'booking:payment_collected', {
    bookingId: updatedBooking.id,
    riderId,
    userId: updatedBooking.userId,
    status: updatedBooking.status,
    message: 'Payment has been collected for this booking.',
  });

  const transaction = await prisma.transaction.findFirst({
    where: { bookingId },
  });

  if (!transaction) {
    console.warn(
      `No transaction found for booking ${bookingId} when marking payment collected. This might indicate an issue with transaction creation.`,
    );
  }

  if (transaction) {
    const totalAmount = Number(transaction.amount);
    const commissionRate =
      await commissionServices.getActiveCommissionRateValue();
    const riderShare = totalAmount * (1 - commissionRate / 100);
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'success',
        commission: totalAmount - riderShare,
        comissionPercentage: commissionRate,
        riderEarnings: riderShare,
      },
    });

    console.log(
      'Updated transaction after marking payment collected:',
      updatedTransaction,
    );

    const updatedWallet = await prisma.wallet.update({
      where: { userId: riderId },
      data: { balance: { increment: riderShare } },
    });

    console.log(
      `Updated wallet for rider ${riderId} after marking payment collected:`,
      updatedWallet,
    );
  }

  if (updatedBooking) {
    return updatedBooking;
  } else {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to mark payment collected',
    );
  }
};

// Mark heading to station (Rider) - for bookings with dropoff to station
const markHeadingToStation = async (
  bookingId: string,
  riderId: string,
  stationId: string,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.riderId !== riderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not assigned to this booking',
    );
  }

  if (booking.status !== 'payment_collected') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark heading to station from status: ${booking.status}`,
    );
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'heading_to_station',
      headingToStationAt: new Date(),
      stationId: stationId,
    },
  });

  await notificationService.createNotificationForUsers(
    [updatedBooking.userId, riderId],
    {
      type: 'booking_heading_to_station',
      title: 'Heading to Station',
      message: `${bookingId} is now heading to the station.`,
      data: {
        bookingId: updatedBooking.id,
        riderId,
        userId: updatedBooking.userId,
        stationId,
        status: updatedBooking.status,
      },
    },
  );

  emitToUser(updatedBooking.userId, 'booking:heading_to_station', {
    bookingId: updatedBooking.id,
    riderId,
    userId: updatedBooking.userId,
    stationId,
    status: updatedBooking.status,
    message: 'Your rider is now heading to the station.',
  });

  if (updatedBooking) {
    return updatedBooking;
  } else {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to mark heading to station',
    );
  }
};

// Mark completed (Rider) - for bookings with dropoff to station after arriving at station
const markCompleted = async (bookingId: string, riderId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.riderId !== riderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not assigned to this booking',
    );
  }

  if (booking.status !== 'heading_to_station') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark completed from status: ${booking.status}`,
    );
  }

  const updatedBooking = await prisma.$transaction(async tx => {
    const completedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    await rewardPointServices.applyBookingCompletionPointRewards(
      tx,
      completedBooking,
    );

    return completedBooking;
  });

  await notificationService.createNotificationForUsers(
    [updatedBooking.userId, riderId],
    {
      type: 'booking_completed',
      title: 'Booking Completed',
      message: `Booking ${bookingId} has been marked as completed.`,
      data: {
        bookingId: updatedBooking.id,
        riderId,
        userId: updatedBooking.userId,
        status: updatedBooking.status,
        completedAt: updatedBooking.completedAt,
      },
    },
  );

  emitToUser(updatedBooking.userId, 'booking:completed', {
    bookingId: updatedBooking.id,
    riderId,
    userId: updatedBooking.userId,
    status: updatedBooking.status,
    completedAt: updatedBooking.completedAt,
    message: 'Your booking has been completed.',
  });

  if (updatedBooking) {
    return updatedBooking;
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to mark completed');
  }
};

// Start collecting waste (Rider)
const startCollection = async (bookingId: string, riderId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.riderId !== riderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not assigned to this booking',
    );
  }

  if (booking.status !== 'arrived_pickup') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot start collection from status: ${booking.status}`,
    );
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'in_progress',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
      rider: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
    },
  });

  return updatedBooking;
};

// Mark arrived at dropoff (Rider) - if dropoff location exists
const markArrivedAtDropoff = async (bookingId: string, riderId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.riderId !== riderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not assigned to this booking',
    );
  }

  if (booking.status !== 'in_progress') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark arrived at dropoff from status: ${booking.status}`,
    );
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'arrived_dropoff',
      arrivedAtDropoff: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
      rider: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
    },
  });

  return updatedBooking;
};

// Request payment (Rider)
const requestPayment = async (bookingId: string, riderId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.riderId !== riderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not assigned to this booking',
    );
  }

  // Can request payment from either arrived_dropoff or in_progress
  if (
    !['in_progress', 'arrived_dropoff', 'arrived_pickup'].includes(
      booking.status,
    )
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot request payment from status: ${booking.status}`,
    );
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'awaiting_payment',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
      rider: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
        },
      },
    },
  });

  // TODO: Send notification to customer to make payment

  return updatedBooking;
};

export const bookingServices = {
  giveGarbage,
  collectGarbage,
  getRiderAcceptedBookingDetails,
  getHistoryPage,
  getAcceptedBookings,
  createBooking,
  getEstimatedBookingPrice,
  deleteBooking,
  getAvailableBookingsForRider,
  getMyBookings,
  getRiderBookings,
  getBookingById,
  acceptBooking,
  updateBookingStatus,
  declineBooking,
  markArrivedAtPickup,
  markPaymentCollectedAtPickup,
  markHeadingToStation,
  markCompleted,
  startCollection,
  markArrivedAtDropoff,
  requestPayment,
  retryRiderSearch,
  stopRiderSearch,
  processDueRiderSearches,
};
