import AppError from 'app/error/AppError';
import prisma from 'app/shared/prisma';
import httpStatus from 'http-status';
import {
  IEarningDetails,
  IEarningRow,
  IEarningsListQuery,
} from './earnings.interface';

const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const amPm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }

  return `${day}-${month}-${year} ${hours}:${minutes} ${amPm}`;
};

const formatBookingStatus = (status?: string | null) => {
  if (!status) {
    return '';
  }

  return status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getEarnings = async (query: IEarningsListQuery) => {
  const { search, page: pageParam = 1, limit: limitParam = 12 } = query;

  const normalizedSearch =
    typeof search === 'string' ? search.trim() : undefined;

  const page =
    typeof pageParam === 'string' ? parseInt(pageParam, 10) : pageParam;
  const limit =
    typeof limitParam === 'string' ? parseInt(limitParam, 10) : limitParam;
  const skip = (page - 1) * limit;

  const where: any = {
    bookingId: {
      not: null,
    },
  };

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfLast30Days = new Date(now);
  startOfLast30Days.setDate(startOfLast30Days.getDate() - 29);
  startOfLast30Days.setHours(0, 0, 0, 0);

  if (normalizedSearch) {
    const matchedUsers = await prisma.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    const matchedUserIds = matchedUsers.map(user => user.id);

    const matchedBookings = await prisma.booking.findMany({
      where: {
        OR: [
          {
            userId: {
              in: matchedUserIds,
            },
          },
          {
            riderId: {
              in: matchedUserIds,
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    const matchedBookingIds = matchedBookings.map(booking => booking.id);

    where.bookingId = {
      in: matchedBookingIds,
    };
  }

  const [
    transactions,
    total,
    revenueLast30Days,
    todayRevenueAgg,
    todayRateAgg,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        booking: {
          select: {
            status: true,
            paymentMethod: true,
            pickupLocation: true,
            pickupAddress: true,
            dropoffLocation: true,
            dropoffAddress: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            rider: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({
      where: {
        bookingId: {
          not: null,
        },
        status: 'success',
        createdAt: {
          gte: startOfLast30Days,
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        bookingId: {
          not: null,
        },
        status: 'success',
        createdAt: {
          gte: startOfToday,
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        bookingId: {
          not: null,
        },
        status: 'success',
        createdAt: {
          gte: startOfToday,
          lte: now,
        },
      },
      _avg: {
        comissionPercentage: true,
      },
    }),
  ]);

  const totalRevenueLast30Days = Number(revenueLast30Days._sum.amount || 0);
  const todayRevenue = Number(todayRevenueAgg._sum.amount || 0);
  const averageRateValue = Number(todayRateAgg._avg.comissionPercentage || 0);

  const data: IEarningRow[] = transactions.map((transaction, index) => ({
    key: transaction.id,
    serial: skip + index + 1,
    passengerName: transaction.booking?.user?.name || 'N/A',
    riderName: transaction.booking?.rider?.name || 'N/A',
    passengerEmail: transaction.booking?.user?.email || 'N/A',
    riderEmail: transaction.booking?.rider?.email || 'N/A',
    date: formatDate(transaction.createdAt),
    amount: String(transaction.amount ?? ''),
    commission:
      transaction.comissionPercentage !== null &&
      transaction.comissionPercentage !== undefined
        ? `${transaction.comissionPercentage}%`
        : '',
    riderEarning:
      transaction.riderEarnings !== null &&
      transaction.riderEarnings !== undefined
        ? String(transaction.riderEarnings)
        : '',
    status: formatBookingStatus(transaction.booking?.status),
  }));

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
      totalRevenueLast30Days,
      todayRevenue,
      averageRate: `${averageRateValue}%`,
    },
  };
};

const getEarningDetailsById = async (id: string) => {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id,
    },
    include: {
      booking: {
        select: {
          status: true,
          paymentMethod: true,
          pickupLocation: true,
          pickupAddress: true,
          //   dropoffLocation: true,
          //   dropoffAddress: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          rider: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!transaction) {
    throw new AppError(httpStatus.NOT_FOUND, 'Earning transaction not found');
  }

  const details: IEarningDetails = {
    transactionId: transaction.id,
    hubtelId: transaction.hubtelId || '',
    salesInvoiceId: transaction.salesInvoiceId || '',
    checkoutId: transaction.checkoutId || '',
    passengerName: transaction.booking?.user?.name || 'N/A',
    riderName: transaction.booking?.rider?.name || 'N/A',
    passengerEmail: transaction.booking?.user?.email || 'N/A',
    riderEmail: transaction.booking?.rider?.email || 'N/A',
    date: formatDate(transaction.createdAt),
    amount: String(transaction.amount ?? ''),
    commission:
      transaction.comissionPercentage !== null &&
      transaction.comissionPercentage !== undefined
        ? `${transaction.comissionPercentage}%`
        : '',
    riderEarning:
      transaction.riderEarnings !== null &&
      transaction.riderEarnings !== undefined
        ? String(transaction.riderEarnings)
        : '',
    status: formatBookingStatus(transaction.booking?.status),
    paymentMethod: transaction.booking?.paymentMethod || '',
    pickupLocation: transaction.booking?.pickupLocation ?? null,
    pickupAddress: transaction.booking?.pickupAddress || '',
    // dropoffLocation: transaction.booking?.dropoffLocation ?? null,
    // dropoffAddress: transaction.booking?.dropoffAddress || null,
    reference: transaction.reference,
    clientReference: transaction.clientReference,
    paymentStatus: transaction.status,
  };

  return details;
};

const getRiderEarnings = async (
  riderId: string,
  filter: 'today' | 'weekly' | 'monthly' = 'monthly',
  page: number = 1,
  limit: number = 12,
) => {
  const skip = (page - 1) * limit;
  const now = new Date();

  // Calculate date range based on filter
  let startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  if (filter === 'today') {
    // Today only
  } else if (filter === 'weekly') {
    // Last 7 days
    startDate.setDate(startDate.getDate() - 6);
  } else if (filter === 'monthly') {
    // Last 30 days
    startDate.setDate(startDate.getDate() - 29);
  }

  const transactionWhere: any = {
    bookingId: {
      not: null,
    },
    status: 'success',
    createdAt: {
      gte: startDate,
      lte: now,
    },
    booking: {
      is: {
        riderId: riderId,
        status: 'completed',
      },
    },
  };

  const bookingWhere: any = {
    riderId: riderId,
    status: 'completed',
    createdAt: {
      gte: startDate,
      lte: now,
    },
  };

  // Get transactions
  const [transactions, totalCount, stats] = await Promise.all([
    prisma.transaction.findMany({
      where: transactionWhere,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        booking: {
          select: {
            paymentMethod: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.transaction.count({ where: transactionWhere }),
    prisma.booking.aggregate({
      where: bookingWhere,
      _count: true,
    }),
  ]);

  // Calculate totals
  const totalEarnings = transactions.reduce((sum, trans) => {
    return sum + (trans.amount || 0);
  }, 0);

  const totalCommission = transactions.reduce((sum, trans) => {
    const commission =
      ((trans.amount || 0) * (trans.comissionPercentage || 0)) / 100;
    return sum + commission;
  }, 0);

  const cashReceived = transactions.reduce((sum, trans) => {
    return sum + (trans.riderEarnings || 0);
  }, 0);

  const ridesCompleted = stats._count;

  // Format transaction list
  const transactionList = transactions.map((transaction, index) => ({
    transactionId: transaction.id,
    serial: skip + index + 1,
    userName: transaction.booking?.user?.name || 'N/A',
    date: formatDate(transaction.createdAt),
    paymentMethod: transaction.booking?.paymentMethod || 'N/A',
    amount: String(transaction.amount ?? 0),
    commission: String(transaction.comissionPercentage ?? 0),
    riderEarnings: String(transaction.riderEarnings ?? 0),
  }));

  return {
    data: {
      summary: {
        totalEarnings: Number(totalEarnings.toFixed(2)),
        ridesCompleted,
        totalCommission: Number(totalCommission.toFixed(2)),
        cashReceived: Number(cashReceived.toFixed(2)),
      },
      transactions: transactionList,
    },
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPage: Math.ceil(totalCount / limit),
    },
  };
};

type TEarningDetailsFilter = 'today' | 'weekly' | 'monthly';

const getEarningDetailsDateRange = (filter: TEarningDetailsFilter) => {
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

const getTrendBucketKey = (date: Date, filter: TEarningDetailsFilter) => {
  const day = date.toISOString().slice(0, 10);
  return filter === 'today'
    ? `${day}T${String(date.getUTCHours()).padStart(2, '0')}`
    : day;
};

const getTrendLabel = (date: Date, filter: TEarningDetailsFilter) => {
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

const buildEarningsTrend = (
  transactions: Array<{ createdAt: Date; amount: number }>,
  filter: TEarningDetailsFilter,
  startDate: Date,
  endDate: Date,
) => {
  const earningsByBucket = new Map<string, number>();
  for (const transaction of transactions) {
    const key = getTrendBucketKey(transaction.createdAt, filter);
    earningsByBucket.set(
      key,
      (earningsByBucket.get(key) || 0) + transaction.amount,
    );
  }

  const trend: Array<{ label: string; amount: number }> = [];
  const cursor = new Date(startDate);

  if (filter === 'today') {
    const finalHour = endDate.getUTCHours();
    for (let hour = 0; hour <= finalHour; hour += 1) {
      cursor.setUTCHours(hour, 0, 0, 0);
      trend.push({
        label: getTrendLabel(cursor, filter),
        amount: Number(
          (
            earningsByBucket.get(getTrendBucketKey(cursor, filter)) || 0
          ).toFixed(2),
        ),
      });
    }
    return trend;
  }

  while (cursor <= endDate) {
    trend.push({
      label: getTrendLabel(cursor, filter),
      amount: Number(
        (earningsByBucket.get(getTrendBucketKey(cursor, filter)) || 0).toFixed(
          2,
        ),
      ),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return trend;
};

const getRiderEarningDetails = async (
  riderId: string,
  filter: TEarningDetailsFilter = 'today',
) => {
  const { startDate, endDate } = getEarningDetailsDateRange(filter);

  const [wallet, transactions, ridesCompleted] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: riderId },
      select: { balance: true },
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
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        commission: true,
        riderEarnings: true,
        createdAt: true,
        booking: {
          select: {
            paymentMethod: true,
            user: {
              select: { name: true },
            },
          },
        },
      },
    }),
    prisma.booking.count({
      where: {
        riderId,
        status: 'completed',
        completedAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  const totalEarnings = transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const commission = transactions.reduce((total, transaction) => {
    if (transaction.commission !== null) {
      return total + transaction.commission;
    }
    if (transaction.riderEarnings !== null) {
      return (
        total + Math.max(0, transaction.amount - transaction.riderEarnings)
      );
    }
    return total;
  }, 0);
  const cashReceived = transactions.reduce(
    (total, transaction) =>
      transaction.booking?.paymentMethod === 'cash'
        ? total + transaction.amount
        : total,
    0,
  );

  const earningsTrend = buildEarningsTrend(
    transactions.map(transaction => ({
      createdAt: transaction.createdAt,
      amount: transaction.amount,
    })),
    filter,
    startDate,
    endDate,
  );

  const recentTransactions = transactions.slice(0, 4).map(transaction => ({
    title: `Ride with ${transaction.booking?.user?.name || 'Customer'}`,
    amount: Number(
      (transaction.riderEarnings ?? transaction.amount).toFixed(2),
    ),
    date: transaction.createdAt,
    paymentMethod:
      transaction.booking?.paymentMethod === 'cash' ? 'Cash' : 'Card',
  }));

  return {
    myBalance: Number((wallet?.balance || 0).toFixed(2)),
    totalEarnings: Number(totalEarnings.toFixed(2)),
    ridesCompleted,
    commission: Number((-commission).toFixed(2)),
    cashReceived: Number(cashReceived.toFixed(2)),
    earningsTrend,
    recentTransactions,
  };
};

export const earningsServices = {
  getEarnings,
  getEarningDetailsById,
  getRiderEarnings,
  getRiderEarningDetails,
};
