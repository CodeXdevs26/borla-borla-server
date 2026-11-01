import { Router } from 'express';
import { bookingControllers } from './booking.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../users/user.constants';
import validateRequest from '../../middleware/validateRequest';
import { bookingValidations } from './booking.validation';
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
import path from 'path';

const router = Router();

// Configure file upload for waste images
const upload = fileUpload(
  path.join(process.cwd(), 'public', 'uploads', 'waste-images'),
);

// ============================================
// USER ROUTES (for customers)
// ============================================

// Create a new booking (with waste images)
router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.institute),
  upload.array('wasteImages', 5), // Allow up to 5 waste images
  parseData(),
  validateRequest(bookingValidations.createBookingZodSchema),
  bookingControllers.createBooking,
);

router.delete(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.institute),
  bookingControllers.deleteBooking,
);

// Get terminal booking history for the authenticated customer or rider.
router.get(
  '/history',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  bookingControllers.getHistoryPage,
);

router.get(
  '/my-bookings',
  auth(USER_ROLE.user, USER_ROLE.institute),
  validateRequest(bookingValidations.getBookingsQueryZodSchema),
  bookingControllers.getMyBookings,
);

// Restart an expired two-hour rider search. No request body is required.
router.post(
  '/:id/retry-rider-search',
  auth(USER_ROLE.user, USER_ROLE.institute),
  bookingControllers.retryRiderSearch,
);

// ============================================
// RIDER ROUTES
// ============================================

// Get available bookings (for riders to see pending requests in their area)
router.get(
  '/available',
  auth(USER_ROLE.rider),
  validateRequest(bookingValidations.getBookingsQueryZodSchema),
  bookingControllers.getAvailableBookings,
);

// Get rider's accepted bookings
router.get(
  '/rider-accepted-bookings',
  auth(USER_ROLE.rider),
  bookingControllers.getRiderAcceptedBookingDetails,
);

router.get(
  '/accepted',
  auth(USER_ROLE.rider),
  bookingControllers.getAcceptedBookings,
);

router.get(
  '/rider-bookings',
  auth(USER_ROLE.rider),
  validateRequest(bookingValidations.getBookingsQueryZodSchema),
  bookingControllers.getRiderBookings,
);

// Accept a booking (rider accepts the ride request)
router.patch(
  '/:id/accept',
  auth(USER_ROLE.rider),
  bookingControllers.acceptBooking,
);

// Decline a booking (rider declines the ride request)
router.patch(
  '/:id/decline',
  upload.none(),
  auth(USER_ROLE.rider, USER_ROLE.user, USER_ROLE.institute),
  bookingControllers.declineBooking,
);

// Mark arrived at pickup location (rider notifies customer)
router.patch(
  '/:id/arrive-pickup',
  auth(USER_ROLE.rider),
  bookingControllers.markArrivedAtPickup,
);

// Mark payment collected at pickup (rider collects payment from customer)
router.patch(
  '/:id/give-garbage',
  auth(USER_ROLE.user, USER_ROLE.institute),
  validateRequest(bookingValidations.handoverZodSchema),
  bookingControllers.giveGarbage,
);
router.patch(
  '/:id/collect-garbage',
  auth(USER_ROLE.rider),
  validateRequest(bookingValidations.handoverZodSchema),
  bookingControllers.collectGarbage,
);

router.patch(
  '/:id/payment-collected',
  auth(USER_ROLE.rider),
  bookingControllers.markPaymentCollectedAtPickup,
);

// Mark heading to station (rider is heading to station location after pickup)
router.patch(
  '/:id/heading-to-station',
  upload.none(),
  validateRequest(bookingValidations.headingToStationZodSchema),
  auth(USER_ROLE.rider),
  bookingControllers.markHeadingToStation,
);

// Mark completed (rider marks booking as completed after dropoff)
router.patch(
  '/:id/completed',
  auth(USER_ROLE.rider),
  bookingControllers.markCompleted,
);

// Start waste collection (rider starts collecting waste)
// router.patch(
//   '/:id/start-collection',
//   auth(USER_ROLE.rider),
//   bookingControllers.startCollection,
// );

// Mark arrived at dropoff location (rider arrives at disposal site)
// router.patch(
//   '/:id/arrive-dropoff',
//   auth(USER_ROLE.rider),
//   bookingControllers.markArrivedAtDropoff,
// );

// Request payment from customer (rider requests payment)
// router.patch(
//   '/:id/request-payment',
//   auth(USER_ROLE.rider),
//   bookingControllers.requestPayment,
// );

// ============================================
// SHARED ROUTES (both user and rider)
// ============================================

// Get single booking by ID
router.get(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  bookingControllers.getBookingById,
);

// Update booking status (for both user and rider)
router.patch(
  '/:id/status',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  validateRequest(bookingValidations.updateBookingStatusZodSchema),
  bookingControllers.updateBookingStatus,
);

export const bookingRoutes = router;
