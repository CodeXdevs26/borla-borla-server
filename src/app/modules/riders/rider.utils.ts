import { ICoordinates } from './rider.interface';
import { EARTH_RADIUS_KM, PRICING_CONFIG } from './rider.constants';

// Extract coordinates from GeoJSON location
export const extractCoordinates = (location: any): ICoordinates | null => {
  if (
    !location ||
    typeof location !== 'object' ||
    !location.coordinates ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length < 2
  ) {
    return null;
  }

  return {
    longitude: parseFloat(location.coordinates[0]),
    latitude: parseFloat(location.coordinates[1]),
  };
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

// Format time duration
export const formatEstimatedTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}min`
    : `${hours}h`;
};

// Calculate estimated price based on distance and time
export const calculateEstimatedPrice = (
  distance: number,
  timeInMinutes: number,
): number => {
  const { baseFare, ratePerKm, ratePerMinute } = PRICING_CONFIG;
  const distanceCost = distance * ratePerKm;
  const timeCost = timeInMinutes * ratePerMinute;

  return parseFloat((baseFare + distanceCost + timeCost).toFixed(2));
};
