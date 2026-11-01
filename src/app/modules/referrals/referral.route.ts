import { Router } from 'express';
import auth from 'app/middleware/auth';
import validateRequest from 'app/middleware/validateRequest';
import { USER_ROLE } from '../users/user.constants';
import { referralControllers } from './referral.controller';
import { referralValidations } from './referral.validation';

const router = Router();

router.get(
  '/history',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  validateRequest(referralValidations.referralHistoryQueryZodSchema),
  referralControllers.getMyReferralHistory,
);

export const referralRoutes = router;
