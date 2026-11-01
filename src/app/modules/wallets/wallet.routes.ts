import { Router } from 'express';
import multer from 'multer';
import { walletControllers } from './wallet.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../users/user.constants';

const router = Router();
const upload = multer();

// 1. RIDER ACTIONS (Protected: Requires Rider to be logged in)
// Route for adding funds to the app wallet
router.post(
  '/top-up',
  upload.none(),
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  walletControllers.topUp,
);

/**
 * HUBTEL CALLBACKS (Public)
 * Hubtel hits these from their servers.
 * Do NOT add auth() middleware here.
 */
router.post(
  '/receive-callback',
  upload.none(),
  walletControllers.handleTopUpCallback,
);

// Route for getting wallet balance
router.get(
  '/self',
  auth(USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider),
  walletControllers.getWallet,
);

// Route for Riders to withdraw earnings to MoMo
router.post(
  '/withdraw',
  upload.none(),
  auth(USER_ROLE.rider),
  walletControllers.withdraw,
);

// 2. HUBTEL CALLBACKS (Public: Hubtel hits these)
// These MUST match the PrimaryCallbackURL sent in your Hubtel request
// router.post('/receive-callback', walletControllers.handleReceiveCallback);
router.post('/send-callback', walletControllers.handleSendCallback);

// Route for assigning bonuses to Riders
router.post(
  '/assign-bonus',
  upload.none(),
  auth(USER_ROLE.admin),
  walletControllers.assignBonusToRider,
);

router.post(
  '/bonus-callback',
  upload.none(),
  walletControllers.handleBonusCallback,
);

router.get(
  '/verify-withdrawal/:clientReference',
  // auth(USER_ROLE.admin, USER_ROLE.rider),
  walletControllers.verifyWithdrawalStatus,
);

export const walletRoutes = router;
