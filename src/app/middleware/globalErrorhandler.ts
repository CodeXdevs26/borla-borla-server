/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import config from '../config';
import { TErrorSources } from '../interface/error';
import handleZodError from '../error/ZodError';
import handleDuplicateError from '../error/DuplicateError';
import AppError from '../error/AppError';
import { MulterError } from 'multer';
import handelMulterError from '../error/MulterError';
import { Prisma } from '@prisma/client';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '../../generated/prisma/runtime/library';
import handlePrismaValidationError from '@app/error/PrismaValidationError';
import handlePrismaKnownError from '@app/error/PrismaKnownError';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  //setting default values
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorSources: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong',
    },
  ];

  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (
    err instanceof PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    const simplifiedError = handleDuplicateError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (err instanceof PrismaClientValidationError) {
    const simplifiedError = handlePrismaValidationError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (err instanceof PrismaClientKnownRequestError) {
    // Duplicate
    if (err.code === 'P2002') {
      const simplifiedError = handleDuplicateError(err);
      statusCode = simplifiedError.statusCode;
      message = simplifiedError.message;
      errorSources = simplifiedError.errorSources;
    }
    // Other validation / constraint errors
    else {
      const simplifiedError = handlePrismaKnownError(err);
      statusCode = simplifiedError.statusCode;
      message = simplifiedError.message;
      errorSources = simplifiedError.errorSources;
    }
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  } else if (err instanceof MulterError) {
    const simplifiedError = handelMulterError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  }

  //ultimate return
  if (errorSources?.length !== 0) {
    errorSources = errorSources.map(source => {
      try {
        return {
          ...source,
          message: source?.message,
        };
      } catch (error) {
        return {
          ...source,
          message: source?.message,
        };
      }
    });
    // message = req.t(message);
  }

  // Clean response based on environment
  const response: any = {
    success: false,
    message: message,
    errorSources: errorSources,
  };

  // Only include stack trace and error object in development
  if (config.NODE_ENV === 'development') {
    response.stack = err?.stack;
  }

  try {
    res.status(statusCode).json(response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    res.status(statusCode).json({
      success: false,
      message: message,
      errorSources,
    });
  }
};

export default globalErrorHandler;
