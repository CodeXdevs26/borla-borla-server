# Rider accepted booking details

`GET /api/v1/bookings/rider-accepted-bookings?page=1&limit=10`

Requires `Authorization: Bearer <rider-access-token>`. No body or rider ID is needed. Returns only bookings assigned to the authenticated rider with current status accepted. Follow pagination to retrieve all matches. Defaults: page 1, limit 10; maximum limit 100. Results are newest accepted first.

```json
{
  "success": true,
  "message": "Accepted bookings retrieved successfully",
  "data": [
    {
      "id": "<booking-id>",
      "pickupAddress": "Pickup address, Accra",
      "pickupLocation": {
        "type": "Point",
        "coordinates": [-0.187, 5.6037]
      },
      "price": 50,
      "isPaid": true,
      "user": {
        "id": "<customer-id>",
        "name": "Jenny Wilson",
        "email": null,
        "phoneNumber": "+233201234567",
        "profilePicture": "public/uploads/profile-pictures/jenny.jpg"
      }
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 }
}
```

Email, phone, image and price may be null where not set. isPaid is the existing booking isPaid flag; it is not replaced by the separate cash-customer-payment flag. The existing /bookings/accepted endpoint still supplies its original compact display-card response.

## Rider sanitation profile flag

`GET /api/v1/users/my-profile` with the rider token now includes:

```json
{ "isSanitationCkecked": true }
```

The spelling is intentional to match the requested API contract. This is a computed response field, not a writable profile/database column. It is also returned for rider profiles via GET /api/v1/users/:id, including rider dashboard responses.

- True: at least one sanitation checklist item exists and every current item has isCompleted=true for this rider.
- False: any item is unchecked, has no progress record for the rider, or no checklist items exist.
- Other users' completion records do not count.
- Adding an item makes the flag false until that rider completes it. Unchecking an item also makes it false.
- Photos are optional; only completion status determines this flag.
- Non-rider profiles do not include this field.

Use PUT /api/v1/sanitation-checklist/:id/progress to change item completion, then fetch the profile again.

## Verify

No schema or database changes are needed. Restart the backend.

```sh
node --test tests/rider-profile.test.cjs tests/sanitation-progress.test.cjs tests/booking-requirements.test.cjs
node node_modules/typescript/bin/tsc --noEmit
```

Manually check two rider tokens return only their own accepted bookings. Complete all checklist items as one rider and verify their profile flag is true, while another rider's flag remains false. Uncheck one item and verify the first rider's flag becomes false.
