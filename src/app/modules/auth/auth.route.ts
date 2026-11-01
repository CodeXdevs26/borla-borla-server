import { Router } from 'express';
import multer from 'multer';
import { authControllers } from './auth.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../users/user.constants';
import validateRequest from '../../middleware/validateRequest';
import { authValidations } from './auth.validation';
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
import extractFilePaths from '../../middleware/extractFilePaths';

const router = Router();
const upload = multer();

router.post(
  '/signup',
  fileUpload('public/uploads/ghana-cards', [
    'tricycleLicense',
    'sanitationPermit',
  ]).fields([
    { name: 'ghanaCardId', maxCount: 5 },
    { name: 'tricycleLicense', maxCount: 1 },
    { name: 'sanitationPermit', maxCount: 1 },
  ]),
  parseData(),
  extractFilePaths(),
  validateRequest(authValidations.signupZodSchema),
  authControllers.signup,
);

router.post(
  '/login',
  upload.none(),
  validateRequest(authValidations.loginZodSchema),
  authControllers.login,
);

router.post(
  '/google',
  upload.none(),
  validateRequest(authValidations.socialAuthZodSchema),
  authControllers.registerWithGoogle,
);

router.post(
  '/apple',
  upload.none(),
  validateRequest(authValidations.socialAuthZodSchema),
  authControllers.registerWithApple,
);

router.post('/refresh-token', authControllers.refreshToken);

router.patch(
  '/change-password',
  upload.none(),
  auth(
    USER_ROLE.super_admin,
    USER_ROLE.sub_admin,
    USER_ROLE.admin,
    USER_ROLE.user,
    USER_ROLE.institute,
  ),
  validateRequest(authValidations.changePasswordZodSchema),
  authControllers.changePassword,
);

router.patch(
  '/forgot-password',
  upload.none(),
  validateRequest(authValidations.forgotPasswordZodSchema),
  authControllers.forgotPassword,
);

router.patch(
  '/reset-password',
  upload.none(),
  validateRequest(authValidations.resetPasswordZodSchema),
  authControllers.resetPassword,
);

export const authRoutes = router;
