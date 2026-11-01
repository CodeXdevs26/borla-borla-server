# Sanitation checklist APIs

All requests require `Authorization: Bearer <access-token>` for an active, verified account.

| Method | Endpoint                           | Access                                             |
| ------ | ---------------------------------- | -------------------------------------------------- |
| POST   | `/api/v1/sanitation-checklist`     | Admin/sub-admin/super-admin                        |
| GET    | `/api/v1/sanitation-checklist`     | Authenticated users, institutes, riders and admins |
| PATCH  | `/api/v1/sanitation-checklist/:id` | Admin/sub-admin/super-admin                        |
| DELETE | `/api/v1/sanitation-checklist/:id` | Admin/sub-admin/super-admin                        |

## Add

POST multipart/form-data:

| Field       | Type | Required | Example                          |
| ----------- | ---- | -------- | -------------------------------- |
| name        | Text | Yes      | Wash hands                       |
| description | Text | Yes      | Wash hands after handling waste. |
| icon        | File | Yes      | hands.png                        |

Uses the existing image upload middleware, maximum 5 MB and one file. Upload an image such as PNG, JPEG, SVG or WebP. A text URL is not a file upload. Let the HTTP library set the multipart boundary.

Returns 201 with the created record in data:

```json
{
  "success": true,
  "message": "Sanitation checklist item created",
  "data": {
    "id": "<item-id>",
    "name": "Wash hands",
    "description": "Wash hands after handling waste.",
    "icon": "public/uploads/sanitation-checklist/hands-....png",
    "createdAt": "2026-10-24T10:00:00.000Z",
    "updatedAt": "2026-10-24T10:00:00.000Z"
  }
}
```

The icon is stored as a public-relative URL/path, matching existing local uploads. Display it at `<server-origin>/<icon>`. S3 is not required.

## Get all

GET returns all checklist entries in creation order in `data: [...]`. No entries returns `data: []`. No pagination or request body is required.

## Update

PATCH uses the created record's id. Send multipart/form-data with any of name, description and/or icon. Text-only JSON with name and/or description is also accepted. Omitting icon keeps its current URL; uploading an icon replaces the stored URL. At least one change is required.

## Delete

DELETE uses the entry id, with no request body. Returns 200 with an empty data object. Deletes the checklist database entry; existing uploaded files are not automatically removed from disk.

Names allow 1–200 characters and descriptions 1–5,000 characters, after trimming. Blank values, missing required fields/files, empty updates or invalid IDs return 400. Missing records on update/delete return 404.

## Apply and test

## Individual user progress

These two endpoints are available to authenticated users, institutes, riders and admins. The user ID always comes from the access token; do not send userId. Each user has one current progress record per checklist item, independently of everyone else's progress. There is no daily reset or per-booking history.

### Save completion and optional photos

`PUT /api/v1/sanitation-checklist/:id/progress`

Use the checklist item ID returned by GET. Send multipart/form-data:

| Field       | Type | Required | Example                                       |
| ----------- | ---- | -------- | --------------------------------------------- |
| isCompleted | Text | Yes      | true or false                                 |
| photos      | File | No       | proof.jpg; repeat field for up to five photos |

Maximum 5 MB per photo, using the existing image uploader. Without photos, JSON also works:

```json
{ "isCompleted": true }
```

First request creates progress; subsequent requests update the same record. Success returns 200 with userId, checklistId, isCompleted, completedAt, photos and timestamps in data. Marking incomplete clears completedAt. Uploaded photos are stored as public-relative URLs under public/uploads/sanitation-checklist-progress. Display them as `<server-origin>/<photo-path>`.

New photos replace the stored photo list for that item; omitted photos preserve the existing list. Photos are optional even when marking complete. Existing files are not deleted from disk when replaced. Invalid states/IDs return 400 and missing checklist items return 404.

### Get my checklist with progress

`GET /api/v1/sanitation-checklist/my-progress`

No body. Returns all checklist definitions in data, merged with only the authenticated user's progress, for example:

```json
{
  "success": true,
  "message": "Your sanitation checklist retrieved",
  "data": [
    {
      "id": "<checklist-id>",
      "name": "Wash hands",
      "description": "Wash hands after handling waste.",
      "icon": "public/uploads/sanitation-checklist/hands.png",
      "createdAt": "2026-10-24T10:00:00.000Z",
      "updatedAt": "2026-10-24T10:00:00.000Z",
      "isCompleted": true,
      "completedAt": "2026-10-24T11:00:00.000Z",
      "photos": ["public/uploads/sanitation-checklist-progress/proof.jpg"]
    }
  ]
}
```

Untouched items return isCompleted=false, completedAt=null and photos=[]. The existing GET collection endpoint continues returning only checklist definitions. Progress records are linked to both user and checklist and cascade when either is hard-deleted through Prisma.

Test using two user tokens: mark one user's item complete with photos, confirm that user's my-progress shows completion, and confirm the other user's listing remains incomplete with no photos. Mark incomplete and verify completedAt clears. Repeat a save without uploading photos to verify the photos remain.

## Apply and test progress changes

Stop the backend to release the Windows Prisma engine lock, then run:

```sh
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

No database changes were applied during implementation. The migrate script runs `prisma db push` against DATABASE_URL.

```sh
node --test tests/sanitation-checklist.test.cjs
node node_modules/typescript/bin/tsc --noEmit
```

In Postman: create an entry with an icon, open its icon URL, list entries, change only the description and verify the icon remains, replace the icon, then delete the entry. Confirm riders can list but cannot create/update/delete.
