import { toPublicUploadPath } from '../../utils/filePathSanitizer';
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  IChangePassword,
  IJwtPayload,
  ILogin,
  IResetPassword,
  ISignup,
  ISocialAuth,
} from './auth.interface';
import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import { createToken, isPasswordMatched, verifyToken } from './user.utils';
import config from 'app/config';
import { Request } from 'express';
import UAParser from 'ua-parser-js';
import bcrypt from 'bcrypt';
import { generateOtp } from 'app/utils/otpGenerator';
import moment from 'moment';
import path from 'path';
import { sendEmail } from 'app/utils/mailSender';
import fs from 'fs';
import axios from 'axios';
import { notificationService } from '../notifications/notification.service';
import { generateUniqueReferralCode } from 'app/utils/referralCode';

const HUBTEL_DELIVERY_STATUS_DELAY_MS = 30_000;

const logHubtelSMSDeliveryStatus = async (
  messageId: string,
  phoneNumber: string,
) => {
  const clientId = config.HUBTEL_CLIENT_ID;
  const clientSecret = config.HUBTEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      `Hubtel SMS delivery status skipped for ${messageId}: credentials not found`,
    );
    return;
  }

  try {
    const response = await axios.get(
      `https://sms.hubtel.com/v1/messages/${encodeURIComponent(messageId)}`,
      {
        auth: {
          username: clientId,
          password: clientSecret,
        },
      },
    );
    const delivery = response.data?.data || response.data;

    console.log('Hubtel SMS delivery status:', {
      messageId,
      to: delivery?.to || phoneNumber,
      status: delivery?.status,
      networkId: delivery?.networkId,
      statusDescription:
        delivery?.statusDescription || response.data?.message || null,
      updateTime: delivery?.updateTime || null,
    });
  } catch (error: any) {
    console.error('Hubtel SMS delivery status error:', {
      messageId,
      to: phoneNumber,
      error: error.response?.data || error.message,
    });
  }
};

