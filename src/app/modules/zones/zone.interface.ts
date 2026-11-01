export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface ICreateZone {
  name: string;
  boundary: {
    type: 'Polygon';
    coordinates: number[][][]; // GeoJSON Polygon format
  };
}

export interface IUpdateZone {
  name?: string;
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface IZoneQuery {
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export interface IZoneWithStats {
  id: string;
  name: string;
  boundary: any;
  totalRiders: number;
  activeRiders: number;
  offlineRiders: number;
  totalStations: number;
  createdAt: Date;
  updatedAt: Date;
}
