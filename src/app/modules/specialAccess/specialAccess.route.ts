import { Router } from 'express';
import multer from 'multer';
import auth from 'app/middleware/auth';
import validateRequest from 'app/middleware/validateRequest';
import { specialAccessController } from './specialAccess.controller';
import { specialAccessValidation } from './specialAccess.validation';

const router = Router();
const upload = multer();

router.post(
  '/',
  upload.none(),
  auth('admin', 'supper_admin'),
  validateRequest(specialAccessValidation.createSpecialAccessUserZodSchema),
  specialAccessController.createSpecialAccessUser,
);

router.get(
  '/',
  auth('admin', 'supper_admin', 'sub_admin'),
  validateRequest(specialAccessValidation.getSpecialAccessUsersZodSchema),
  specialAccessController.getSpecialAccessUsers,
);

router.delete(
  '/:id',
  auth('admin', 'supper_admin'),
  specialAccessController.deleteSpecialAccessUser,
);

export const specialAccessRoutes = router;
