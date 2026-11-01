import { Router } from 'express';
import auth from 'app/middleware/auth';
import validateRequest from 'app/middleware/validateRequest';
import { earningsControllers } from './earnings.controller';
import { earningsValidations } from './earnings.validation';

const router = Router();

router.get(
  '/',
  auth('admin', 'supper_admin', 'sub_admin'),
  validateRequest(earningsValidations.earningsListZodSchema),
  earningsControllers.getEarnings,
);

router.get(
  '/rider/earning-details',
  auth('rider'),
  validateRequest(earningsValidations.riderEarningDetailsZodSchema),
  earningsControllers.getRiderEarningDetails,
);

router.get(
  '/:id',
  auth('admin', 'supper_admin', 'sub_admin'),
  validateRequest(earningsValidations.earningDetailsZodSchema),
  earningsControllers.getEarningDetailsById,
);

router.get(
  '/rider/my-earnings',
  auth('rider'),
  validateRequest(earningsValidations.riderEarningsZodSchema),
  earningsControllers.getRiderEarnings,
);

export const earningsRoutes = router;
