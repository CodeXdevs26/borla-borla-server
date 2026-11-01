export interface IEmergencyLocation {
  type: 'Point';
  coordinates: [number, number];
}

export interface ICreateEmergencySupport {
  phoneNumber?: string;
  location: IEmergencyLocation;
  locationAddress?: string;
  images: string[];
  description: string;
}

export interface IEmergencySupportQuery {
  page?: number;
  limit?: number;
  status?: 'pending' | 'resolved';
}

export interface IUpdateEmergencySupportStatus {
  status: 'pending' | 'resolved';
}
