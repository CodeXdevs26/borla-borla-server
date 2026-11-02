import { authRoutes } from '@app/modules/auth/auth.route';
import { contentsRoutes } from '@app/modules/contents/contents.route';
import { otpRoutes } from '@app/modules/otp/otp.routes';
import { userRoutes } from '@app/modules/users/users.routes';
import { riderVerificationRoutes } from '@app/modules/riderVerification/riderVerification.route';
import { savedPlaceRoutes } from '@app/modules/savedPlaces/savedPlace.route';
import { bookingRoutes } from '@app/modules/bookings/booking.route';
import { paymentRoutes } from '@app/modules/payments/payment.routes';
import { walletRoutes } from '@app/modules/wallets/wallet.routes';
import { riderRoutes } from '@app/modules/riders/rider.route';
import { ratingRoutes } from '@app/modules/ratings/rating.route';
import { zoneRoutes } from '@app/modules/zones/zone.route';
import { stationRoutes } from '@app/modules/stations/station.route';
import { operationsRoutes } from '@app/modules/operations/operations.route';
import { dashboardRoutes } from '@app/modules/dashboard/dashboard.route';
import { messageRoutes } from '@app/modules/messages/message.route';
import { realtimeMonitorRoutes } from '@app/modules/realtime monitor/realtimeMonitor.route';
import { specialAccessRoutes } from '@app/modules/specialAccess/specialAccess.route';
import { contentPagesRoutes } from '@app/modules/contentPages/contentPages.route';
import { notificationRoutes } from '@app/modules/notifications/notification.route';
import { incentivesLoyaltyRoutes } from '@app/modules/incentivesLoyalty/incentivesLoyalty.route';
import { earningsRoutes } from '@app/modules/earnings/earnings.route';
import { commissionRoutes } from '@app/modules/commissions/commission.route';
import { referralRoutes } from '@app/modules/referrals/referral.route';
import { emergencySupportRoutes } from '@app/modules/emergencySupport/emergencySupport.route';

import { Router } from 'express';
import { feedbackRoutes } from '../modules/feedback/feedback.route';
import { safetyToolkitRoutes } from '../modules/safetyToolkit/safetyToolkit.route';
import { sanitationChecklistRoutes } from '../modules/sanitationChecklist/sanitationChecklist.route';
import { rewardCatalogueRoutes } from '../modules/rewards/rewardCatalogue.route';

const router = Router();
const moduleRoutes = [
  { path: '/sanitation-checklist', route: sanitationChecklistRoutes },
  { path: '/safety-toolkit', route: safetyToolkitRoutes },
  { path: '/feedbacks', route: feedbackRoutes },
  { path: '/rewards', route: rewardCatalogueRoutes },
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/otp',
    route: otpRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/contents',
    route: contentsRoutes,
  },
  {
    path: '/rider-verification',
    route: riderVerificationRoutes,
  },
  {
    path: '/saved-places',
    route: savedPlaceRoutes,
  },
  {
    path: '/bookings',
    route: bookingRoutes,
  },
  {
    path: '/payments',
    route: paymentRoutes,
  },
  {
    path: '/wallets',
    route: walletRoutes,
  },
  {
    path: '/riders',
    route: riderRoutes,
  },
  {
    path: '/ratings',
    route: ratingRoutes,
  },
  {
    path: '/zones',
    route: zoneRoutes,
  },
  {
    path: '/stations',
    route: stationRoutes,
  },
  {
    path: '/operations',
    route: operationsRoutes,
  },
  {
    path: '/dashboard',
    route: dashboardRoutes,
  },
  {
    path: '/messages',
    route: messageRoutes,
  },
  {
    path: '/realtime-monitor',
    route: realtimeMonitorRoutes,
  },
  {
    path: '/special-access',
    route: specialAccessRoutes,
  },
  {
    path: '/content-pages',
    route: contentPagesRoutes,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
  {
    path: '/incentives-loyalty',
    route: incentivesLoyaltyRoutes,
  },
  {
    path: '/earnings',
    route: earningsRoutes,
  },
  {
    path: '/commissions',
    route: commissionRoutes,
  },
  {
    path: '/referrals',
    route: referralRoutes,
  },
  {
    path: '/emergency-support',
    route: emergencySupportRoutes,
  },
];
moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
