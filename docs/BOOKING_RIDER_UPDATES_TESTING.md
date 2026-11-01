# Booking search, rider documents, capacity and emergency phone

## Setup

Use a development database and valid email/SMS configuration for signup. Generate the Prisma client and apply the schema before starting the server:

```sh
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

`prisma:migrate` runs `prisma db push` against DATABASE_URL. This change was not pushed to a database during implementation. No reset is needed. Existing riders have no capacity initially; set it before they accept bookings. Bookings use wasteSize as their weight in kilograms.

Run local checks without database or gateway access:

```sh
node node_modules/typescript/bin/tsc --noEmit
node --test tests/booking-requirements.test.cjs
```

## Rider signup and files

POST `/api/v1/auth/signup` using Postman Body → form-data:

| Key              | Type | Example             |
| ---------------- | ---- | ------------------- |
| name             | Text | Test Rider          |
| email            | Text | a unique test email |
| phoneNumber      | Text | a unique test phone |
| role             | Text | rider               |
| password         | Text | secret123           |
| confirmPassword  | Text | secret123           |
| dateOfBirth      | Text | 1995-01-01          |
| wasteCapacity    | Text | 50                  |
| ghanaCardId      | File | card.jpg            |
| tricycleLicense  | File | license.pdf         |
| sanitationPermit | File | permit.pdf          |

The two new documents each accept one file, with a 5 MB limit, using the existing disk-upload flow. PDF is additionally accepted for those two fields. Public-relative paths are stored in the matching User arrays and typed Documents records, for example `public/uploads/ghana-cards/license-....pdf`. Open them at `<server>/<stored-path>`. S3 is not required for signup, matching the existing Ghana-card signup storage.

Expect 201 for a valid signup. Missing either actual document upload, non-positive capacity, or invalid capacity must fail. Supplying only text paths for the documents must also fail. Ordinary user/institute signup does not require the rider fields. Complete OTP verification and admin rider approval before testing acceptance.

GET `/api/v1/users/my-profile` with the rider bearer token returns wasteCapacity and both document arrays. Admin rider verification responses include the new fields and document types; approval/rejection updates all three signup document types.

For an existing rider, PATCH `/api/v1/users/update-my-profile` with bearer authorization and form-data `wasteCapacity=50`. Alternatively an admin can PATCH `/api/v1/users/:riderId`. Zero, negative, empty or nonnumeric capacities must fail.

## Booking weight and acceptance

POST `/api/v1/bookings` with customer bearer authorization and JSON:

```json
{
  "wasteCategory": "general",
  "binSize": "Large (240 L)",
  "binQuantity": 1,
  "wasteSize": 50,
  "pickupLatitude": 5.6037,
  "pickupLongitude": -0.187,
  "pickupAddress": "Test pickup, Accra",
  "paymentMethod": "cash"
}
```

`wasteSize` and `wasteCapacity` are kilograms. Submit wasteSize as the booking weight; there is no separate weight field. Missing, non-positive, infinite and malformed values fail validation.

PATCH `/api/v1/bookings/:id/accept` with an approved rider token:

- Capacity 50 and booking weight 50: accepted.
- Capacity 50 and booking weight 51: 400; booking remains pending and unassigned.
- Missing capacity on a legacy rider: 400 until capacity is set.
- Every booking compares wasteSize to rider wasteCapacity.
- Expired search: cannot accept; customer must retry first.
- PATCH `/:id/status` with `{"status":"accepted"}` applies the same checks.
- Two riders accepting the same pending booking concurrently: only one atomic claim can succeed.

## Search expiry socket event

Connect a Socket.IO client to the server origin (not `/api/v1`) with:

```js
const socket = io(SERVER_URL, { auth: { token: CUSTOMER_ACCESS_TOKEN } });
socket.on('booking:rider-search-expired', payload => console.log(payload));
```

The authenticated connection automatically joins `user:<customerId>`; no manual room join is needed. This event already existed and is retained. It now emits before persistent notification creation so notification-storage failure cannot suppress it.

Create a booking and allow no rider to accept. Searches retain their 15-minute interval and two-hour duration; the cron checks due work every minute. Matching riders are notified at most once per search cycle, so a search pass does not necessarily produce another `booking:new` event for the same rider.

For a fast test, use MongoDB Compass on the development database to set the test booking's riderSearchExpiresAt and nextRiderSearchAt to past BSON dates. Keep status=pending, riderId=null and riderSearchStatus=active, with no active riderSearchLockUntil. Do not change production records. Within the next cron tick expect:

```json
{
  "bookingId": "<booking-id>",
  "searchCycle": 1,
  "canRequestAgain": true,
  "message": "No rider accepted your booking within two hours. You can request another rider search."
}
```

Verify riderSearchStatus=expired and nextRiderSearchAt=null. Further ticks must not emit again for that cycle. Accepted/cancelled bookings must not expire. POST `/api/v1/bookings/:id/retry-rider-search` as the customer to start another cycle. Socket events are live delivery; disconnected customers should retrieve stored notifications/booking state after reconnecting.

## Emergency phone

POST `/api/v1/emergency-support` with bearer authorization and form-data:

- location: `{"type":"Point","coordinates":[-0.187,5.6037]}`
- locationAddress: Test address
- description: Test emergency support request
- phoneNumber: +233201234567
- images: attach at least one photo (maximum five).

Expect 201 and `data.contactPhoneNumber` equal to the submitted phone, even if the profile has a different or missing number. The profile is unchanged. Omit phoneNumber to use the existing profile number; if neither exists, expect 400. Blank/malformed supplied phone numbers must fail. The existing contactPhoneNumber database field is reused rather than storing duplicate phone fields.
