import { Router } from 'express';
import path from 'path';
import auth from 'app/middleware/auth';
import fileUpload from 'app/middleware/fileUpload';
import validateRequest from 'app/middleware/validateRequest';
import { USER_ROLE } from '../users/user.constants';
import { emergencySupportControllers } from './emergencySupport.controller';
import { emergencySupportValidations } from './emergencySupport.validation';

const router = Router();
const imageUpload = fileUpload(
  path.join(process.cwd(), 'public', 'uploads', 'emergency-support'),
);

router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  imageUpload.array('images', 5),
  validateRequest(emergencySupportValidations.createEmergencySupportZodSchema),
  emergencySupportControllers.createEmergencySupport,
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  validateRequest(emergencySupportValidations.getEmergencySupportsZodSchema),
  emergencySupportControllers.getEmergencySupports,
);

router.patch(
  '/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  validateRequest(
    emergencySupportValidations.updateEmergencySupportStatusZodSchema,
  ),
  emergencySupportControllers.updateEmergencySupportStatus,
);

export const emergencySupportRoutes = router;
