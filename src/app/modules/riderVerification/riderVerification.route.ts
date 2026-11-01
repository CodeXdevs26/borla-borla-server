import { Router } from 'express';
import multer from 'multer';
import { riderVerificationControllers } from './riderVerification.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../users/user.constants';
import validateRequest from '../../middleware/validateRequest';
import { riderVerificationValidations } from './riderVerification.validation';

const router = Router();
const upload = multer();

// Get verification statistics (dashboard summary)
router.get(
  '/stats',
  auth(USER_ROLE.super_admin, USER_ROLE.admin),
  riderVerificationControllers.getVerificationStats,
);

// Get all riders for verification (with filters)
router.get(
  '/',
  auth(USER_ROLE.super_admin, USER_ROLE.admin),
  validateRequest(riderVerificationValidations.getRidersQueryZodSchema),
  riderVerificationControllers.getPendingRiders,
);

// Approve rider
router.patch(
  '/:id/approve',
  auth(USER_ROLE.super_admin, USER_ROLE.admin),
  upload.none(),
  validateRequest(riderVerificationValidations.approveRiderZodSchema),
  riderVerificationControllers.approveRider,
);

// Reject rider
router.patch(
  '/:id/reject',
  auth(USER_ROLE.super_admin, USER_ROLE.admin),
  riderVerificationControllers.rejectRider,
);

// Get single rider details
router.get(
  '/:id',
  auth(USER_ROLE.super_admin, USER_ROLE.admin),
  riderVerificationControllers.getRiderById,
);

export const riderVerificationRoutes = router;