// New Hubtel SMS Function
export const sendHubtelSMS = async (phoneNumber: string, message: string) => {
  try {
    const clientId = config.HUBTEL_CLIENT_ID;
    const clientSecret = config.HUBTEL_CLIENT_SECRET;
    const senderId = config.HUBTEL_SENDER_ID;

    if (!clientId || !clientSecret || !senderId) {
      throw new Error('Hubtel credentials not found');
    }

    // Using the V1 Quick-Send URL format
    const url = `https://sms.hubtel.com/v1/messages/send`;

    const response = await axios.get(url, {
      params: {
        clientid: clientId,
        clientsecret: clientSecret,
        from: senderId,
        to: phoneNumber,
        content: message,
      },
    });
    console.log('Hubtel SMS response.data:', response.data);

    const messageId =
      response.data?.messageId || response.data?.data?.messageId;
    if (messageId) {
      const deliveryStatusTimer = setTimeout(() => {
        void logHubtelSMSDeliveryStatus(messageId, phoneNumber);
      }, HUBTEL_DELIVERY_STATUS_DELAY_MS);
      deliveryStatusTimer.unref();
    }

    // Handle the "Payment Required" status in  logs
    if (response.data.status === 12) {
      console.error(
        'HUBTEL ALERT: SMS failed. Status 12 - Insufficient Balance.',
      );
      return { success: false, error: 'Payment required on Hubtel account' };
    }

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Hubtel SMS Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

const signup = async (payload: ISignup) => {
  payload.email = payload.email?.trim().toLowerCase() || undefined;
  payload.phoneNumber = payload.phoneNumber?.trim() || undefined;
  if (!payload.email && !payload.phoneNumber)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Either email or phone number is required',
    );

  // Check if passwords match
  if (payload.password !== payload.confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Password and confirm password do not match',
    );
  }

  // Check if user already exists by email or phoneNumber
  const matchingUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...(payload.email ? [{ email: payload.email }] : []),
        ...(payload.phoneNumber ? [{ phoneNumber: payload.phoneNumber }] : []),
      ],
    },
    include: {
      verification: true,
      referralProfile: true,
    },
  });

  if (matchingUsers.length > 1)
    throw new AppError(
      httpStatus.CONFLICT,
      'Email and phone number belong to different accounts',
    );
  const existingUser = matchingUsers[0];
  if (
    existingUser &&
    (existingUser.isDeleted || existingUser.status === 'blocked')
  )
    throw new AppError(httpStatus.FORBIDDEN, 'This account is unavailable');
  if (existingUser && existingUser.verification?.status) {
    if (payload.email && existingUser.email === payload.email) {
      throw new AppError(
        httpStatus.CONFLICT,
        'User with this email already exists',
      );
    }
    if (
      payload.phoneNumber &&
      existingUser.phoneNumber === payload.phoneNumber
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        'User with this phone number already exists',
      );
    }
  }

  const submittedReferralCode = payload.referralCode?.trim().toUpperCase();
  let referredById = existingUser?.referredById || undefined;

  if (submittedReferralCode) {
    const referralProfile = await prisma.referralProfile.findUnique({
      where: { code: submittedReferralCode },
      select: {
        user: {
          select: {
            id: true,
            isDeleted: true,
            status: true,
          },
        },
      },
    });

    const referrer = referralProfile?.user;

    if (!referrer || referrer.isDeleted || referrer.status !== 'active') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid referral code');
    }

    if (existingUser?.id === referrer.id) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You cannot use your own referral code',
      );
    }

    if (
      existingUser?.referredById &&
      existingUser.referredById !== referrer.id
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Referral attribution cannot be changed',
      );
    }

    referredById = referrer.id;
  }

  const userReferralCode =
    existingUser?.referralProfile?.code || (await generateUniqueReferralCode());

  // Hash password
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  // Generate OTP
  const otp = generateOtp(4);
  const currentTime = new Date();
  const expiresAt = moment(currentTime).add(3, 'minutes');

  let user;

  // Determine role (default to 'user' if not provided)
  const userRole = payload.role || 'user';

  const riderDocuments =
    userRole === 'rider'
      ? [
          ...(payload.ghanaCardId || []).map(document => ({
            document,
            type: 'idCard' as const,
            status: 'pending' as const,
          })),
          ...(payload.tricycleLicense || []).map(document => ({
            document: toPublicUploadPath(document),
            type: 'tricycleLicense' as const,
            status: 'pending' as const,
          })),
          ...(payload.sanitationPermit || []).map(document => ({
            document: toPublicUploadPath(document),
            type: 'sanitationPermit' as const,
            status: 'pending' as const,
          })),
        ]
      : [];

  // If user exists but not verified, update the user
  if (existingUser) {
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        referredById,
        referralProfile: existingUser.referralProfile
          ? undefined
          : { create: { code: userReferralCode } },
        role: userRole,
        location: payload.location || null,
        locationName: payload.locationName || null,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        ghanaCardId: payload.ghanaCardId || [],
        tricycleLicense:
          userRole === 'rider'
            ? (payload.tricycleLicense || []).map(toPublicUploadPath)
            : [],
        sanitationPermit:
          userRole === 'rider'
            ? (payload.sanitationPermit || []).map(toPublicUploadPath)
            : [],
        wasteCapacity: userRole === 'rider' ? payload.wasteCapacity : null,
        riderVerified: userRole === 'rider' ? false : true, // Riders need admin approval
        password: hashedPassword,
        verification: {
          update: {
            otp: Number(otp),
            expiredAt: expiresAt.toDate(),
            status: false,
          },
        },
        documents: riderDocuments.length
          ? { create: riderDocuments }
          : undefined,
      },
      include: {
        verification: true,
        referralProfile: true,
      },
    });
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        referredById,
        referralProfile: { create: { code: userReferralCode } },
        role: userRole,
        location: payload.location || null,
        locationName: payload.locationName || null,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        ghanaCardId: payload.ghanaCardId || [],
        tricycleLicense:
          userRole === 'rider'
            ? (payload.tricycleLicense || []).map(toPublicUploadPath)
            : [],
        sanitationPermit:
          userRole === 'rider'
            ? (payload.sanitationPermit || []).map(toPublicUploadPath)
            : [],
        wasteCapacity: userRole === 'rider' ? payload.wasteCapacity : null,
        riderVerified: userRole === 'rider' ? false : true, // Riders need admin approval
        password: hashedPassword,
        verification: {
          create: {
            otp: Number(otp),
            expiredAt: expiresAt.toDate(),
            status: false,
          },
        },
        documents: riderDocuments.length
          ? { create: riderDocuments }
          : undefined,
      },
      include: {
        verification: true,
        referralProfile: true,
      },
    });
  }

  // Send OTP to email
  const otpEmailPath = path.join(
    __dirname,
    '../../../../public/view/signup_otp_mail.html',
  );

  if (payload.email)
    await sendEmail(
      payload.email,
      'Verify your account - Borla',
      fs
        .readFileSync(otpEmailPath, 'utf8')
        .replace('{{otp}}', otp)
        .replace('{{email}}', payload.email!)
        .replace('{{name}}', user.name),
    );

  // Create verification token
  const jwtPayload = {
    email: user.email,
    userId: user.id,
  };

  const verificationToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    '15m',
  );

  // 2. INTEGRATION: Send the SMS with the token/OTP
  const smsMessage = `Your Borla verification code is ${otp}. Use this token to verify your phone number:`;

  try {
    if (payload.phoneNumber)
      await sendHubtelSMS(payload.phoneNumber, smsMessage);
  } catch (err) {
    console.error('Failed to send Hubtel SMS:', err);
  }

  if (userRole === 'rider') {
    try {
      await notificationService.notifyRiderSignup({
        userId: user.id,
        name: user.name,
      });
    } catch (error) {
      console.error('Failed to emit rider signup notifications:', error);
    }
  }

  return {
    email: user.email,
    phoneNumber: user.phoneNumber,
    name: user.name,
    referralCode: user.referralProfile?.code,
    verificationToken,
    otp,
    message: 'Please verify the OTP to complete signup.',
  };
};

