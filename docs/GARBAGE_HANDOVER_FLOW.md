# Garbage handover before payment

## Sequence

```text
accepted
  -> arrived_pickup       Rider: Arrived
  -> garbage_ready        Customer: Give Garbage
  -> garbage_collected    Assigned rider: Collect Garbage
  -> payment_collected    Existing rider payment confirmation
  -> heading_to_station
  -> completed
```

Arrival no longer enables payment. The customer must confirm readiness, then the assigned rider must confirm collection. Both online and cash payment initiation reject earlier states. Existing payment callbacks and station/completion endpoints remain in use.

## App API calls

All endpoints require `Authorization: Bearer <access-token>`.

| Step                      | Method and endpoint                           | Caller                       | Body      |
| ------------------------- | --------------------------------------------- | ---------------------------- | --------- |
| Arrived                   | PATCH /api/v1/bookings/:id/arrive-pickup      | Assigned rider               | None      |
| Give Garbage              | PATCH /api/v1/bookings/:id/give-garbage       | Booking's customer/institute | None      |
| Collect Garbage           | PATCH /api/v1/bookings/:id/collect-garbage    | Assigned rider               | None      |
| Online payment            | POST /api/v1/payments/initiate                | Booking's customer/institute | bookingId |
| Cash payment              | POST /api/v1/payments/initiate/cash           | Booking's customer/institute | bookingId |
| Confirm payment collected | PATCH /api/v1/bookings/:id/payment-collected  | Assigned rider               | None      |
| Heading to station        | PATCH /api/v1/bookings/:id/heading-to-station | Assigned rider               | stationId |
| Complete                  | PATCH /api/v1/bookings/:id/completed          | Assigned rider               | None      |

The two new handover APIs return 200 with the updated booking in data. The booking stores garbageReadyAt and garbageCollectedAt timestamps. Invalid ordering returns 400, wrong participant 403, missing booking 404 and a concurrent status change 409. Retrying the same completed handover step in its current state returns the booking without generating another event. An older step cannot move a booking backwards.

Payment initiation now checks the booking belongs to the authenticated customer. Cash initiation validates the handover state before setting its payment flags. The generic completed status update also uses the dedicated completion checks.

## Socket notifications

Connect to the server origin using Socket.IO auth.token. Personal rooms are joined automatically.

| Event                     | Recipients                  | App action                                  |
| ------------------------- | --------------------------- | ------------------------------------------- |
| booking:arrived_pickup    | Customer                    | Show Give Garbage; keep Pay hidden          |
| booking:garbage_ready     | Customer and assigned rider | Rider shows Collect Garbage; customer waits |
| booking:garbage_collected | Customer and assigned rider | Customer may now show Pay                   |

Both new events use this payload shape:

```json
{
  "bookingId": "<booking-id>",
  "userId": "<customer-id>",
  "riderId": "<rider-id>",
  "status": "garbage_collected",
  "canPay": true,
  "message": "The rider has collected your garbage. You can now pay."
}
```

For booking:garbage_ready, status is garbage_ready and canPay is false. Arrival now also includes canPay=false. Match bookingId before changing the displayed screen.

New states are included in ongoing filters, rider tracking eligibility, booking chat and operational rider-busy lists. The app must include them in its own status handling too.

After reconnect/restart, GET /api/v1/bookings/:id and derive the UI from the booking status. Only garbage_collected enables initiating payment; live socket events can be missed while disconnected. Existing payment:initiated, payment:callback and payment:cash_completed events remain in use.

## Apply and verify

Stop the backend and apply the enum/timestamp changes:

```sh
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

No database migration was executed during implementation. Bookings already at payment_collected or later continue through the existing flow. Bookings at arrived_pickup must now complete the two new steps.

```sh
node --test tests/garbage-handover.test.cjs
node node_modules/typescript/bin/tsc --noEmit
```

Manual test with two Socket.IO clients and customer/rider tokens:

1. Arrive as the rider. Confirm the customer gets canPay=false and sees Give Garbage.
2. Try either payment initiation endpoint: expect 400.
3. Give Garbage as the customer. Confirm the rider receives booking:garbage_ready.
4. Try payment again: still 400. An unrelated customer/rider must be denied the handover actions.
5. Collect Garbage as the assigned rider. Confirm booking:garbage_collected with canPay=true.
6. Initiate cash or Hubtel as the customer, then use the existing rider payment confirmation, station and completion steps.
7. Repeat handover requests and confirm no duplicate notifications or backwards transitions.

The existing Hubtel amount cap, settlement calculation and wallet credit behavior were not redesigned by this handover change.
