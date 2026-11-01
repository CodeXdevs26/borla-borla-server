import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import httpStatus from 'http-status';
import AppError from '../error/AppError';
import config from '../config';
import { s3Client } from '../constants/aws';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

//upload a single file
export const uploadToS3 = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  {
    file,
    fileName,
    contentType,
  }: { file: any; fileName: string; contentType?: string },
): Promise<string | null> => {
  const command = new PutObjectCommand({
    Bucket: config.aws.bucket,
    Key: fileName,
    Body: file.buffer,
    ContentType: contentType ?? file.mimetype,
  });

  try {
    const key = await s3Client.send(command);
    console.log('🚀 ~ uploadToS3 ~ key:', key);
    if (!key) {
      throw new AppError(httpStatus.BAD_REQUEST, 'File Upload failed');
    }

    const url = `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${fileName}`;

    return url;
  } catch (error) {
    console.error('🚀 ~ uploadToS3 ~ error:', error);
    throw new AppError(httpStatus.BAD_REQUEST, 'File Upload failed');
  }
};

// delete file from s3 bucket
export const deleteFromS3 = async (key: string) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error('🚀 ~ deleteFromS3 ~ error:', error);
    throw new Error('s3 file delete failed');
  }
};

// upload multiple files

export const uploadManyToS3 = async (
  files: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any;
    path: string;
    key?: string;
  }[],
): Promise<{ url: string; key: string }[]> => {
  try {
    const uploadPromises = files.map(async ({ file, path, key }) => {
      const newFileName = key
        ? key
        : `${Math.floor(100000 + Math.random() * 900000)}${Date.now()}`;

      const fileKey = `${path}/${newFileName}`;
      const command = new PutObjectCommand({
        Bucket: config.aws.bucket as string,
        Key: fileKey,
        Body: file?.buffer,
      });

      await s3Client.send(command);

      const url = `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${fileKey}`;
      return { url, key: newFileName };
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  } catch (error) {
    console.error('🚀 ~ uploadManyToS3 ~ error:', error);
    throw new Error('File Upload failed');
  }
};

export const deleteManyFromS3 = async (keys: string[]) => {
  try {
    const deleteParams = {
      Bucket: config.aws.bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false,
      },
    };

    const command = new DeleteObjectsCommand(deleteParams);

    const response = await s3Client.send(command);

    return response;
  } catch (error) {
    console.error('Error deleting S3 files:', error);
    throw new AppError(httpStatus.BAD_REQUEST, 'S3 file delete failed');
  }
};

export const getS3KeyFromUrl = (url: string): string => {
  // Typical S3 URL: https://bucket.s3.region.amazonaws.com/folder/filename.jpg
  // This splits by the domain and returns the path
  if (!url) return '';
  const parts = url.split('.com/');
  return parts.length > 1 ? parts[1] : '';
};

/**
 * Generates a temporary URL for a private S3 object
 * @param key The S3 key (path) of the file
 * @param expiresIn Time in seconds until the link expires (default 3600s / 1 hour)
 */
export const generatePresignedUrl = async (
  key: string,
  expiresIn = 3600,
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: config.aws.bucket,
    Key: key,
  });

  try {
    // This creates a signed URL that grants temporary access
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Could not generate secure link');
  }
};
