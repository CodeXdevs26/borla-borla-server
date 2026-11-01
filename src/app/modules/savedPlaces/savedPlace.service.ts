/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from '../../shared/prisma';
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import { ICreateSavedPlace, IUpdateSavedPlace } from './savedPlace.interface';

const createSavedPlace = async (userId: string, payload: ICreateSavedPlace) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Create GeoJSON Point format
  const location = {
    type: 'Point',
    coordinates: [payload.longitude, payload.latitude],
  };

  const savedPlace = await prisma.savedPlace.create({
    data: {
      userId,
      placeType: payload.placeType,
      placeTitle: payload.placeTitle,
      placeName: payload.placeName,
      address: payload.address,
      location,
    },
  });

  return savedPlace;
};

const getMySavedPlaces = async (userId: string) => {
  const savedPlaces = await prisma.savedPlace.findMany({
    where: {
      userId,
      isDeleted: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return savedPlaces;
};

const getSavedPlaceById = async (userId: string, placeId: string) => {
  const savedPlace = await prisma.savedPlace.findFirst({
    where: {
      id: placeId,
      userId,
      isDeleted: false,
    },
  });

  if (!savedPlace) {
    throw new AppError(httpStatus.NOT_FOUND, 'Saved place not found');
  }

  return savedPlace;
};

const updateSavedPlace = async (
  userId: string,
  placeId: string,
  payload: IUpdateSavedPlace,
) => {
  const savedPlace = await prisma.savedPlace.findFirst({
    where: {
      id: placeId,
      userId,
      isDeleted: false,
    },
  });

  if (!savedPlace) {
    throw new AppError(httpStatus.NOT_FOUND, 'Saved place not found');
  }

  const updateData: any = {};

  if (payload.placeType) updateData.placeType = payload.placeType;
  if (payload.placeTitle) updateData.placeTitle = payload.placeTitle;
  if (payload.placeName) updateData.placeName = payload.placeName;
  if (payload.address) updateData.address = payload.address;

  // Update location if coordinates are provided
  if (payload.latitude !== undefined && payload.longitude !== undefined) {
    updateData.location = {
      type: 'Point',
      coordinates: [payload.longitude, payload.latitude],
    };
  }

  const updatedPlace = await prisma.savedPlace.update({
    where: { id: placeId },
    data: updateData,
  });

  return updatedPlace;
};

const deleteSavedPlace = async (userId: string, placeId: string) => {
  const savedPlace = await prisma.savedPlace.findFirst({
    where: {
      id: placeId,
      userId,
      isDeleted: false,
    },
  });

  if (!savedPlace) {
    throw new AppError(httpStatus.NOT_FOUND, 'Saved place not found');
  }

  const deletedPlace = await prisma.savedPlace.update({
    where: { id: placeId },
    data: { isDeleted: true },
  });

  return deletedPlace;
};

export const savedPlaceService = {
  createSavedPlace,
  getMySavedPlaces,
  getSavedPlaceById,
  updateSavedPlace,
  deleteSavedPlace,
};
