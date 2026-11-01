import { Router } from 'express';
import { paymentPagesControllers } from './payment.pages.controller';

const router = Router();

router.get(
  '/booking/success',
  paymentPagesControllers.renderBookingSuccessPage,
);
router.get('/booking/failed', paymentPagesControllers.renderBookingFailedPage);

export const paymentPagesRoutes = router;
