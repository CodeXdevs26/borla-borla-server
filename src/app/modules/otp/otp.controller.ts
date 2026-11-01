import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { otpServices } from './otp.service';
import httpStatus from 'http-status';
interface ResendOtpBody {
  email?: string;
  phoneNumber?: string;
}
const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const token = req?.headers?.token;

  const result = await otpServices.verifyOtp(token as string, req.body.otp);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'OTP verified successfully',
    data: result,
  });
});

const resendOtp = catchAsync(
  async (req: Request<{}, {}, ResendOtpBody>, res: Response) => {
    const result = await otpServices.resendOtp(req.body); // Pass entire object

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'OTP sent successfully',
      data: result,
    });
  },
);

export const otpControllers = {
  verifyOtp,
  resendOtp,
};
