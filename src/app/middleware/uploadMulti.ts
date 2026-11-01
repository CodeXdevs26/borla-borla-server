import { NextFunction, Request, Response } from 'express';
import { uploadToS3 } from '../utils/s3';
import catchAsync from '@app/utils/catchAsync';
import _ from 'lodash';

export type UploadedFiles = {
  [fieldname: string]: Express.Multer.File[];
};

interface IUploadField {
  name: string;
  maxCount: number;
  folder?: string;
}

const uploadMultiple = (fields: IUploadField[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (_.isEmpty(req.files)) return next();

    const files = req.files as UploadedFiles;

    await Promise.all(
      _.map(fields, async (field: IUploadField) => {
        const fieldFiles = _.get(files, field.name) as Express.Multer.File[];

        if (!fieldFiles || fieldFiles.length === 0) return;

        const uploadedUrls: string[] = [];

        await Promise.all(
          fieldFiles.map(async file => {
            const uploadedUrl = await uploadToS3({
              file,
              fileName: field.folder
                ? `images/${field.folder}/${Math.floor(
                    100000 + Math.random() * 900000,
                  )}`
                : `images/${field.name}/${Math.floor(
                    100000 + Math.random() * 900000,
                  )}`,
            });

            uploadedUrls.push(uploadedUrl as string);
          }),
        );
        console.log(uploadMultiple);
        _.set(req.body, field.name, uploadedUrls);
      }),
    );

    next();
  });
};

export default uploadMultiple;
