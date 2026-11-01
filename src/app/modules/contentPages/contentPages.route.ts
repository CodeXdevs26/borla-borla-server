import { Router } from 'express';
import multer from 'multer';
import auth from 'app/middleware/auth';
import validateRequest from 'app/middleware/validateRequest';
import { contentPagesController } from './contentPages.controller';
import { contentPagesValidation } from './contentPages.validation';

const router = Router();
const upload = multer();

router.get('/about-us', contentPagesController.getAboutUs);
router.patch(
  '/about-us',
  auth('admin', 'supper_admin', 'sub_admin'),
  upload.none(),
  validateRequest(contentPagesValidation.updatePageContentZodSchema),
  contentPagesController.updateAboutUs,
);

router.get(
  '/terms-and-conditions',
  contentPagesController.getTermsAndConditions,
);
router.patch(
  '/terms-and-conditions',
  auth('admin', 'supper_admin', 'sub_admin'),
  upload.none(),
  validateRequest(contentPagesValidation.updatePageContentZodSchema),
  contentPagesController.updateTermsAndConditions,
);

router.get('/privacy-policy', contentPagesController.getPrivacyPolicy);
router.patch(
  '/privacy-policy',
  auth('admin', 'supper_admin', 'sub_admin'),
  upload.none(),
  validateRequest(contentPagesValidation.updatePageContentZodSchema),
  contentPagesController.updatePrivacyPolicy,
);

export const contentPagesRoutes = router;
