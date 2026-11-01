import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import { IGetBookingsQuery } from './booking.interface';
import prisma from '@app/shared/prisma';

interface ValidatedBookingQuery {
  status: string;
  page: number;
  limit: number;
  radius: number;
  latitude?: number;
  longitude?: number;
  populateUser: boolean;
}

/**
 * Validates and sanitizes booking query parameters
 * Handles empty strings, invalid values, and applies defaults
 */
export const validateBookingQuery = (
  query: IGetBookingsQuery,
): ValidatedBookingQuery => {
  const { status, page, limit, radius, latitude, longitude, populateUser } =
    query;

  // Validate and sanitize status
  const validStatus =
    status && status.trim() !== '' ? status.trim() : 'pending';

  const validStatuses = [
    'pending',
    'accepted',
    'arrived_pickup',
    'garbage_ready',
    'garbage_collected',
    'in_progress',
    'arrived_dropoff',
    'awaiting_payment',
    'completed',
    'cancelled',
  ];

  if (!validStatuses.includes(validStatus)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    );
  }

  // Validate and sanitize page
  const validPage =
    typeof page === 'number' && page > 0
      ? page
      : page
        ? parseInt(String(page), 10) || 1
        : 1;

  // Validate and sanitize limit (max 100)
  const validLimit =
    typeof limit === 'number' && limit > 0
      ? Math.min(limit, 100)
      : limit
        ? Math.min(parseInt(String(limit), 10) || 10, 100)
        : 10;

  // Validate and sanitize radius (default 10km)
  const validRadius =
    typeof radius === 'number' && radius > 0
      ? radius
      : radius
        ? parseFloat(String(radius)) || 10
        : 10;

  const validPopulateUser =
    typeof populateUser === 'boolean'
      ? populateUser
      : ['true', '1', 'yes'].includes(String(populateUser).toLowerCase());

  return {
    status: validStatus,
    page: validPage,
    limit: validLimit,
    radius: validRadius,
    latitude,
    longitude,
    populateUser: validPopulateUser,
  };
};

export const coordinatesAreEqual = (a: unknown, b: unknown): boolean => {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === 2 &&
    b.length === 2 &&
    typeof a[0] === 'number' &&
    typeof a[1] === 'number' &&
    typeof b[0] === 'number' &&
    typeof b[1] === 'number' &&
    a[0] === b[0] &&
    a[1] === b[1]
  );
};

export const closeLinearRingIfNeeded = (ring: unknown): unknown => {
  if (!Array.isArray(ring) || ring.length < 3) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (coordinatesAreEqual(first, last)) {
    return ring;
  }

  return [...ring, first];
};

export const normalizeZoneBoundary = (boundary: any) => {
  if (!boundary || typeof boundary !== 'object') {
    return boundary;
  }

  if (boundary.type === 'Polygon' && Array.isArray(boundary.coordinates)) {
    return {
      ...boundary,
      coordinates: boundary.coordinates.map((ring: unknown) =>
        closeLinearRingIfNeeded(ring),
      ),
    };
  }

  if (boundary.type === 'MultiPolygon' && Array.isArray(boundary.coordinates)) {
    return {
      ...boundary,
      coordinates: boundary.coordinates.map((polygon: unknown) => {
        if (!Array.isArray(polygon)) {
          return polygon;
        }

        return polygon.map((ring: unknown) => closeLinearRingIfNeeded(ring));
      }),
    };
  }

  return boundary;
};

export const pointInRing = (
  point: [number, number],
  ring: unknown,
): boolean => {
  if (!Array.isArray(ring) || ring.length < 4) {
    return false;
  }

  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];

    if (
      !Array.isArray(pi) ||
      !Array.isArray(pj) ||
      pi.length < 2 ||
      pj.length < 2
    ) {
      continue;
    }

    const xi = Number(pi[0]);
    const yi = Number(pi[1]);
    const xj = Number(pj[0]);
    const yj = Number(pj[1]);

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};

export const pointInPolygon = (
  point: [number, number],
  polygonRings: unknown,
): boolean => {
  if (!Array.isArray(polygonRings) || polygonRings.length === 0) {
    return false;
  }

  const outerRing = polygonRings[0];
  if (!pointInRing(point, outerRing)) {
    return false;
  }

  for (let i = 1; i < polygonRings.length; i++) {
    if (pointInRing(point, polygonRings[i])) {
      return false;
    }
  }

  return true;
};

export const isPointInsideBoundary = (
  point: [number, number],
  boundary: any,
): boolean => {
  const normalizedBoundary = normalizeZoneBoundary(boundary);

  if (
    !normalizedBoundary ||
    typeof normalizedBoundary !== 'object' ||
    !normalizedBoundary.type
  ) {
    return false;
  }

  if (normalizedBoundary.type === 'Polygon') {
    return pointInPolygon(point, normalizedBoundary.coordinates);
  }

  if (
    normalizedBoundary.type === 'MultiPolygon' &&
    Array.isArray(normalizedBoundary.coordinates)
  ) {
    return normalizedBoundary.coordinates.some((polygon: unknown) =>
      pointInPolygon(point, polygon),
    );
  }

  return false;
};

// Helper function to estimate time based on distance
// Assuming average speed of 20 km/h for waste collection vehicles in urban areas

export const estimateTimeInMinutes = (distanceInKm: number): number => {
  const averageSpeedKmH = 20;
  const timeInHours = distanceInKm / averageSpeedKmH;
  return Math.ceil(timeInHours * 60);
};

export const formatEstimatedTime = (timeInMinutes: number): string => {
  if (timeInMinutes < 60) {
    return `${timeInMinutes} min`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};
