import { Router } from 'express';
import auth from 'app/middleware/auth';
import validateRequest from 'app/middleware/validateRequest';
import { USER_ROLE } from '../users/user.constants';
import { rewardCatalogueControllers as controllers } from './rewardCatalogue.controller';
import { rewardCatalogueValidations as validations } from './rewardCatalogue.validation';

const router = Router();
const users = [USER_ROLE.user, USER_ROLE.institute, USER_ROLE.rider];
const admins = [USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin, 'supper_admin'];

router.get('/catalogue', auth(...users), controllers.getMyCatalogue);
router.get('/my-claims', auth(...users), controllers.getMyClaims);
router.post('/items/:itemId/claims', auth(...users), controllers.requestClaim);

router.get('/admin/claims', auth(...admins), controllers.getAdminClaims);
router.get('/admin/users/:userId/catalogue', auth(...admins), controllers.getAdminItems);
router.post('/admin/items', auth(...admins), validateRequest(validations.createItem), controllers.createItem);
router.patch('/admin/items/:itemId', auth(...admins), validateRequest(validations.updateItem), controllers.updateItem);
router.delete('/admin/items/:itemId', auth(...admins), controllers.removeItem);
router.patch('/admin/claims/:claimId/approve', auth(...admins), validateRequest(validations.reviewClaim), controllers.approveClaim);
router.patch('/admin/claims/:claimId/reject', auth(...admins), validateRequest(validations.reviewClaim), controllers.rejectClaim);

export const rewardCatalogueRoutes = router;
