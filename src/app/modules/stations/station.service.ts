import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import {
  ICreateStation,
  IUpdateStation,
  IStationQuery,
} from './station.interface';

const createStation = async (payload: ICreateStation) => {
  // Verify zone exists
  const zone = await prisma.zone.findUnique({
    where: { id: payload.zoneId, isDeleted: false },
  });

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, 'Zone not found');
  }

  const station = await prisma.station.create({
    data: {
      zoneId: payload.zoneId,
      name: payload.name,
      address: payload.address,
      location: payload.location,
    },
    include: {
      zone: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return station;
};

const getAllStations = async (query: IStationQuery) => {
  const { zoneId, searchTerm, page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const whereConditions: any = { isDeleted: false };

  if (zoneId) {
    whereConditions.zoneId = zoneId;
  }

  if (searchTerm) {
    whereConditions.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { address: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [stations, total] = await Promise.all([
    prisma.station.findMany({
      where: whereConditions,
      skip,
      take: Number(limit),
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.station.count({ where: whereConditions }),
  ]);

  return {
    data: stations,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
  };
};

const getStationById = async (id: string) => {
  const station = await prisma.station.findUnique({
    where: { id, isDeleted: false },
    include: {
      zone: {
        select: {
          id: true,
          name: true,
          boundary: true,
        },
      },
    },
  });

  if (!station) {
    throw new AppError(httpStatus.NOT_FOUND, 'Station not found');
  }

  return station;
};

const updateStation = async (id: string, payload: IUpdateStation) => {
  const station = await prisma.station.findUnique({
    where: { id, isDeleted: false },
  });

  if (!station) {
    throw new AppError(httpStatus.NOT_FOUND, 'Station not found');
  }

  const updatedStation = await prisma.station.update({
    where: { id },
    data: payload,
    include: {
      zone: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedStation;
};

const deleteStation = async (id: string) => {
  const station = await prisma.station.findUnique({
    where: { id, isDeleted: false },
  });

  if (!station) {
    throw new AppError(httpStatus.NOT_FOUND, 'Station not found');
  }

  // Hard delete
  await prisma.station.delete({
    where: { id },
  });

  return { message: 'Station deleted successfully' };
};

// Get stations by rider's zone
const getStationsByRiderZone = async (riderId: string) => {
  const rider = await prisma.user.findUnique({
    where: { id: riderId, role: 'rider', isDeleted: false },
    select: { zoneId: true },
  });

  if (!rider || !rider.zoneId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Rider not found or no zone assigned',
    );
  }

  const stations = await prisma.station.findMany({
    where: {
      zoneId: rider.zoneId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      address: true,
      location: true,
    },
  });

  return stations;
};

export const stationServices = {
  createStation,
  getAllStations,
  getStationById,
  updateStation,
  deleteStation,
  getStationsByRiderZone,
};
