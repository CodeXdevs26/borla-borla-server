# Safety toolkit and rider accepted bookings

All requests require `Authorization: Bearer <access-token>` for an active, verified account.

## Safety toolkit sections

The page heading is static app text. Each section is now its own document with id, title, items, createdAt and updatedAt. Only these four safety-toolkit endpoints exist:

| Method | Endpoint                          | Access              | Purpose                            |
| ------ | --------------------------------- | ------------------- | ---------------------------------- |
| POST   | /api/v1/safety-toolkit            | Admin               | Add one section                    |
| PATCH  | /api/v1/safety-toolkit/:sectionId | Admin               | Update title and/or bullet list    |
| DELETE | /api/v1/safety-toolkit/:sectionId | Admin               | Delete that complete section       |
| GET    | /api/v1/safety-toolkit            | Authenticated users | Get all sections in creation order |

POST JSON body:

```json
{
  "title": "Personal Protective Equipment (PPE)",
  "items": ["Wear protective gloves.", "Wear a helmet."]
}
```

Use the returned data.id as sectionId in PATCH/DELETE. PATCH may contain title only, items only, or both. To add, edit or remove bullets, send the complete desired items array; it replaces that section's previous bullet list. Other sections remain unchanged. Example:

```json
{
  "title": "Updated PPE Guidelines",
  "items": [
    "Wear clean protective gloves.",
    "Wear a helmet.",
    "Wear a reflective vest."
  ]
}
```

GET returns data as an array of section records, or [] when none exist. POST returns 201; other successful operations return 200. Invalid input returns 400; missing section IDs return 404. Titles allow 1?200 characters, bullet text 1?2,000 characters, and each section must contain 1?100 bullets. Whitespace-only strings are rejected. DELETE needs no body.

The old PATCH /api/v1/safety-toolkit and DELETE /api/v1/safety-toolkit endpoints are removed. The old singleton payload with sections is no longer accepted. Admin access includes admin, sub-admin and super-admin.

Existing singleton content in safety_toolkits is not automatically moved into the new safety_toolkit_sections collection. If you already saved a toolkit, recreate its sections using POST before switching the app. No existing database records were deleted during implementation.

## Accepted booking cards

`GET /api/v1/bookings/accepted?page=1&limit=10`

Rider access only. The rider ID is taken from the token. No body is required. Returns only bookings assigned to that rider with current status `accepted`, newest acceptance first. Ongoing/completed/cancelled records are excluded. The existing `/api/v1/bookings/rider-bookings` remains available for broader status-based listing.

Pagination: page defaults to 1; limit defaults to 10, maximum 100. Both must be positive integers.

Example response (photo URL abbreviated for illustration):

```json
{
  "success": true,
  "message": "Accepted bookings retrieved successfully",
  "data": [
    {
      "customer": {
        "name": "Jenny Wilson",
        "roleLabel": "User",
        "profilePicture": "public/uploads/profile-pictures/jenny.jpg"
      },
      "pickupAddress": "85 Ave, Street Side Road, Accra, Ghana",
      "dropoffAddress": "1901 Thornridge Road, Accra, Ghana",
      "estimatedDistance": 22.6,
      "distanceUnit": "km",
      "paymentLabel": "Hubtel",
      "price": 50,
      "currency": "GHS",
      "displayTime": "2026-10-24T10:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 }
}
```

Screenshot mapping:

- Avatar/name/type: customer.profilePicture, customer.name and customer.roleLabel.
- Time badge: format displayTime in the app's desired timezone. It uses scheduledFor when available, otherwise acceptedAt, otherwise requestedAt.
- Pickup/destination: pickupAddress and dropoffAddress. Destination falls back to the assigned station address, then null if not yet known.
- Distance badge: estimatedDistance with distanceUnit. This is the existing stored estimate; acceptance currently calculates it from rider location to pickup, so it is not guaranteed to be pickup-to-station distance.
- Payment and amount: paymentLabel and price with currency. The schema stores hubtel/cash, not an MTN-specific provider; the response does not invent MTN MoMo details. The app can supply its own payment icons.

Missing avatar/distance/price/destination may be null; show an appropriate placeholder. An empty list is `data: []` with total/totalPage zero.

## Apply and test

Stop the backend first to release the Windows Prisma engine lock:

```sh
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The migrate script applies the schema and accepted-booking index to DATABASE_URL via `prisma db push`. No database changes were applied during implementation.

```sh
node node_modules/typescript/bin/tsc --noEmit
node --test tests/safety-toolkit.test.cjs tests/booking-requirements.test.cjs tests/feedback.test.cjs
```

Manually create/list/update/delete individual sections as admin; check that a rider can read but cannot write. For accepted bookings, use two rider tokens and confirm each sees only their own accepted bookings. Verify pagination with more than ten entries, and verify that changing a booking to arrived_pickup removes it from the accepted list.
