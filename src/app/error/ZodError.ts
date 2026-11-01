import { ZodError, ZodIssue } from 'zod';
import { TErrorSources, TGenericErrorResponse } from '../interface/error';

const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSources = err.issues.map((issue: ZodIssue) => {
    // Get the field name from the path
    const fieldPath =
      issue.path.length > 1 ? issue.path.slice(1).join('.') : issue.path[0];
    const field = issue.path[issue.path.length - 1];

    // Customize error messages based on error type
    let customMessage = issue.message;
    const issueAny = issue as any;

    if (issue.code === 'invalid_type') {
      if (issue.path[0] === 'body' && issueAny.received === 'undefined') {
        customMessage =
          'Request body is required. Please provide valid JSON data.';
      } else if (field) {
        customMessage = `${String(field)} is required`;
      }
    } else if (issue.code === 'too_small') {
      customMessage = `${String(field)} ${issue.message}`;
    } else if (issue.code === 'too_big') {
      customMessage = `${String(field)} ${issue.message}`;
    } else if (issueAny.code === 'invalid_string') {
      if (issueAny.validation === 'email') {
        customMessage = `Please provide a valid email address`;
      }
    }

    return {
      path:
        typeof fieldPath === 'string' || typeof fieldPath === 'number'
          ? fieldPath
          : 'body',
      message: customMessage,
    };
  });

  const statusCode = 400;

  // Create a more meaningful overall message
  let message = 'Validation Error';
  if (
    err.issues.length === 1 &&
    err.issues[0].path[0] === 'body' &&
    err.issues[0].code === 'invalid_type'
  ) {
    message = 'Request body is missing or invalid';
  } else if (err.issues.length > 0) {
    message = `Validation failed for ${err.issues.length} field(s)`;
  }

  return {
    statusCode,
    message,
    errorSources,
  };
};

export default handleZodError;
