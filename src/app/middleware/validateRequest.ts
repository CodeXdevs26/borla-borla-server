import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import catchAsync from '../utils/catchAsync';

const validateRequest = (schema: ZodTypeAny) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const parsedData = (await schema.parseAsync({
      body: req.body,
      files: req.files,
      file: req.file,
      cookies: req.cookies,
      params: req.params,
      query: req.query,
    })) as { body?: unknown };

    // Apply transformed values back to request
    // Note: req.query is read-only in Express 5, so we can't reassign it
    if (typeof parsedData.body !== 'undefined') {
      req.body = parsedData.body;
    }

    next();
  });
};

export default validateRequest;
