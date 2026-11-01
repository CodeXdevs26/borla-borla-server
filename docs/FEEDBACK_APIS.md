# Feedback APIs

Base path: `/api/v1/feedbacks`. Both endpoints require `Authorization: Bearer <access-token>` and an active, verified account. Feedback is independent of booking ratings. The giver is the authenticated account, and the receiver is the account being reviewed. Self feedback is rejected; no booking ID is required.

## Create

`POST /api/v1/feedbacks`

Without a photo, send `Content-Type: application/json`:

```json
{
  "receiverId": "<24-character-user-object-id>",
  "rating": 5,
  "text": "Great service. Arrived on time."
}
```

With an optional photo, use multipart/form-data:

| Key        | Type | Required | Value                                                                |
| ---------- | ---- | -------- | -------------------------------------------------------------------- |
| receiverId | Text | Yes      | Receiver's user ID                                                   |
| rating     | Text | Yes      | Integer 1–5                                                          |
| text       | Text | Yes      | Nonblank feedback, maximum 5,000 characters                          |
| photo      | File | No       | One photo, maximum 5 MB, using the project's image upload middleware |

Do not send giverId: it is set from the access token. The API stores a public-relative photo path such as `public/uploads/feedback/photo-....jpg`; display it using `<server-origin>/<photo-path>`. A text URL is not an uploaded photo.

Success: 201 with `success`, `message` and `data`. The data includes `id`, `giverId`, `receiverId`, `rating`, `text`, `photo` (null when omitted), timestamps, and `giver`/`receiver` objects containing id, name and profilePicture. Invalid input or self feedback returns 400; missing/deleted receiver returns 404.

## Feedback received by a user

`GET /api/v1/feedbacks/user/:userId?page=1&limit=10`

userId identifies the **receiver**, not the giver. Any authenticated supported account can view feedback for a specific existing user. Results are sorted newest first, with ID as a stable tiebreaker.

- page: positive integer, default 1.
- limit: positive integer, default 10, maximum 100.

Response:

```json
{
  "success": true,
  "message": "Feedback retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPage": 0
  }
}
```

An existing user with no feedback returns an empty array. An invalid user ID returns 400 and missing/deleted user returns 404.

## Apply and verify

Stop the running backend first to release the Prisma engine lock, then run:

```sh
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The migrate script runs `prisma db push` against DATABASE_URL; no database changes were applied while implementing this module.

```sh
node node_modules/typescript/bin/tsc --noEmit
node --test tests/feedback.test.cjs
```

Manual checks: create feedback with and without a photo; verify the photo URL; reject rating 0/6/fractional, blank text and malformed IDs; confirm giverId matches the token; list feedback received by two different users to verify filtering; create more than ten records to check page 2 and totals.
