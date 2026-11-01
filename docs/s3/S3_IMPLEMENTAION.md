# S3 Secure File Implementation Documentation

This document outlines the implementation of secure file uploads and private access using AWS S3, Node.js, and Prisma.

## 1. Overview

The system uses a hybrid approach:

- **Local Storage:** Files are temporarily stored on the server disk for processing.
- **AWS S3:** Files are uploaded to a private S3 bucket for long-term storage.
- **Presigned URLs:** Sensitive files such as Ghana Cards are accessed via temporary, cryptographically signed URLs to ensure security.

## 2. Environment Configuration

The following variables must be configured in the `.env` file:

## 3. S3 Utility Service (`s3.ts`)

The core S3 logic handles uploading, deleting, and generating secure temporary links.

### Key Functions

- `uploadToS3`: Uploads a file buffer to a specific path in the bucket.
- `deleteFromS3` / `deleteManyFromS3`: Removes objects from the bucket using their keys.
- `generatePresignedUrl`: Creates a temporary GET URL, valid for 1 hour, for private objects.
- `getS3KeyFromUrl`: Extracts the object key from a full S3 URL.

```ts
export const generatePresignedUrl = async (
  key: string,
  expiresIn = 3600,
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: config.aws.bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};
```

## 4. Controller Implementation (`updateMyProfile`)

The controller manages the lifecycle of a profile update:

- **Cleanup:** If new files are uploaded, the old files are deleted from both local storage and S3.
- **Buffer Processing:** Since Multer uses disk storage, files are read into a buffer with `fs.readFileSync` before being sent to S3.
- **Hybrid Update:** Both the local public path and the permanent S3 URL are saved to the database.

### Ghana Card Upload Logic

```ts
updateBody.ghanaCardIdS3 = await Promise.all(
  files.ghanaCardId.map((file) => {
    const fileBuffer = fs.readFileSync(file.path);

    return uploadToS3({
      file: { ...file, buffer: fileBuffer },
      fileName: `images/user/ghana-cards/${Date.now()}-${file.originalname}`,
      contentType: file.mimetype,
    });
  }),
);
```

## 5. Secure Access (Presigned URLs)

To view sensitive images in Flutter or React, the backend transforms the stored permanent URL into a temporary signed link during the "Get Profile" request.

### Workflow

1. Frontend requests the user profile.
2. Backend retrieves the S3 key from the database.
3. Backend generates a presigned URL.
4. Frontend displays the image using standard components such as `Image.network` or `<img />`.

## 6. S3 Bucket Security Settings

To allow the frontend to display these images, the bucket must have CORS enabled:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

**Note:** For production, restrict `AllowedOrigins` to your specific domain.
