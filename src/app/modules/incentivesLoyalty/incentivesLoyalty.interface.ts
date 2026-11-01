export interface IZoneRiderLoyaltyCardsQuery {
  zoneId?: string;
  zoneName?: string;
  limit?: number | string;
}

export interface IRiderLoyaltyCard {
  name: string;
  initials: string;
  rideCount: number;
  rating: number;
  todayRides: number;
  totalRides: number;
  extraRidesCompleted: number;
  status: 'bonus-eligible' | 'daily-target-achieved' | 'in-progress';
}

export interface ICustomerLoyaltyQuery {
  search?: string;
  page?: number | string;
  limit?: number | string;
}

export interface ICustomerLoyaltyBadge {
  label: string;
  variant: 'primary' | 'success' | 'warning' | 'info';
}

export interface ICustomerLoyaltyEntry {
  id: string;
  rank: number;
  name: string;
  profilePicture?: string | null;
  points: number;
  rides: number;
  rating: number;
  badges: ICustomerLoyaltyBadge[];
  totalBookingsCreated: number;
  completedBookings: number;
}
