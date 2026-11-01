import { TErrorSources, TGenericErrorResponse } from '../interface/error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlePrismaKnownError = (err: any): TGenericErrorResponse => {
  let message = 'Database error';
  let statusCode = 400;

  switch (err.code) {
    case 'P2000':
      message = 'Input value is too long for this field';
      break;

    case 'P2001':
      message = 'Record not found';
      statusCode = 404;
      break;

    case 'P2003':
      message = 'Invalid reference (foreign key constraint failed)';
      break;

    case 'P2004':
      message = 'Database constraint failed';
      break;

    case 'P2011':
      message = 'Null constraint violation';
      break;

    case 'P2012':
      message = 'Missing required value';
      break;

    case 'P2013':
      message = 'Missing required argument';
      break;

    case 'P2014':
      message = 'The change you are trying to make would violate a relation';
      break;

    case 'P2015':
      message = 'Related record not found';
      statusCode = 404;
      break;

    case 'P2025':
      message = 'Record to update or delete not found';
      statusCode = 404;
      break;

    default:
      message = 'Database operation failed. Please check your data.';
  }

  const errorSources: TErrorSources = [
    {
      path: err?.meta?.field_name || err?.meta?.target || '',
      message,
    },
  ];

  return {
    statusCode,
    message,
    errorSources,
  };
};

export default handlePrismaKnownError;
