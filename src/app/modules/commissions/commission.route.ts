import { Router } from 'express';
import multer from 'multer';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../users/user.constants';
import { commissionControllers } from './commission.controller';
import { commissionValidations } from './commission.validation';

const router = Router();
const upload = multer();

router.get(
  '/',
  auth(USER_ROLE.admin),
  commissionControllers.getCurrentCommissionRate,
);
router.post(
  '/',
  auth(USER_ROLE.admin),
  upload.none(),
  validateRequest(commissionValidations.commissionRateZodSchema),
  commissionControllers.setCommissionRate,
);
router.patch(
  '/',
  auth(USER_ROLE.admin),
  validateRequest(commissionValidations.commissionRateZodSchema),
  commissionControllers.updateCommissionRate,
);
router.delete(
  '/',
  auth(USER_ROLE.admin),
  commissionControllers.deleteCommissionRate,
);

export const commissionRoutes = router;
