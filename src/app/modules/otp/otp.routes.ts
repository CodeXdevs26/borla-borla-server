import { Router } from 'express';
import multer from 'multer';
import validateRequest from '../../middleware/validateRequest';
import { otpControllers } from './otp.controller';
import { resentOtpValidations } from './otp.validation';

const router = Router();
const upload = multer();

router.post(
  '/verify-otp',
  upload.none(),
  validateRequest(resentOtpValidations.verifyOtpZodSchema),
  otpControllers.verifyOtp,
);
router.post(
  '/resend-otp',
  upload.none(),
  validateRequest(resentOtpValidations.resentOtpZodSchema),
  otpControllers.resendOtp,
);

export const otpRoutes = router;
