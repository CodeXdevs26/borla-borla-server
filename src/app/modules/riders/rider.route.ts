import { Router } from 'express';
import { riderControllers } from './rider.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../users/user.constants';
import validateRequest from '../../middleware/validateRequest';
import { riderValidations } from './rider.validation';

const router = Router();

// Find available riders within radius
router.get(
  '/available',
  auth(USER_ROLE.user, USER_ROLE.institute),
  validateRequest(riderValidations.findAvailableRidersQueryZodSchema),
  riderControllers.findAvailableRiders,
);

router.get(
  '/activity-report',
  auth(USER_ROLE.rider),
  validateRequest(riderValidations.activityReportQueryZodSchema),
  riderControllers.getActivityReport,
);

router.get(
  '/performance',
  auth(USER_ROLE.rider),
  validateRequest(riderValidations.performanceQueryZodSchema),
  riderControllers.getPerformance,
);

export const riderRoutes = router;
