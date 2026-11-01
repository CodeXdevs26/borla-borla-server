export interface IFindRidersQuery {
  latitude?: number;
  longitude?: number;
  radius?: number; // in km
}

export interface ICoordinates {
  longitude: number;
  latitude: number;
}
