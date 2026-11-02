/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import HashPassword from '../../shared/hashPassword';
import pickQuery from '../../utils/pickQuery';
import { paginationHelper } from '../../helpers/pagination.helpers';
import { User } from '../../../generated/prisma';
import { sanitationChecklistServices } from '../sanitationChecklist/sanitationChecklist.service';
import prisma from '../../shared/prisma';
import {
  buildUserWhereClause,
  buildRiderDetailsPayload,
  enrichRidersWithStats,
  filterUsersByRadius,
  buildSortArray,
} from './user.helpers';

import { getS3KeyFromUrl, generatePresignedUrl } from '../../utils/s3';

const create = async (payload: User) => {
  try {
    if (!payload.email && !payload.phoneNumber) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Either email or phone number is required',
      );
    }
    const isExist = await prisma.user.findFirst({
      where: {
        OR: [
          ...(payload.email ? [{ email: payload.email }] : []),
          ...(payload.phoneNumber
            ? [{ phoneNumber: payload.phoneNumber }]
            : []),
        ],
      },
      include: {
        verification: {
          select: {
            status: true,
          },
        },
      },
    });

    payload['password'] = await HashPassword(payload?.password as string);

    if (isExist) {
      if (isExist.isDeleted) {
        throw new AppError(httpStatus.FORBIDDEN, 'This user was deleted');
      }

      if (isExist.status === 'blocked') {
        throw new AppError(httpStatus.FORBIDDEN, 'This user was blocked');
      }

      if (!isExist.verification?.status) {
        return await prisma.user.update({
          where: { id: isExist.id },
          data: payload,
        });
      }

      throw new AppError(
        httpStatus.CONFLICT,
        'User already exists and is verified',
      );
    }
    const result = await prisma.user.create({ data: payload });

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus?.BAD_GATEWAY, error?.message);
  }
};

const getAll = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const normalizedFilters: Record<string, any> = {
    ...filters,
    riderVerified:
      filters.riderVerified === 'true'
        ? true
        : filters.riderVerified === 'false'
          ? false
          : filters.riderVerified,
  };

  const { latitude, longitude, radius, role } = normalizedFilters;
  console.log('Filters received in service:', normalizedFilters);
  // Build where clause from filters
  const whereClause = buildUserWhereClause(normalizedFilters);

  // Calculate pagination
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);
  const sortArray = buildSortArray(sort);

  // Fetch users from database
  let users = await prisma.user.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: sortArray,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      profilePicture: true,
      phoneNumber: true,
      expireAt: false,
      createdAt: true,
      updatedAt: false,
      verification: {
        select: {
          status: true,
        },
      },
      deviceHistory: true,
      location: true,
      locationName: true,
      onlineStatus: true,
      riderVerified: true,
    },
  });

  // Apply location-based filtering if parameters provided
  if (latitude && longitude && radius) {
    users = filterUsersByRadius(users, latitude, longitude, parseFloat(radius));
  }

  // Enrich rider data with statistics
  if (role === 'rider' && users.length > 0) {
    users = await enrichRidersWithStats(users);
  }

  // Count total for metadata
  const totalCount = await prisma.user.count({ where: whereClause });
  const total = latitude && longitude && radius ? users.length : totalCount;

  return {
    users,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

const getById = async (
  id: string,
  includeDeviceHistory = false,
  includeRiderDocuments = false,
  role?: string,
  includeRiderDashboard = false,
) => {
  const result = await prisma.user.findUniqueOrThrow({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      onlineStatus: true,
      role: true,
      profilePicture: true,
      profilePictureS3: true,
      phoneNumber: true,
      rewardPoints: true,
      createdAt: true,
      verification: {
        select: {
          status: true,
        },
      },
      deviceHistory: includeDeviceHistory,
      documents: includeRiderDocuments,
      dateOfBirth: true,
      location: true,
      locationName: true,
      ghanaCardId: true,
      tricycleLicense: true,
      sanitationPermit: true,
      wasteCapacity: true,
      ghanaCardIdS3: true,
      referralProfile: {
        select: {
          code: true,
        },
      },
      zone: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const referralCode = result.referralProfile?.code ?? null;
  const { referralProfile: _referralProfile, ...profile } = result;
  const sanitationStatus =
    result.role === 'rider'
      ? {
          isSanitationCkecked: await sanitationChecklistServices.isFullyChecked(
            result.id,
          ),
        }
      : {};

  if ((includeRiderDashboard || role === 'rider') && result.role === 'rider') {
    const riderDetails = await buildRiderDetailsPayload(
      result.id,
      result.name,
      result.status,
      result.zone,
    );

    return {
      ...profile,
      ...sanitationStatus,
      referralCode,
      riderDetails,
    };
  }

  if (profile.ghanaCardIdS3 && Array.isArray(profile.ghanaCardIdS3)) {
    const ghanaCardPresignedUrls = await Promise.all(
      profile.ghanaCardIdS3.map((url: string) => {
        const key = getS3KeyFromUrl(url);
        return generatePresignedUrl(key);
      }),
    );
    profile.ghanaCardIdS3 = ghanaCardPresignedUrls;
  }

  return {
    ...profile,
    ...sanitationStatus,
    referralCode,
  };
};

const update = async (id: string, payload: Partial<User>) => {
  if (payload.wasteCapacity !== undefined) {
    const capacity = Number(payload.wasteCapacity);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Waste capacity must be a positive number in kg',
      );
    }
    payload.wasteCapacity = capacity;
  }
  // Check if payload has data to update
  if (!payload || !Object.keys(payload).length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No data provided for update');
  }

  // Let Prisma errors bubble up to global error handler
  const result = await prisma.user.update({
    where: { id },
    data: payload,
    include: {
      verification: true,
      deviceHistory: true,
    },
  });

  return result;
};

const deleteUser = async (id: string) => {
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: { isDeleted: true },
  });

  return result;
};

const toggleUserStatus = async (userId: string) => {
  // Get current user status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onlineStatus: true, isDeleted: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'User is deleted');
  }

  // Toggle the status
  const newStatus = user.onlineStatus === 'online' ? 'offline' : 'online';

  const result = await prisma.user.update({
    where: { id: userId },
    data: { onlineStatus: newStatus },
    select: {
      id: true,
      name: true,
      email: true,
      onlineStatus: true,
    },
  });

  return result;
};

const toggleAccountStatus = async (userId: string) => {
  // Get current user status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, isDeleted: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'User is deleted');
  }

  // Toggle the account status
  const newStatus = user.status === 'active' ? 'blocked' : 'active';

  const result = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  });

  return result;
};

const updateMyLocation = async (
  userId: string,
  payload: { latitude: number; longitude: number; locationName?: string },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDeleted: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'User is deleted');
  }

  // Create GeoJSON Point format
  const location = {
    type: 'Point',
    coordinates: [payload.longitude, payload.latitude],
  };

  const result = await prisma.user.update({
    where: { id: userId },
    data: {
      location,
      locationName: payload.locationName || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      location: true,
      locationName: true,
    },
  });

  return result;
};

export const userService = {
  create,
  update,
  getAll,
  getById,
  deleteUser,
  toggleUserStatus,
  toggleAccountStatus,
  updateMyLocation,
};
