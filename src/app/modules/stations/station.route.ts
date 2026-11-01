import { Router } from 'express';
import multer from 'multer';
import parseData from '../../middleware/parseData';
import { stationControllers } from './station.controller';
import validateRequest from 'app/middleware/validateRequest';
import { stationValidations } from './station.validation';
import auth from 'app/middleware/auth';

const router = Router();
const upload = multer();

router.post(
  '/',
  upload.none(),
  auth('admin', 'supper_admin'),
  parseData(),
  validateRequest(stationValidations.createStationZodSchema),
  stationControllers.createStation,
);

router.get(
  '/',
  auth('admin', 'supper_admin', 'rider'),
  stationControllers.getAllStations,
);

// Get rider's assigned stations
router.get('/my-stations', auth('rider'), stationControllers.getMyStations);

router.get(
  '/:id',
  auth('admin', 'supper_admin', 'rider'),
  stationControllers.getStationById,
);

router.patch(
  '/:id',
  upload.none(),
  auth('admin', 'supper_admin'),
  parseData(),
  validateRequest(stationValidations.updateStationZodSchema),
  stationControllers.updateStation,
);

router.delete(
  '/:id',
  auth('admin', 'supper_admin'),
  stationControllers.deleteStation,
);

export const stationRoutes = router;