const login = async (payload: ILogin, req: Request) => {
  // Trim input
  if (payload.phoneNumber) {
    payload.phoneNumber = payload.phoneNumber.trim();
  }
  if (payload.email) {
    payload.email = payload.email.trim().toLowerCase();
  }

  if (!payload.email && !payload.phoneNumber)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Either email or phone number is required',
    );
  // Build where condition - support email or phoneNumber
  const whereCondition: any = {};
  if (payload.email) {
    whereCondition.email = payload.email;
  }
  if (payload.phoneNumber) {
    whereCondition.phoneNumber = payload.phoneNumber;
  }

  const user = await prisma.user.findFirst({
    where: whereCondition,
    include: {
      verification: {
        select: {
          status: true,
        },
      },
    },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  //   if (user?.registerWith !== REGISTER_WITH.credentials) {
  //     throw new AppError(
  //       httpStatus.BAD_REQUEST,
  //       `This account is registered with ${user.registerWith}, so you should try logging in using that method.`,
  //     );
  //   }

  if (!(await isPasswordMatched(payload.password, user.password as string))) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password does not match');
  }

  if (!user?.verification?.status) {
    throw new AppError(httpStatus.FORBIDDEN, 'User account is not verified');
  }

  // Check if rider is approved by admin
  // if (user.role === 'rider' && !user.riderVerified) {
  //   throw new AppError(
  //     httpStatus.FORBIDDEN,
  //     'Your rider account is pending admin approval. Please wait for verification.',
  //   );
  // }

  const jwtPayload: { userId: string; role: string } = {
    userId: user?.id?.toString() as string,
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    '';

  const userAgent = req.headers['user-agent'] || '';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  //   const device = {
  //     userId: user.id?.toString() as string,
  //     ip,
  //     browser: result.browser.name,
  //     os: result.os.name,
  //     device: result.device.model || 'Desktop',
  //     lastLogin: new Date().toISOString(),
  //   };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      deviceHistory: {
        create: {
          ip,
          browser: result.browser.name,
          os: result.os.name,
          device: result.device.model || 'Desktop',
        },
      },
    },
    include: {
      deviceHistory: true,
    },
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const changePassword = async (id: string, payload: IChangePassword) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!(await isPasswordMatched(payload?.oldPassword, user.password))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Old password does not match');
  }
  if (payload?.newPassword !== payload?.confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New password and confirm password do not match',
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload?.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const result = await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
    },
  });

  return result;
};

const forgotPassword = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const jwtPayload = {
    email: email,
    userId: user?.id,
  };

  const token = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    '3m',
  );

  const currentTime = new Date();
  const otp = generateOtp(4);
  const expiresAt = moment(currentTime).add(3, 'minute');

  console.log('otp', otp);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verification: {
        update: {
          otp: Number(otp),
          expiredAt: expiresAt.toDate(),
          status: false,
        },
      },
    },
  });

  const otpEmailPath = path.join(
    __dirname,
    '../../../../public/view/forgot_pass_mail.html',
  );

  await sendEmail(
    email,
    'Your reset password OTP is',
    fs
      .readFileSync(otpEmailPath, 'utf8')
      .replace('{{otp}}', otp)
      .replace('{{email}}', email),
  );
  return { email, token, otp };
};

