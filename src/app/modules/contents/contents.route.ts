import { Router } from 'express';
import { contentController } from './content.controller';

const router = Router();

router.post('/contact-message', contentController.contactUs);
router.patch('/', contentController.updateContents);
router.get('/', contentController.getContents);

export const contentsRoutes = router;
