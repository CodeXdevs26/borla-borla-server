import { Router } from 'express';
import { operationsControllers } from './operations.controller';
import validateRequest from 'app/middleware/validateRequest';
import { operationsValidations } from './operations.validation';
import auth from 'app/middleware/auth';

const router = Router();

// Get complete operations dashboard (all data in one call)
router.get(
  '/dashboard',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.dashboardQueryZodSchema),
  operationsControllers.getOperationsDashboard,
);

// Individual endpoints for specific data
router.get(
  '/pickups-per-hour',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.dashboardQueryZodSchema),
  operationsControllers.getPickupsPerHour,
);

router.get(
  '/avg-pickup-time',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.dashboardQueryZodSchema),
  operationsControllers.getAvgPickupTimeByDay,
);

router.get(
  '/completion-rate',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.dashboardQueryZodSchema),
  operationsControllers.getCompletionRate,
);

router.get(
  '/zone-health',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.dashboardQueryZodSchema),
  operationsControllers.getZoneHealth,
);

// Pickup success rate by zone
router.get(
  '/pickup-success-rate',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.pickupSuccessRateZodSchema),
  operationsControllers.getPickupSuccessRate,
);

router.get(
  '/zones/:zoneId/pickup-success-rate',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.pickupSuccessRateZodSchema),
  operationsControllers.getPickupSuccessRate,
);

// Zone performance ranking
router.get(
  '/zone-ranking',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.rankingQueryZodSchema),
  operationsControllers.getZoneRanking,
);

// Top performing riders
router.get(
  '/top-riders',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.rankingQueryZodSchema),
  operationsControllers.getTopRiders,
);

router.get(
  '/zones/:zoneId/top-performing-riders',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.zoneTopPerformingRidersZodSchema),
  operationsControllers.getZoneTopPerformingRiders,
);

// Zone comparison (all zones revenue and pickups)
router.get(
  '/zone-comparison',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.dashboardQueryZodSchema),
  operationsControllers.getZoneComparison,
);

// Zone-specific endpoints
// Get zone details with KPIs
router.get(
  '/zones/:zoneId/details',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.zoneQueryZodSchema),
  operationsControllers.getZoneDetails,
);

// Get zone performance trends
router.get(
  '/zones/:zoneId/trends',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.zoneQueryZodSchema),
  operationsControllers.getZoneTrends,
);

// Get zone statistics (for fleet management)
router.get(
  '/zone-stats',
  auth('admin', 'supper_admin'),
  operationsControllers.getZoneStats,
);

// Get riders list (for fleet management)
router.get(
  '/riders-list',
  auth('admin', 'supper_admin'),
  validateRequest(operationsValidations.riderListQueryZodSchema),
  operationsControllers.getRidersList,
);

export const operationsRoutes = router;
