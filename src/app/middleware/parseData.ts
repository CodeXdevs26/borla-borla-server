import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
const parseData = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (req?.body?.data) {
      req.body = JSON.parse(req.body.data);
    } else {
      // Parse individual JSON string fields (like boundary, location, etc.)
      if (req.body?.boundary && typeof req.body.boundary === 'string') {
        try {
          req.body.boundary = JSON.parse(req.body.boundary);
        } catch (error) {
          // Keep as string if not valid JSON
        }
      }

      if (req.body?.location && typeof req.body.location === 'string') {
        try {
          req.body.location = JSON.parse(req.body.location);
        } catch (error) {
          // Keep as string if not valid JSON
        }
      }
    }

    next();
  });
};
export default parseData;
