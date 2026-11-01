import { sendHubtelSMS } from '../auth/auth.service';
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import { status } from '../../../generated/prisma';
import { generateOtp } from '../../utils/otpGenerator';
import moment from 'moment';
import config from '../../config';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import path from 'path';
import { sendEmail } from '../../utils/mailSender';
import fs from 'fs';
import prisma from '../../shared/prisma';

const resendOtp = async (payload: {
  email?: string | null;
  phoneNumber?: string | null;
}) => {
  if (!payload?.email?.trim() && !payload?.phoneNumber?.trim()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Either email or phone number is required',
    );
  }

  try {
    const email = payload.email?.trim().toLowerCase();
    const phoneNumber = payload.phoneNumber?.trim();
    const user = await prisma.user.findFirst({
      where: {
        ...(email ? { email } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
      },
    });

    if (!user)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No account found for these contact details',
      );

    if (user?.status === status.blocked)
      throw new AppError(httpStatus.FORBIDDEN, 'This user has been blocked');

    if (user?.isDeleted)
      throw new AppError(httpStatus.FORBIDDEN, 'This user has been deleted');

    const otp = generateOtp(4);
    const expiresAt = moment().utc().add(3, 'minute');

    const updateOtp = await prisma.verification.upsert({
      where: {
        userId: user.id,
      },
      update: {
        otp: Number(otp),
        expiredAt: expiresAt.toDate(),
        status: false, // Force user to verify OTP again
      },

      create: {
        userId: user.id,
        otp: Number(otp),
        expiredAt: expiresAt.toDate(),
        status: false,
      },
    });

    if (!updateOtp)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Failed to resend OTP. Please try again later',
      );

    const jwtPayload = {
      email: user?.email,
      userId: user?.id,
    };
    const token = jwt.sign(jwtPayload, config.jwt_access_secret as Secret, {
      expiresIn: '3m',
    });

    const otpEmailPath = path.join(
      __dirname,
      '../../../../public/view/otp_mail.html',
    );

    if (payload.email && user.email)
      await sendEmail(
        user.email,
        'Your One Time OTP',
        fs
          .readFileSync(otpEmailPath, 'utf8')
          .replace('{{otp}}', otp)
          .replace('{{email}}', user.email),
      );

    if (payload.phoneNumber && user.phoneNumber)
      await sendHubtelSMS(
        user.phoneNumber,
        `Your Borla verification code is ${otp}.`,
      );
    return { token };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // If it's already an AppError, throw it as is
    if (error instanceof AppError) {
      throw error;
    }

    // Handle Prisma validation errors
    if (error.message?.includes('Invalid `prisma')) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Invalid email format or missing required fields',
      );
    }

    // Handle other unexpected errors
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to resend OTP. Please try again later',
    );
  }
};

const verifyOtp = async (token: string, otp: string | number) => {
  if (!token)
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');

  let decode: JwtPayload;

  try {
    decode = jwt.verify(
      token,
      config.jwt_access_secret as Secret,
    ) as JwtPayload;
  } catch (error: any) {
    console.error('JWT verification failed:', error);
    if (error.name === 'TokenExpiredError') {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Session has expired');
    }

    if (error.name === 'JsonWebTokenError') {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }

    throw new AppError(httpStatus.UNAUTHORIZED, 'Authentication failed');
  }

  const user = await prisma.user.findUnique({
    where: { id: decode.userId },
    include: { verification: true },
  });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  if (!user.verification) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Verification record not found');
  }

  // Check if user is already verified (for signup flow)
  if (user.verification.status === true && user.verification.otp === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your account is already verified',
    );
  }

  if (!user.verification?.expiredAt) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP expiration date missing');
  }

  if (new Date() > user.verification.expiredAt) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'OTP has expired. Please resend it',
    );
  }

  if (Number(otp) !== Number(user.verification.otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP did not match');
  }

  // Update verification record - mark status true, reset OTP & expiresAt
  const updateUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      expireAt: null,
      verification: {
        update: {
          where: { userId: user.id },
          data: {
            otp: 0,
            expiredAt: null,
            status: true,
          },
        },
      },
    },
  });

  const jwtPayload = {
    email: updateUser.email,
    role: updateUser.role,
    userId: updateUser.id,
  };

  const jwtToken = jwt.sign(jwtPayload, config.jwt_access_secret as Secret, {
    expiresIn: '30d',
  });

  return { user: updateUser, token: jwtToken };
};

export const otpServices = {
  verifyOtp,
  resendOtp,
};
