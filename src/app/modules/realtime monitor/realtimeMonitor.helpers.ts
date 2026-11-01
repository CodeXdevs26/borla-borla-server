import { bookingStatus } from '@prisma/client';
import {
  IRealtimeActivityItem,
  IRealtimeMonitorStatCard,
  IRealtimeRiderItem,
} from './realtimeMonitor.interface';

type IAcceptedTimePair = {
  requestedAt: Date;
  acceptedAt: Date | null;
};

export const getRelativeTimeLabel = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
};

export const toActivityStatus = (
  status: bookingStatus,
): IRealtimeActivityItem['status'] => {
  if (status === bookingStatus.pending) return 'Pending';
  if (status === bookingStatus.accepted) return 'Assigned';
  if (
    status === bookingStatus.arrived_pickup ||
    status === bookingStatus.garbage_ready ||
    status === bookingStatus.garbage_collected
  )
    return 'Pickup';
  return 'In Progress';
};

export const toActivityProgress = (status: bookingStatus) => {
  const progressMap: Partial<Record<bookingStatus, number>> = {
    [bookingStatus.pending]: 10,
    [bookingStatus.accepted]: 25,
    [bookingStatus.arrived_pickup]: 40,
    [bookingStatus.garbage_ready]: 45,
    [bookingStatus.garbage_collected]: 50,
    [bookingStatus.payment_collected]: 55,
    [bookingStatus.heading_to_station]: 70,
    [bookingStatus.in_progress]: 80,
    [bookingStatus.arrived_dropoff]: 90,
    [bookingStatus.awaiting_payment]: 95,
  };

  return progressMap[status];
};

export const mapRiderRealtimeStatus = (
  onlineStatus: 'online' | 'offline',
  isBusy: boolean,
): Pick<IRealtimeRiderItem, 'status' | 'mapStatus'> => {
  if (onlineStatus === 'offline') {
    return { status: 'Offline', mapStatus: 'pending' };
  }

  if (isBusy) {
    return { status: 'Busy', mapStatus: 'active' };
  }

  return { status: 'Available', mapStatus: 'available' };
};

export const getPercentChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

export const getLowerIsBetterImprovementPercent = (
  current: number,
  previous: number,
) => {
  if (previous === 0) return 0;
  return Number((((previous - current) / previous) * 100).toFixed(2));
};

const formatGrowthValue = (value: number) => {
  const absolute = Math.abs(value);
  return Number(absolute.toFixed(2)).toString();
};

export const createStatCard = (
  amount: string,
  increase: boolean,
  growth: number,
  onlyTimeLine = 'From yesterday',
): IRealtimeMonitorStatCard => ({
  amount,
  increase,
  growth: formatGrowthValue(growth),
  onlyTimeLine,
});

export const calculateAverageWaitTimeMinutes = (
  acceptedBookings: IAcceptedTimePair[],
) => {
  if (!acceptedBookings.length) return 0;

  return Number(
    (
      acceptedBookings.reduce((sum, booking) => {
        if (!booking.acceptedAt) return sum;
        const minutes =
          (booking.acceptedAt.getTime() - booking.requestedAt.getTime()) /
          (1000 * 60);
        return sum + Math.max(0, minutes);
      }, 0) / acceptedBookings.length
    ).toFixed(1),
  );
};
