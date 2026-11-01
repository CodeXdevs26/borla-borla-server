# Customer activity history page

`GET /api/v1/bookings/history?filter=weekly&page=1&limit=10`

Requires `Authorization: Bearer <user-or-institute-access-token>`. The account ID is taken from the token. No body is required.

| Query  | Values                        | Default |
| ------ | ----------------------------- | ------- |
| filter | today, weekly, monthly, all   | weekly  |
| page   | Positive integer              | 1       |
| limit  | Positive integer, maximum 100 | 10      |

Example response:

```json
{
  "success": true,
  "message": "Booking history retrieved successfully",
  "data": {
    "summary": {
      "filter": "weekly",
      "kgDeposited": 52.2,
      "paid": 160,
      "currency": "GHS"
    },
    "bookings": [
      {
        "id": "<booking-id>",
        "status": "completed",
        "statusLabel": "Completed",
        "rider": {
          "id": "<rider-id>",
          "name": "McKenna T.",
          "profilePicture": "public/uploads/profile-pictures/rider.jpg",
          "averageRating": 5,
          "totalRatings": 20,
          "completedBookings": 1200
        },
        "wasteSize": 18.4,
        "binQuantity": 3,
        "wasteCategory": "organic",
        "receipt": {
          "bookingId": "<booking-id>",
          "detailsEndpoint": "/api/v1/bookings/<booking-id>"
        }
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 12, "totalPage": 2 }
}
```

## Screen mapping and calculation rules

- Summary weight: sum of wasteSize for completed bookings only; cancelled waste is not counted as deposited.
- Summary paid: sum of booking price where isPaid or isPaidByCustomer is true and isRefunded is false, across the filtered completed/cancelled bookings. This is based on booking flags/prices, not a gateway settlement ledger or partial-refund calculation.
- Both summary values cover the entire selected period, independently of card pagination.
- Cards include completed and cancelled bookings only, scoped to the logged-in customer. They retain the existing newest-created-first history order.
- Periods use Africa/Accra (UTC), with weeks starting Monday and months starting on day one. Completed/cancelled timestamps determine period membership; older records missing that timestamp fall back to createdAt. all disables the date filter.
- Rider avatar/name/rating and completedBookings supply the rider line; the app formats 1200 as 1.2k if desired. Ratings are all-time booking-rating averages, matching existing rider statistics. Rider is null for a booking cancelled before assignment.
- Weight: wasteSize in kg. Bin: binQuantity. Waste type: wasteCategory. The existing schema supports organic, metal, plastic, general and paper; the screenshot's Mixed value is not currently a separate category.
- Receipt button: use receipt.detailsEndpoint with the same authorization to fetch full booking details and render the receipt screen. It returns JSON, not a generated PDF or downloadable receipt URL. Cancelled bookings retain this details action too.
- No history returns zero summary values and an empty bookings array.

## Verification

```sh
node --test tests/booking-requirements.test.cjs
node node_modules/typescript/bin/tsc --noEmit
```

No schema/database changes are needed for this endpoint. Restart the backend. Manually compare a development user's completed, cancelled, refunded and unpaid records with the summary; change page/limit and confirm the totals stay the same; use a second token and confirm the data belongs only to that account.