const resetPassword = async (token: string, payload: IResetPassword) => {
  let decode;
  try {
    decode = verifyToken(token, config.jwt_access_secret as string);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err: any) {
    console.log(err);
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Session has expired. Please try again',
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: decode?.userId },
    include: {
      verification: {
        select: {
          status: true,
          expiredAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // if (new Date() > (user?.verification?.expiredAt as Date)) {
  //   throw new AppError(httpStatus.FORBIDDEN, 'Session has expired');
  // }

  if (!user?.verification?.status) {
    throw new AppError(httpStatus.FORBIDDEN, 'OTP is not verified yet');
  }

  if (payload?.newPassword !== payload?.confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New password and confirm password do not match',
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload?.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const result = await prisma.user.update({
    where: { id: decode?.userId },
    data: {
      password: hashedPassword,
      verification: {
        update: {
          otp: 0,
          expiredAt: null,
          status: true,
        },
      },
    },
  });

  return result;
};

const refreshToken = async (token: string) => {
  // Checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);
  const { userId } = decoded;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      verification: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  const jwtPayload: IJwtPayload = {
    userId: user?.id?.toString() as string,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  return {
    accessToken,
  };
};

const registerWithGoogle = async (payload: ISocialAuth, req: Request) => {
  payload.email = payload?.email?.trim().toLowerCase();

  let user = await prisma.user.findFirst({
    where: { email: payload.email },
    include: { verification: true },
  });

  if (!user) {
    const referralCode = await generateUniqueReferralCode();
    // Create new user with Google OAuth
    user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        profilePicture: payload.profilePicture,
        referralProfile: { create: { code: referralCode } },
        role: 'user',
        password: null,
        verification: {
          create: {
            otp: 0,
            expiredAt: null,
            status: true, // OAuth users are auto-verified
          },
        },
      },
      include: { verification: true },
    });
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  const jwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  // Track device history
  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    '';

  const userAgent = req.headers['user-agent'] || '';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      deviceHistory: {
        create: {
          ip,
          browser: result.browser.name,
          os: result.os.name,
          device: result.device.model || 'Desktop',
        },
      },
    },
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const registerWithApple = async (payload: ISocialAuth, req: Request) => {
  payload.email = payload?.email?.trim().toLowerCase();

  let user = await prisma.user.findFirst({
    where: { email: payload.email },
    include: { verification: true },
  });

  if (!user) {
    const referralCode = await generateUniqueReferralCode();
    // Create new user with Apple OAuth
    user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        profilePicture: payload.profilePicture,
        referralProfile: { create: { code: referralCode } },
        role: 'user',
        password: null,
        verification: {
          create: {
            otp: 0,
            expiredAt: null,
            status: true, // OAuth users are auto-verified
          },
        },
      },
      include: { verification: true },
    });
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  const jwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  // Track device history
  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    '';

  const userAgent = req.headers['user-agent'] || '';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      deviceHistory: {
        create: {
          ip,
          browser: result.browser.name,
          os: result.os.name,
          device: result.device.model || 'Desktop',
        },
      },
    },
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const sendTermiiSMS = async (phoneNumber: string, otp: string) => {
  try {
    const data = {
      api_key: config.TERMII_API_KEY, // Add this to your config/env
      to: phoneNumber,
      from: config.TERMII_SENDER_ID, // Or your registered Sender ID
      channel: config.TERMII_CHANNEL, // e.g., "generic", "dnd", etc.
      pin_attempts: 3,
      pin_time_to_live: 5,
      pin_length: 4,
      pin_type: 'NUMERIC',
      message_text: `Your Borla verification code is ${otp}`,
      pin_placeholder: otp,
    };

    // Using axios (ensure it's installed)
    await axios.post('https://api.ng.termii.com/api/sms/otp/send', data);
  } catch (error: any) {
    // Check if the error came from Termii's response
    if (error.response) {
      console.error('Termii API Error Details:', error.response.data);
    } else {
      console.error('Connection Error:', error.message);
    }
    // Re-throw with more detail during debugging
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.response?.data?.message || 'Failed to send SMS verification',
    );
  }
};

export const authServices = {
  signup,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  registerWithGoogle,
  registerWithApple,
};
