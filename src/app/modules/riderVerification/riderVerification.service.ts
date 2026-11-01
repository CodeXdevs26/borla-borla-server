import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import { IRiderVerificationQuery } from './riderVerification.interface';
import { sendEmail } from 'app/utils/mailSender';
import path from 'path';
import fs from 'fs';

// Get all riders for verification (admin only)
const getPendingRiders = async (query: IRiderVerificationQuery) => {
  const { status, page = 1, limit = 10, searchTerm } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const whereCondition: any = {
    role: 'rider',
    documents: {
      some: {
        type: { in: ['idCard', 'tricycleLicense', 'sanitationPermit'] },
        status: status, // Filter by document status (pending/verified/rejected)
      },
    },
  };

  // Search by name, email, or phone
  if (searchTerm) {
    whereCondition.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { phoneNumber: { contains: searchTerm } },
    ];
  }

  console.log('Where condition for fetching riders:', whereCondition);

  const [riders, total] = await Promise.all([
    prisma.user.findMany({
      where: whereCondition,
      skip,
      take: Number(limit),
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        dateOfBirth: true,
        location: true,
        locationName: true,
        ghanaCardId: true,
        tricycleLicense: true,
        sanitationPermit: true,
        wasteCapacity: true,
        riderVerified: true,
        createdAt: true,
        documents: {
          where: {
            type: { in: ['idCard', 'tricycleLicense', 'sanitationPermit'] },
          },
          select: {
            id: true,
            document: true,
            status: true,
            type: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: riders,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
  };
};

// Get single rider details for verification
const getRiderById = async (userId: string) => {
  const rider = await prisma.user.findUnique({
    where: { id: userId, role: 'rider' },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      dateOfBirth: true,
      location: true,
      locationName: true,
      ghanaCardId: true,
      tricycleLicense: true,
      sanitationPermit: true,
      wasteCapacity: true,
      riderVerified: true,
      createdAt: true,
      documents: {
        where: {
          type: { in: ['idCard', 'tricycleLicense', 'sanitationPermit'] },
        },
        select: {
          id: true,
          document: true,
          status: true,
          type: true,
          createdAt: true,
        },
      },
    },
  });

  if (!rider) {
    throw new AppError(httpStatus.NOT_FOUND, 'Rider not found');
  }

  return rider;
};

// Approve rider verification
const approveRider = async (userId: string, zoneId: string) => {
  // Validate zoneId is provided and not empty
  if (!zoneId || zoneId.trim() === '') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Zone ID is required');
  }

  const rider = await prisma.user.findUnique({
    where: { id: userId, role: 'rider' },
  });

  if (!rider) {
    throw new AppError(httpStatus.NOT_FOUND, 'Rider not found');
  }

  if (rider.riderVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Rider is already verified');
  }

  // Verify zone exists
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId, isDeleted: false },
  });

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, 'Zone not found');
  }

  // Update rider verification status, assign zone, and update documents
  const result = await prisma.$transaction(async tx => {
    // Update user riderVerified status and assign zone
    const updatedRider = await tx.user.update({
      where: { id: userId },
      data: {
        riderVerified: true,
        zoneId: zoneId,
        onlineStatus: 'online',
      },
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

    // Update all rider signup documents to verified
    await tx.documents.updateMany({
      where: {
        userId: userId,
        type: { in: ['idCard', 'tricycleLicense', 'sanitationPermit'] },
      },
      data: {
        status: 'verified',
      },
    });

    return updatedRider;
  });

  // Send approval email to rider
  try {
    const approvalEmailPath = path.join(
      __dirname,
      '../../../../public/view/rider_approval_mail.html',
    );

    if (result.email)
      await sendEmail(
        result.email,
        'Rider Verification Approved - Borla',
        fs
          .readFileSync(approvalEmailPath, 'utf8')
          .replace('{{name}}', result.name),
      );
  } catch (emailError) {
    console.error('Failed to send approval email:', emailError);
    // Don't throw error - approval was successful even if email fails
  }

  return result;
};

// Reject rider verification
const rejectRider = async (userId: string) => {
  const rider = await prisma.user.findUnique({
    where: { id: userId, role: 'rider' },
  });

  if (!rider) {
    throw new AppError(httpStatus.NOT_FOUND, 'Rider not found');
  }

  if (rider.riderVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot reject an already verified rider',
    );
  }

  // Update documents to rejected
  const result = await prisma.$transaction(async tx => {
    // Update all rider signup documents to rejected
    await tx.documents.updateMany({
      where: {
        userId: userId,
        type: { in: ['idCard', 'tricycleLicense', 'sanitationPermit'] },
      },
      data: {
        status: 'rejected',
      },
    });

    // Get updated rider info
    const updatedRider = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        riderVerified: true,
      },
    });

    return updatedRider;
  });

  return result;
};

// Get verification statistics
const getVerificationStats = async () => {
  const [totalRiders, approvedRiders, pendingRiders, rejectedDocuments] =
    await Promise.all([
      prisma.user.count({
        where: { role: 'rider' },
      }),
      prisma.user.count({
        where: { role: 'rider', riderVerified: true },
      }),
      prisma.user.count({
        where: { role: 'rider', riderVerified: false },
      }),
      prisma.documents.count({
        where: {
          type: { in: ['idCard', 'tricycleLicense', 'sanitationPermit'] },
          status: 'rejected',
        },
      }),
    ]);

  return {
    totalRiders,
    approvedRiders,
    pendingRiders,
    rejectedDocuments,
  };
};

export const riderVerificationServices = {
  getPendingRiders,
  getRiderById,
  approveRider,
  rejectRider,
  getVerificationStats,
};
