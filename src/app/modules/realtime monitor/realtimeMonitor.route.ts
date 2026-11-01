import { Router } from 'express';
import { realtimeMonitorController } from './realtimeMonitor.controller';
import validateRequest from 'app/middleware/validateRequest';
import { realtimeMonitorValidations } from './realtimeMonitor.validation';
import auth from 'app/middleware/auth';

const router = Router();

// Realtime monitor stats cards
router.get(
  '/stats',
  auth('admin', 'supper_admin', 'sub_admin'),
  realtimeMonitorController.getRealtimeMonitorStats,
);

// Realtime rider list (for active riders panel)
router.get(
  '/riders',
  auth('admin', 'supper_admin', 'sub_admin'),
  validateRequest(realtimeMonitorValidations.realtimeRidersQueryZodSchema),
  realtimeMonitorController.getRealtimeRiders,
);

// Realtime rider locations (for live map)
router.get(
  '/live-locations',
  auth('admin', 'supper_admin', 'sub_admin'),
  realtimeMonitorController.getRealtimeLiveLocations,
);

// Realtime recent activity list
router.get(
  '/recent-activities',
  auth('admin', 'supper_admin', 'sub_admin'),
  validateRequest(realtimeMonitorValidations.realtimeActivitiesQueryZodSchema),
  realtimeMonitorController.getRealtimeActivities,
);

export const realtimeMonitorRoutes = router;
