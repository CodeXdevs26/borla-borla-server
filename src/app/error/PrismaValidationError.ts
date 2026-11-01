/* eslint-disable @typescript-eslint/no-explicit-any */
import { TGenericErrorResponse } from '../interface/error';

const handlePrismaValidationError = (err: any): TGenericErrorResponse => {
  const errorSources = [
    {
      path: '',
      message: err.message.split('\n').pop() || 'Validation error',
    },
  ];

  return {
    statusCode: 400,
    message: 'Validation Error',
    errorSources,
  };
};

export default handlePrismaValidationError;
