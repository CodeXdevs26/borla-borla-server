// error/PrismaDuplicateError.ts
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '../../generated/prisma/runtime/library';
import { TErrorSources, TGenericErrorResponse } from '../interface/error';

/**
 * Extract human-readable field name from Prisma constraint name
 * e.g., "User_phoneNumber_key" -> "Phone number"
 * e.g., "User_email_key" -> "Email"
 */
const extractFieldName = (target: string | string[]): string => {
  let fieldName = 'Field';

  if (Array.isArray(target)) {
    // Handle compound unique constraints
    return target.map(t => formatFieldName(t)).join(', ');
  }

  if (typeof target === 'string') {
    // Extract field name from constraint like "User_phoneNumber_key"
    const parts = target.split('_');
    if (parts.length > 1) {
      // Remove model name and "key" suffix
      const field = parts.slice(1, -1).join('_');
      fieldName = formatFieldName(field);
    } else {
      fieldName = formatFieldName(target);
    }
  }

  return fieldName;
};

/**
 * Format camelCase field name to readable format
 * e.g., "phoneNumber" -> "Phone number"
 */
const formatFieldName = (field: string): string => {
  // Common field name mappings
  const fieldMappings: Record<string, string> = {
    email: 'Email',
    phoneNumber: 'Phone number',
    username: 'Username',
    customerId: 'Customer ID',
    ghanaCardId: 'Ghana Card ID',
  };

  // Check if we have a direct mapping
  if (fieldMappings[field]) {
    return fieldMappings[field];
  }

  // Convert camelCase to Title Case with spaces
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

const handleDuplicateError = (
  err: PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  // Prisma P2002 duplicate error
  const target = err?.meta?.target;
  const field = extractFieldName(target as string | string[]);

  const errorSources: TErrorSources = [
    {
      path: typeof target === 'string' ? target : '',
      message: `${field} already exists. Please use a different one.`,
    },
  ];

  return {
    statusCode: 409, // Use 409 Conflict for duplicate resources
    message: `${field} already exists. Please use a different one.`,
    errorSources,
  };
};

export default handleDuplicateError;
