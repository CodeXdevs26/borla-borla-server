import { Router } from 'express';
import multer from 'multer';
import { ratingControllers } from './rating.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../users/user.constants';
import validateRequest from '../../middleware/validateRequest';
import { ratingValidations } from './rating.validation';

const router = Router();
const upload = multer();

// Create a rating for a booking (users only)
router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.institute),
  upload.none(),
  validateRequest(ratingValidations.createRatingZodSchema),
  ratingControllers.createRating,
);

// Get rating by booking ID (both user and rider can view)
router.get(
  '/:bookingId',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  ratingControllers.getRatingByBookingId,
);

// Update rating (users only)
router.patch(
  '/:bookingId',
  auth(USER_ROLE.user, USER_ROLE.institute),
  upload.none(),
  validateRequest(ratingValidations.updateRatingZodSchema),
  ratingControllers.updateRating,
);

// Delete rating (users only)
router.delete(
  '/:bookingId',
  auth(USER_ROLE.user, USER_ROLE.institute),
  ratingControllers.deleteRating,
);

export const ratingRoutes = router;
