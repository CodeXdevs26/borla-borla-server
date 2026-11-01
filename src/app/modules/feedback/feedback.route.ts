import { Router } from 'express';
import path from 'path';
import auth from '../../middleware/auth';
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
import validateRequest from '../../middleware/validateRequest';
import { feedbackControllers } from './feedback.controller';
import { feedbackValidations } from './feedback.validation';

const router = Router();
const roles = [
  'user',
  'institute',
  'rider',
  'admin',
  'sub_admin',
  'supper_admin',
  'super_admin',
];
const upload = fileUpload(
  path.join(process.cwd(), 'public', 'uploads', 'feedback'),
);

router.post(
  '/',
  auth(...roles),
  upload.single('photo'),
  parseData(),
  validateRequest(feedbackValidations.createFeedbackZodSchema),
  feedbackControllers.createFeedback,
);

router.get(
  '/user/:userId',
  auth(...roles),
  feedbackControllers.getFeedbackByUserId,
);

export const feedbackRoutes = router;
