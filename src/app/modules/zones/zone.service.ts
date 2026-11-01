import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import { ICreateZone, IUpdateZone, IZoneQuery } from './zone.interface';

const createZone = async (payload: ICreateZone) => {
  const zone = await prisma.zone.create({
    data: {
      name: payload.name,
      boundary: payload.boundary,
    },
  });

  return zone;
};

const getAllZones = async (query: IZoneQuery) => {
  const { searchTerm, page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const whereConditions: any = { isDeleted: false };

  if (searchTerm) {
    whereConditions.name = {
      contains: searchTerm,
      mode: 'insensitive',
    };
  }

  const [zones, total] = await Promise.all([
    prisma.zone.findMany({
      where: whereConditions,
      skip,
      take: Number(limit),
      include: {
        stations: {
          where: { isDeleted: false },
          select: { id: true, name: true, address: true },
        },
        riders: {
          where: { isDeleted: false, role: 'rider' },
          select: {
            id: true,
            name: true,
            onlineStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.zone.count({ where: whereConditions }),
  ]);

  // Calculate stats for each zone
  const zonesWithStats = zones.map(zone => ({
    id: zone.id,
    name: zone.name,
    boundary: zone.boundary,
    totalRiders: zone.riders.length,
    activeRiders: zone.riders.filter(r => r.onlineStatus === 'online').length,
    offlineRiders: zone.riders.filter(r => r.onlineStatus === 'offline').length,
    totalStations: zone.stations.length,
    stations: zone.stations,
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  }));

  return {
    data: zonesWithStats,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
  };
};

const getZoneById = async (id: string) => {
  const zone = await prisma.zone.findUnique({
    where: { id, isDeleted: false },
    include: {
      stations: {
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          address: true,
          location: true,
        },
      },
      riders: {
        where: { isDeleted: false, role: 'rider' },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          onlineStatus: true,
          location: true,
        },
      },
    },
  });

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, 'Zone not found');
  }

  // Calculate stats
  return {
    id: zone.id,
    name: zone.name,
    boundary: zone.boundary,
    totalRiders: zone.riders.length,
    activeRiders: zone.riders.filter(r => r.onlineStatus === 'online').length,
    offlineRiders: zone.riders.filter(r => r.onlineStatus === 'offline').length,
    totalStations: zone.stations.length,
    riders: zone.riders,
    stations: zone.stations,
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  };
};

const updateZone = async (id: string, payload: IUpdateZone) => {
  const zone = await prisma.zone.findUnique({
    where: { id, isDeleted: false },
  });

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, 'Zone not found');
  }

  const updatedZone = await prisma.zone.update({
    where: { id },
    data: payload,
  });

  return updatedZone;
};

const deleteZone = async (id: string) => {
  const zone = await prisma.zone.findUnique({
    where: { id, isDeleted: false },
    include: { riders: true },
  });

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, 'Zone not found');
  }

  // Check if zone has assigned riders
  if (zone.riders.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot delete zone with assigned riders. Please reassign riders first.',
    );
  }

  // Soft delete zone and its stations
  await prisma.$transaction([
    prisma.zone.update({
      where: { id },
      data: { isDeleted: true },
    }),
    prisma.station.updateMany({
      where: { zoneId: id },
      data: { isDeleted: true },
    }),
  ]);

  return { message: 'Zone deleted successfully' };
};

const assignRidersToZone = async (zoneId: string, riderId: string) => {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId, isDeleted: false },
  });

  const rider = await prisma.user.findUnique({
    where: { id: riderId, isDeleted: false },
  });

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, 'Zone not found');
  }
  if (!rider) {
    throw new AppError(httpStatus.NOT_FOUND, 'Rider not found');
  }

  // Update rider's zone assignment
  const updatedRider = await prisma.user.update({
    where: { id: riderId },
    data: { zoneId },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      riderVerified: true,
      zoneId: true,
      zone: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedRider;
};

const removeRiderFromZone = async (zoneId: string, riderId: string) => {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId, isDeleted: false },
  });

  const rider = await prisma.user.findUnique({
    where: { id: riderId, isDeleted: false },
  });

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, 'Zone not found');
  }

  if (!rider) {
    throw new AppError(httpStatus.NOT_FOUND, 'Rider not found');
  }

  // Remove rider's zone assignment
  const updatedRider = await prisma.user.update({
    where: { id: riderId },
    data: { zoneId: null },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      riderVerified: true,
      zoneId: true,
    },
  });

  return updatedRider;
};

export const zoneServices = {
  createZone,
  getAllZones,
  getZoneById,
  updateZone,
  deleteZone,
  assignRidersToZone,
  removeRiderFromZone,
};
