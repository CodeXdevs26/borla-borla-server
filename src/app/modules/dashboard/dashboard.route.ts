import { Router } from 'express';
import { dashboardControllers } from './dashboard.controller';
import validateRequest from 'app/middleware/validateRequest';
import { dashboardValidations } from './dashboard.validation';
import auth from 'app/middleware/auth';

const router = Router();

// Get dashboard statistics (all 8 cards)
router.get(
  '/stats',
  auth('admin', 'sub_admin', 'supper_admin'),
  dashboardControllers.getDashboardStats,
);

// Get user overview chart data
router.get(
  '/user-overview',
  auth('admin', 'sub_admin', 'supper_admin'),
  validateRequest(dashboardValidations.userOverviewQueryZodSchema),
  dashboardControllers.getUserOverview,
);

// Get revenue chart data
router.get(
  '/revenue-chart',
  auth('admin', 'sub_admin', 'supper_admin'),
  validateRequest(dashboardValidations.revenueChartQueryZodSchema),
  dashboardControllers.getRevenueChart,
);

// Get zone comparison chart data
router.get(
  '/zone-comparison',
  auth('admin', 'sub_admin', 'supper_admin'),
  validateRequest(dashboardValidations.zoneComparisonQueryZodSchema),
  dashboardControllers.getZoneComparison,
);

// Get waste distribution data
router.get(
  '/waste-distribution',
  auth('admin', 'sub_admin', 'supper_admin'),
  validateRequest(dashboardValidations.wasteDistributionQueryZodSchema),
  dashboardControllers.getWasteDistribution,
);

// Get recent accounts list
router.get(
  '/recent-accounts',
  auth('admin', 'sub_admin', 'supper_admin'),
  validateRequest(dashboardValidations.recentAccountsQueryZodSchema),
  dashboardControllers.getRecentAccounts,
);

export const dashboardRoutes = router;
