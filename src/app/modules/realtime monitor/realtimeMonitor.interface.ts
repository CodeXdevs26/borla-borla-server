// Realtime Monitor
export interface IRealtimeMonitorStatCard {
  amount: string;
  increase: boolean;
  growth: string;
  onlyTimeLine: string;
}

export interface IRealtimeMonitorStats {
  ongoingRides: IRealtimeMonitorStatCard;
  availableRiders: IRealtimeMonitorStatCard;
  completedToday: IRealtimeMonitorStatCard;
  avgWaitTimeMinutes: IRealtimeMonitorStatCard;
}

export interface IRealtimeRiderItem {
  id: string;
  name: string;
  avatar: string | null;
  status: 'Busy' | 'Available' | 'Offline';
  mapStatus: 'active' | 'available' | 'pending';
  latitude: number | null;
  longitude: number | null;
}

export interface IRealtimeRiderListResponse {
  riders: IRealtimeRiderItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

export interface IRealtimeActivityItem {
  id: string;
  status: 'In Progress' | 'Pickup' | 'Assigned' | 'Pending';
  assignee: string;
  time: string;
  rider: string;
  location: string;
  type: string;
  weight: string;
  progress?: number;
}

export interface IRealtimeActivityResponse {
  activities: IRealtimeActivityItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}
