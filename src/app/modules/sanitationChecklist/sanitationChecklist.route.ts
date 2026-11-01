import { Router } from 'express';
import path from 'path';
import auth from '../../middleware/auth';
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
import validateRequest from '../../middleware/validateRequest';
import { sanitationChecklistControllers as controllers } from './sanitationChecklist.controller';
import { sanitationChecklistValidations as validations } from './sanitationChecklist.validation';

const router = Router();
const admins = ['admin', 'sub_admin', 'supper_admin', 'super_admin'];
const upload = fileUpload(
  path.join(process.cwd(), 'public', 'uploads', 'sanitation-checklist'),
);
const progressUpload = fileUpload(
  path.join(
    process.cwd(),
    'public',
    'uploads',
    'sanitation-checklist-progress',
  ),
);
const members = [...admins, 'user', 'institute', 'rider'];

router.get('/my-progress', auth(...members), controllers.getMyProgress);
router.put(
  '/:id/progress',
  auth(...members),
  progressUpload.array('photos', 5),
  parseData(),
  validateRequest(validations.progressSchema),
  controllers.saveMyProgress,
);
router.get(
  '/',
  auth(...admins, 'user', 'institute', 'rider'),
  controllers.getAll,
);
router.post(
  '/',
  auth(...admins),
  upload.single('icon'),
  parseData(),
  validateRequest(validations.createSchema),
  controllers.create,
);
router.patch(
  '/:id',
  auth(...admins),
  upload.single('icon'),
  parseData(),
  validateRequest(validations.updateSchema),
  controllers.update,
);
router.delete(
  '/:id',
  auth(...admins),
  validateRequest(validations.deleteSchema),
  controllers.remove,
);

export const sanitationChecklistRoutes = router;
