type CompletedBooking = {
  id: string;
  userId: string;
  riderId: string | null;
};

// The transaction client is deliberately structural so this service can be
// used both inside Prisma transactions and directly by future verified-action
// workflows (quality, clean-up, and recycling).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RewardDatabase = any;

const awardPointsOnce = async (
  db: RewardDatabase,
  input: {
    userId: string;
    action:
      | 'first_successful_pickup'
      | 'ten_successful_pickups'
      | 'qualified_customer_referral'
      | 'qualified_rider_referral';
    points: number;
    eventKey: string;
    bookingId?: string;
    metadata?: Record<string, unknown>;
  },
) => {
  const existing = await db.rewardPointLedger.findUnique({
    where: { eventKey: input.eventKey },
    select: { id: true },
  });

  if (existing) return false;

  await db.rewardPointLedger.create({
    data: {
      userId: input.userId,
      action: input.action,
      points: input.points,
      eventKey: input.eventKey,
      bookingId: input.bookingId,
      metadata: input.metadata,
    },
  });
  await db.user.update({
    where: { id: input.userId },
    data: { rewardPoints: { increment: input.points } },
  });

  return true;
};

const applyBookingCompletionPointRewards = async (
  db: RewardDatabase,
  booking: CompletedBooking,
) => {
  const customer = await db.user.findUnique({
    where: { id: booking.userId },
    select: {
      id: true,
      role: true,
      referredBy: { select: { id: true, role: true } },
    },
  });
  const customerCompletedPickups = await db.booking.count({
    where: { userId: booking.userId, status: 'completed' },
  });

  if (customer && customerCompletedPickups === 1) {
    await awardPointsOnce(db, {
      userId: customer.id,
      action: 'first_successful_pickup',
      points: 10,
      eventKey: `first_successful_pickup:${customer.id}`,
      bookingId: booking.id,
    });

    if (
      customer.referredBy &&
      ['user', 'institute'].includes(customer.referredBy.role)
    ) {
      await awardPointsOnce(db, {
        userId: customer.referredBy.id,
        action: 'qualified_customer_referral',
        points: 20,
        eventKey: `qualified_customer_referral:${customer.id}`,
        bookingId: booking.id,
        metadata: { referredUserId: customer.id },
      });
    }
  }

  if (customerCompletedPickups === 10) {
    await awardPointsOnce(db, {
      userId: booking.userId,
      action: 'ten_successful_pickups',
      points: 25,
      eventKey: `ten_successful_pickups:customer:${booking.userId}`,
      bookingId: booking.id,
    });
  }

  if (!booking.riderId) return;

  const [rider, riderCompletedPickups] = await Promise.all([
    db.user.findUnique({
      where: { id: booking.riderId },
      select: {
        id: true,
        role: true,
        riderVerified: true,
        referredBy: { select: { id: true, role: true } },
      },
    }),
    db.booking.count({
      where: { riderId: booking.riderId, status: 'completed' },
    }),
  ]);

  if (riderCompletedPickups !== 10 || !rider) return;

  await awardPointsOnce(db, {
    userId: rider.id,
    action: 'ten_successful_pickups',
    points: 25,
    eventKey: `ten_successful_pickups:rider:${rider.id}`,
    bookingId: booking.id,
  });

  // Training is not stored in the current schema. riderVerified represents
  // the completed admin/KYC approval gate until training is modeled separately.
  if (rider.riderVerified && rider.referredBy?.role === 'rider') {
    await awardPointsOnce(db, {
      userId: rider.referredBy.id,
      action: 'qualified_rider_referral',
      points: 50,
      eventKey: `qualified_rider_referral:${rider.id}`,
      bookingId: booking.id,
      metadata: { referredRiderId: rider.id },
    });
  }
};

export const rewardPointServices = {
  applyBookingCompletionPointRewards,
};
