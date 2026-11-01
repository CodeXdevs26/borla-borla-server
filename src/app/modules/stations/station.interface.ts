export interface ICreateStation {
  zoneId: string;
  name: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface IUpdateStation {
  name?: string;
  address?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface IStationQuery {
  zoneId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}
