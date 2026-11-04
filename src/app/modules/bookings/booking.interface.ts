export interface ICreateBooking {
  wasteCategory: 'organic' | 'metal' | 'plastic' | 'general' | 'paper';
  wasteImages: string[];
  binSize: string;
  binQuantity: number;
  wasteSize: number;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  dropoffAddress?: string;
  vehicleType?: string;
  estimatedDistance?: number;
  estimatedTime?: string;
  paymentMethod: 'hubtel' | 'cash';
  price?: number;
  neighbours?: Array<{
    name: string;
    amount: number;
  }>;
  // Scheduling
  isScheduled?: boolean;
  scheduledFor?: string | Date; // ISO date string or Date object
  scheduledDate?: string; // "today", "tomorrow", or specific date
}

export interface IUpdateBookingStatus {
  status: 'accepted' | 'in_progress' | 'completed' | 'cancelled';
}

export interface IGetBookingsQuery {
  status?: string;
  page?: number;
  limit?: number;
  latitude?: number;
  longitude?: number;
  radius?: number; // in km
  populateUser?: boolean | string;
}
