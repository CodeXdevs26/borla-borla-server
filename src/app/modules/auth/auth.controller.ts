import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import { authServices } from './auth.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import config from '../../config';

// signup
const signup = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.signup(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Signup successful! Please verify your OTP.',
    data: result,
  });
});

// login
const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.login(req.body, req);
  const { refreshToken } = result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookieOptions: any = {
    secure: false,
    httpOnly: true,
    maxAge: 31536000000,
  };

  if (config.NODE_ENV === 'production') {
    cookieOptions.sameSite = 'none';
  }
  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.cookie('token', refreshToken, cookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged in successfully',
    data: result,
  });
});
const registerWithGoogle = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.registerWithGoogle(req.body, req);
  const { refreshToken } = result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookieOptions: any = {
    secure: false,
    httpOnly: true,
    maxAge: 31536000000,
  };

  if (config.NODE_ENV === 'production') {
    cookieOptions.sameSite = 'none';
  }
  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.cookie('token', refreshToken, cookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Google authentication successful',
    data: result,
  });
});

const registerWithApple = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.registerWithApple(req.body, req);
  const { refreshToken } = result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookieOptions: any = {
    secure: false,
    httpOnly: true,
    maxAge: 31536000000,
  };

  if (config.NODE_ENV === 'production') {
    cookieOptions.sameSite = 'none';
  }
  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.cookie('token', refreshToken, cookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Apple authentication successful',
    data: result,
  });
});

// change password
const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.changePassword(req?.user?.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password changed successfully',
    data: result,
  });
});

// forgot password
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.forgotPassword(req?.body?.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'An OTP sent to your email!',
    data: result,
  });
});

// reset password
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.resetPassword(
    req?.headers?.token as string,
    req?.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password reset successfully',
    data: result,
  });
});

// refresh token
const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  const result = await authServices.refreshToken(refreshToken);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token retrieved successfully',
    data: result,
  });
});

export const authControllers = {
  signup,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  registerWithGoogle,
  registerWithApple,
};
