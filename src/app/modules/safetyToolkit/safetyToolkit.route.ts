import { Router } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { safetyToolkitControllers as controllers } from './safetyToolkit.controller';
import { safetyToolkitValidations as validations } from './safetyToolkit.validation';

const router = Router();
const admins = ['admin', 'sub_admin', 'supper_admin', 'super_admin'];
router.get(
  '/',
  controllers.getAllSections,
);
router.post(
  '/',
  auth(...admins),
  validateRequest(validations.createSchema),
  controllers.createSection,
);
router.patch(
  '/:sectionId',
  auth(...admins),
  validateRequest(validations.updateSchema),
  controllers.updateSection,
);
router.delete(
  '/:sectionId',
  auth(...admins),
  validateRequest(validations.deleteSchema),
  controllers.deleteSection,
);
export const safetyToolkitRoutes = router;
