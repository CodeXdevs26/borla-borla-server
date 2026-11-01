import { Router } from 'express';

import auth from '../../middleware/auth';
import parseData from '../../middleware/parseData';
import { USER_ROLE } from './user.constants';
import { userController } from './user.controller';
import validateRequest from '../../middleware/validateRequest';
import { userValidation } from './user.validation';
import fileUpload, { fileUploadMulti } from '../../middleware/fileUpload';
import path from 'path';

const router = Router();

const upload = fileUpload(
  path.join(process.cwd(), 'public', 'uploads', 'profile-pictures'),
);

const ghanaCardUpload = fileUpload(
  path.join(process.cwd(), 'public', 'uploads', 'ghana-cards'),
);

// Multi-destination upload for profile picture and Ghana cards
const multiUpload = fileUploadMulti({
  profilePicture: path.join(
    process.cwd(),
    'public',
    'uploads',
    'profile-pictures',
  ),
  ghanaCardId: path.join(process.cwd(), 'public', 'uploads', 'ghana-cards'),
});

// All specific paths MUST come before dynamic /:id routes

router.post(
  '/',
  upload.single('profilePicture'),
  parseData(),
  userController.createUser,
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  userController.getAllUser,
);

router.get(
  '/my-profile',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
  ),
  userController.getMyProfile,
);

router.patch(
  '/update-my-profile',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
  ),
  multiUpload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'ghanaCardId', maxCount: 5 }, // Allow up to 5 Ghana card images
  ]),
  parseData(),
  userController.updateMyProfile,
);

router.delete(
  '/delete-my-account',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.institute,
  ),
  userController.deleteMYAccount,
);

router.patch(
  '/toggle-my-status',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
  ),
  userController.toggleMyStatus,
);

router.patch(
  '/update-my-location',
  upload.none(),
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
  ),
  parseData(),
  validateRequest(userValidation.updateLocationZodSchema),
  userController.updateMyLocation,
);

// Admin: Toggle user account status (active/blocked)
router.patch(
  '/:id/toggle-status',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  userController.toggleAccountStatus,
);

// Dynamic parameter routes come LAST
router.get('/:id', userController.getUserById);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  multiUpload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'ghanaCardId', maxCount: 5 },
  ]),
  parseData(),
  userController.updateUser,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  userController.deleteUser,
);

export const userRoutes = router;
