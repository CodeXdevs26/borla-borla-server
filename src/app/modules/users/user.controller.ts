import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { UploadedFiles } from '@app/middleware/uploadMulti';
import {
  uploadToS3,
  getS3KeyFromUrl,
  deleteFromS3,
  deleteManyFromS3,
} from '../../utils/s3';
import { userService } from './user.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { otpServices } from '../otp/otp.service';
import fs from 'fs';
import prisma from '../../shared/prisma';
import path from 'path';
import { toPublicUploadPath } from '../../utils/filePathSanitizer';

const createUser = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    // Local storage - save file path instead of uploading to S3
    req.body.profilePicture = req.file.path;
    // Uncomment below to use S3 upload
    // req.body.profilePicture = await uploadToS3({
    //   file: req.file,
    //   fileName: `images/user/profile/${Math.floor(100000 + Math.random() * 900000)}`,
    // });
  }
  const result = await userService.create(req.body);
  const sendOtp = await otpServices.resendOtp({
    email: result.email,
    phoneNumber: result.phoneNumber,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User created successfully',
    data: { user: result, otpToken: sendOtp },
  });
});

const getAllUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getAll(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users fetched successfully',
    data: result,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const includeDeviceHistory = req.query.includeDeviceHistory === 'true';
  const includeRiderDocuments = req.query.includeRiderDocuments === 'true';
  const includeRiderDashboard = req.query.includeRiderDashboard === 'true';
  const role = req.query.role as string | undefined;
  const result = await userService.getById(
    req.params.id as string,
    includeDeviceHistory,
    includeRiderDocuments,
    role,
    includeRiderDashboard,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User fetched successfully',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const includeDeviceHistory = req.query.includeDeviceHistory === 'true';
  const includeRiderDocuments = req.query.includeRiderDocuments === 'true';
  const result = await userService.getById(
    req?.user?.userId,
    includeDeviceHistory,
    includeRiderDocuments,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile fetched successfully',
    data: result,
  });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  // Get old user data for file cleanup
  const user = await prisma.user.findUnique({
    where: { id: req.params.id as string },
    select: { profilePicture: true, ghanaCardId: true },
  });

  // Handle multiple file uploads (using upload.fields())
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // Handle profile picture upload
  if (files?.profilePicture && files.profilePicture[0]) {
    // Delete old profile picture if exists
    if (user?.profilePicture && fs.existsSync(user.profilePicture)) {
      fs.unlinkSync(user.profilePicture);
    }

    // Local storage - save file path
    req.body.profilePicture = files.profilePicture[0].path;
    // Uncomment below to use S3 upload
    // req.body.profilePicture = await uploadToS3({
    //   file: files.profilePicture[0],
    //   fileName: `images/user/profile/${Math.floor(100000 + Math.random() * 900000)}`,
    // });
  }

  // Handle Ghana card uploads (multiple files)
  if (files?.ghanaCardId && files.ghanaCardId.length) {
    // Delete old Ghana card images if exists
    if (user?.ghanaCardId && Array.isArray(user.ghanaCardId)) {
      user.ghanaCardId.forEach(cardPath => {
        if (fs.existsSync(cardPath)) {
          fs.unlinkSync(cardPath);
        }
      });
    }

    // Save all Ghana card image paths
    req.body.ghanaCardId = files.ghanaCardId.map(file => file.path);
    // Uncomment below to use S3 upload
    // req.body.ghanaCardId = await Promise.all(
    //   files.ghanaCardId.map(file =>
    //     uploadToS3({
    //       file,
    //       fileName: `images/user/ghana-cards/${Math.floor(100000 + Math.random() * 900000)}`,
    //     }),
    //   ),
    // );
  }

  const result = await userService.update(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User updated successfully',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  // Get old user data for file cleanup
  const user = await prisma.user.findUnique({
    where: { id: req.user?.userId },
    select: {
      profilePicture: true,
      ghanaCardId: true,
      profilePictureS3: true,
      ghanaCardIdS3: true,
    },
  });

  // Handle multiple file uploads (using upload.fields())
  const files = req.files as UploadedFiles;
  const updateBody = { ...req.body };

  console.log('Files received in updateMyProfile:', files);
  // Handle profile picture upload
  if (files?.profilePicture && files.profilePicture[0]) {
    const profileFile = files.profilePicture[0];
    const fileBuffer = fs.readFileSync(profileFile.path); // Read the saved file
    // Delete old profile picture if exists

    try {
      if (user?.profilePicture && fs.existsSync(user.profilePicture)) {
        fs.unlinkSync(user.profilePicture);
      }
    } catch (err) {
      console.error('Failed to delete old profile picture:', err);
    }

    // Delete old one from S3 if it exists
    if (user?.profilePictureS3) {
      const oldKey = getS3KeyFromUrl(user.profilePictureS3);
      if (oldKey) {
        const deletedFromS3 = await deleteFromS3(oldKey);
        console.log('Deleted old profile picture from S3:', deletedFromS3);
      }
    }

    // Local storage - save reusable public path
    updateBody.profilePicture = toPublicUploadPath(profileFile.path);

    const fileName = `images/user/profile/${Date.now()}-${profileFile.originalname}`;

    // Uncomment below to use S3 upload
    updateBody.profilePictureS3 = await uploadToS3({
      file: { ...profileFile, buffer: fileBuffer }, // Pass the buffer manually,
      fileName,
      contentType: profileFile.mimetype,
    });

    console.log('req.body.profilePictureS3:', req.body.profilePictureS3);
  }

  // Handle Ghana card uploads (multiple files)
  if (files?.ghanaCardId && files.ghanaCardId.length) {
    // Delete old Ghana card images if exists
    if (user?.ghanaCardId && Array.isArray(user.ghanaCardId)) {
      user.ghanaCardId.forEach(cardPath => {
        if (fs.existsSync(cardPath)) {
          fs.unlinkSync(cardPath);
        }
      });
    }

    // Delete old cards from S3
    if (user?.ghanaCardIdS3 && Array.isArray(user.ghanaCardIdS3)) {
      const oldKeys = user.ghanaCardIdS3
        .map(url => getS3KeyFromUrl(url))
        .filter(Boolean);
      if (oldKeys.length) {
        const deletetedCards = await deleteManyFromS3(oldKeys);
        console.log('Deleted old Ghana cards from S3:', deletetedCards);
      }
    }

    // Save all Ghana card image paths in reusable public format
    updateBody.ghanaCardId = files.ghanaCardId.map(file =>
      toPublicUploadPath(file.path),
    );

    // Uncomment below to use S3 upload
    updateBody.ghanaCardIdS3 = await Promise.all(
      files.ghanaCardId.map(file => {
        const fileBuffer = fs.readFileSync(file.path); // Read each file!
        return uploadToS3({
          file: { ...file, buffer: fileBuffer }, // Pass the buffer,
          fileName: `images/user/ghana-cards/${Date.now()}-${file.originalname}`,
          contentType: file.mimetype,
        });
      }),
    );
  }

  if (!updateBody || !Object.keys(updateBody).length) {
    sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'No data provided for update. Please send at least one field.',
      data: null,
    });
    return;
  }

  // Handle location update if coordinates are provided
  if (updateBody.latitude && updateBody.longitude) {
    const latitude =
      typeof updateBody.latitude === 'string'
        ? parseFloat(updateBody.latitude)
        : updateBody.latitude;
    const longitude =
      typeof updateBody.longitude === 'string'
        ? parseFloat(updateBody.longitude)
        : updateBody.longitude;

    updateBody.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    // Remove the raw coordinates from body
    delete updateBody.latitude;
    delete updateBody.longitude;
  }

  const result = await userService.update(req?.user?.userId, updateBody);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile updated successfully',
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.deleteUser(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});

const deleteMYAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.deleteUser(req.user?.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});

const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.toggleUserStatus(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User status toggled to ${result.onlineStatus} successfully`,
    data: result,
  });
});

const toggleMyStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.toggleUserStatus(req.user?.userId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Your status is now ${result.onlineStatus}`,
    data: result,
  });
});

const toggleAccountStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.toggleAccountStatus(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User account is now ${result.status}`,
    data: result,
  });
});

const updateMyLocation = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.updateMyLocation(
    req.user?.userId as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location updated successfully',
    data: result,
  });
});

export const userController = {
  createUser,
  getAllUser,
  getUserById,
  getMyProfile,
  updateUser,
  updateMyProfile,
  deleteUser,
  deleteMYAccount,
  toggleUserStatus,
  toggleMyStatus,
  toggleAccountStatus,
  updateMyLocation,
};
