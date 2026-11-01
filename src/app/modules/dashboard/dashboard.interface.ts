// Dashboard Statistics
export interface IDashboardStats {
  totalUsers: number;
  totalRiders: number;
  totalRevenue: number;
  completionRate: number;
  todayRevenue: number;
  todayWasteCollections: number; // in Kg
  activeRiders: number;
  completedRidesToday: number;
  stats: {
    usersGrowth: number;
    ridersGrowth: number;
    revenueGrowth: number;
    completionRateChange: number;
    todayRevenueGrowth: number;
    wasteCollectionsGrowth: number;
    activeRidersGrowth: number;
    completedRidesTodayChange: number;
  };
}

// User Overview Chart
export interface IUserOverviewQuery {
  year?: string;
  userType?: 'user' | 'institute' | 'rider';
}

export interface IUserOverviewData {
  month: string;
  count: number;
}

// Revenue Chart
export interface IRevenueChartQuery {
  period: 'weekly' | 'monthly';
}

export interface IRevenueChartData {
  label: string;
  value: number;
}

// Zone comparison chart
export interface IZoneComparisonQuery {
  period?: 'weekly' | 'monthly';
}

export interface IZoneComparisonData {
  zone: string;
  revenue: number;
  pickups: number;
}

// Waste Type Distribution
export interface IWasteDistributionQuery {
  period: 'weekly' | 'monthly';
}

export interface IWasteTypeData {
  name: string;
  value: number;
  percentage: number;
}

// Recent Accounts List
export interface IRecentAccountsQuery {
  accountType?: 'user' | 'institute' | 'rider';
  status?: 'Active' | 'Inactive';
  page?: number | string;
  limit?: number | string;
}

export interface IRecentAccount {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string;
  type: 'user' | 'institute' | 'rider';
  registrationDate: Date;
  status: 'Active' | 'Inactive';
}
