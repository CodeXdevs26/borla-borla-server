import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
import { UploadedFiles } from '@app/middleware/uploadMulti';
/**
 * Middleware to extract file paths from uploaded files and add them to req.body
 * Should be used after multer file upload middleware and before validation
 */
const extractFilePaths = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (req.files && typeof req.files === 'object') {
      // Handle multiple fields uploaded with .fields()
      Object.keys(req.files).forEach(fieldName => {
        const files = (req.files as UploadedFiles)[fieldName];
        if (files && Array.isArray(files)) {
          req.body[fieldName] = files.map(file => file.path);
        }
      });
    } else if (req.file) {
      // Handle single file uploaded with .single()
      req.body[req.file.fieldname] = req.file.path;
    }

    next();
  });
};

export default extractFilePaths;
