import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../users/user.constants';
import validateRequest from '../../middleware/validateRequest';
import { savedPlaceValidation } from './savedPlace.validation';
import { savedPlaceController } from './savedPlace.controller';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middleware/parseData';

const router = Router();
const storage = memoryStorage();
const upload = multer({ storage });

// Create a new saved place
router.post(
  '/',
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
  validateRequest(savedPlaceValidation.createSavedPlaceZodSchema),
  savedPlaceController.createSavedPlace,
);

// Get all my saved places
router.get(
  '/',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
  ),
  savedPlaceController.getMySavedPlaces,
);

// Get a specific saved place by ID
router.get(
  '/:id',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
  ),
  savedPlaceController.getSavedPlaceById,
);

// Update a saved place
router.patch(
  '/:id',
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
  validateRequest(savedPlaceValidation.updateSavedPlaceZodSchema),
  savedPlaceController.updateSavedPlace,
);

// Delete a saved place
router.delete(
  '/:id',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.institute,
    USER_ROLE.rider,
  ),
  savedPlaceController.deleteSavedPlace,
);

export const savedPlaceRoutes = router;
