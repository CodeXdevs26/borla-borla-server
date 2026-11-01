export interface IPickupsPerHour {
  hour: string;
  pickups: number;
}

export interface IAvgPickupTimeByDay {
  day: string;
  mins: number;
}

export interface ICompletionRate {
  completionRate: number;
  totalBookings: number;
  completedBookings: number;
}

export interface IZoneHealth {
  zone: string;
  zoneId: string;
  requests: number;
  completed: number;
  riders: number;
  avgWaitTime: string;
  completionRate: number;
  status: 'Healthy' | 'Watch' | 'Action Needed';
}

export interface IOperationsDashboard {
  pickupsPerHour: IPickupsPerHour[];
  avgPickupTimeByDay: IAvgPickupTimeByDay[];
  overallCompletionRate: ICompletionRate;
  zoneHealth: IZoneHealth[];
}

export interface IDashboardQuery {
  period?: 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  zoneId?: string;
}

export interface IPickupSuccessRate {
  day: string;
  rate: number;
}

export interface IPickupSuccessRateQuery {
  zoneId?: string;
  period?: 'weekly' | 'monthly' | 'yearly' | 'all-time';
  startDate?: string;
  endDate?: string;
}

export interface IZoneRanking {
  rank: number;
  zone: string;
  zoneId: string;
  revenue: number;
  pickups: number;
  growth: number;
  status: 'High' | 'Medium' | 'Low';
}

export interface ITopRider {
  rank: number;
  riderId: string;
  name: string;
  zone: string;
  trips: number;
  earnings: number;
  rating: number;
}

export interface IZoneTopPerformingRider {
  rank: number;
  name: string;
  zone: string;
  trips: number;
  earnings: number;
  rating: number;
}

export interface IRankingQuery {
  period?: 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  limit?: number | string; // String from query params, converted to number in service
}

export interface IZoneTopPerformingRidersQuery extends IRankingQuery {
  zoneId: string;
}

export interface IZoneDetails {
  zoneId: string;
  zoneName: string;
  totalRevenue: number;
  totalPickups: number;
  avgRating: number;
  activeRiders: number;
  growth: number;
  status: 'High' | 'Medium' | 'Low';
}

export interface IZoneTrendPoint {
  day: string;
  pickups: number;
  revenue: number;
}

export interface IZoneQuery extends IDashboardQuery {
  zoneId: string;
}

export interface IZoneComparison {
  zone: string;
  revenue: number;
  pickups: number;
}

export interface IZoneStat {
  zoneId: string;
  name: string;
  totalRiders: number;
  activeNow: number;
}

export interface IRiderListItem {
  riderId: string;
  name: string;
  email: string | null;
  location: string;
  zipCode: string;
  zoneId: string | null;
  zoneName: string | null;
  completedTrips: number;
  status: 'Online' | 'Offline' | 'Busy';
}

export interface IRiderListQuery {
  search?: string;
  zoneId?: string;
  status?: 'Online' | 'Offline' | 'Busy';
  page?: number | string;
  limit?: number | string;
}
