import { Request } from 'express';
import fs from 'fs';
import multer from 'multer';
import AppError from '../error/AppError';
import httpStatus from 'http-status';
const fileUpload = (uploadDirectory: string, documentFields: string[] = []) => {
  const storage = multer.diskStorage({
    destination: function (req: Request, file, cb) {
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }
      cb(null, uploadDirectory);
    },
    filename: function (req: Request, file, cb) {
      const parts = file.originalname.split('.');
      let extenson;
      if (parts.length > 1) {
        extenson = '.' + parts.pop();
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(
        null,
        parts.shift()!.replace(/\s+/g, '_') + '-' + uniqueSuffix + extenson,
      );
    },
  });
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },

    fileFilter: function (req: Request, file, cb) {
      console.log(file);
      if (
        (documentFields.includes(file.fieldname) &&
          file.mimetype === 'application/pdf') ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/svg' ||
        file.mimetype === 'image/webp' ||
        file.mimetype === 'application/octet-stream' ||
        file.mimetype === 'image/svg+xml'
      ) {
        cb(null, true);
      } else {
        cb(
          new AppError(
            httpStatus.BAD_REQUEST,
            'Unsupported file type (rider documents also accept PDF)',
          ),
        );
      }
    },
  });
  return upload;
};
export default fileUpload;

/**
 * Create a multer upload middleware with dynamic destinations based on field name
 * @param destinationMap - Object mapping field names to their upload directories
 */
export const fileUploadMulti = (destinationMap: Record<string, string>) => {
  const storage = multer.diskStorage({
    destination: function (req: Request, file, cb) {
      // Get the upload directory based on field name
      const uploadDirectory = destinationMap[file.fieldname];

      if (!uploadDirectory) {
        cb(
          new Error(
            `No upload directory configured for field: ${file.fieldname}`,
          ),
          '',
        );
        return;
      }

      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }
      cb(null, uploadDirectory);
    },
    filename: function (req: Request, file, cb) {
      const parts = file.originalname.split('.');
      let extenson;
      if (parts.length > 1) {
        extenson = '.' + parts.pop();
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(
        null,
        parts.shift()!.replace(/\s+/g, '_') + '-' + uniqueSuffix + extenson,
      );
    },
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: function (req: Request, file, cb) {
      console.log(file);
      if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/svg' ||
        file.mimetype === 'image/webp' ||
        file.mimetype === 'application/octet-stream' ||
        file.mimetype === 'image/svg+xml'
      ) {
        cb(null, true);
      } else {
        cb(null, false);
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'only png,jpg,jpeg,svg format allowed',
        );
      }
    },
  });

  return upload;
};
