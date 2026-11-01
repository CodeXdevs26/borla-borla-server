Here is a complete documentation for your S3 utility file in Markdown format. It explains the purpose, configuration, and functionality of each exported helper.

---

# AWS S3 Utility Service Documentation

This utility module provides a streamlined interface for interacting with **AWS S3** using the AWS SDK v3. It handles single and multiple file uploads, deletions, and secure access via presigned URLs.

## Table of Contents

1. [Configuration](#1-configuration)
2. [Core Functions](#2-core-functions)
   - [uploadToS3](#uploadtos3)
   - [uploadManyToS3](#uploadmanytos3)
   - [deleteFromS3](#deletefroms3)
   - [deleteManyFromS3](#deletemanyfroms3)
3. [Security Helpers](#3-security-helpers)
   - [generatePresignedUrl](#generatepresignedurl)
   - [getS3KeyFromUrl](#gets3keyfromurl)

---

## 1. Configuration

The service relies on an external configuration file and a pre-configured `s3Client`.

- **s3Client**: An instance of `S3Client` initialized with your AWS credentials (Access Key and Secret Key).
- **config**: Contains environment-specific variables like `config.aws.bucket` and `config.aws.region`.

---

## 2. Core Functions

### `uploadToS3`

Uploads a single file to the specified S3 bucket.

- **Input**: An object containing the `file` (typically from Multer), a custom `fileName` (the Key), and an optional `contentType`.
- **Mechanism**: Uses `PutObjectCommand` to send the file buffer.
- **Returns**: The permanent public URL of the uploaded file.

### `uploadManyToS3`

Handles bulk uploads for multiple files simultaneously.

- **Input**: An array of file objects including the path and an optional custom key.
- **Mechanism**: Maps through the array and creates a `PutObjectCommand` for each. If no key is provided, it generates a unique one using a random number and `Date.now()`.
- **Returns**: An array of objects containing the `url` and the generated `key`.

### `deleteFromS3`

Removes a single object from the bucket.

- **Input**: The `key` (path) of the file in the bucket.
- **Mechanism**: Uses `DeleteObjectCommand`.

### `deleteManyFromS3`

Performs a batch deletion of multiple objects.

- **Input**: An array of string `keys`.
- **Mechanism**: Uses `DeleteObjectsCommand`, which is more efficient for bulk operations than calling `deleteFromS3` in a loop.

---

## 3. Security Helpers

### `generatePresignedUrl`

Since S3 buckets should generally be private for security, this function provides temporary access to a specific file.

- **Input**: The file `key` and an optional `expiresIn` time (defaults to 3600 seconds / 1 hour).
- **Mechanism**: Uses `@aws-sdk/s3-request-presigner` to create a cryptographically signed URL.
- **Use Case**: Viewing sensitive documents like ID cards or private profile photos without making the entire bucket public.

### `getS3KeyFromUrl`

A utility function to extract the object Key from a full S3 URL.

- **How it works**: It splits the URL by the `.com/` delimiter and returns the subsequent string.
- **Example**:
  - _URL_: `https://my-bucket.s3.region.amazonaws.com/images/user/photo.jpg`
  - _Result_: `images/user/photo.jpg`

---

## Error Handling

This module uses a custom `AppError` class and `http-status` codes:

- **Upload Failures**: Throws a `BAD_REQUEST` (400) error if the S3 response is invalid or a network error occurs.
- **Deletion Failures**: Logs the error to the console and throws a generic error to the calling service.
- **Secure Link Failures**: Catches errors during the signing process to prevent application crashes.
