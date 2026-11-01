# Borla Borla design study

Reviewed 2026-10-24. Source: https://www.figma.com/design/oClPByZPYJ5hhhGgyfNBVp/Borla-Borla-Application-updated?node-id=1-7

## Scope and evidence

Read the App Design (1:7) and Admin Dashboard (1:6) page structures and screen labels. Inspected rendered design context for Waste Quantity (353:1714), institutional Collection Type (6165:40197), and rider Ride Request Details (1025:11346). This is a product-flow overview, not an exhaustive screen-by-screen audit or verification of prototype navigation. Labels, example prices, and sample statistics are not automatically business rules. The file contains duplicate, hidden, and alternative screens; confirm the applicable variant when implementing a feature.

## Product journeys

- Individual customer: choose role, register and verify, select/search/save pickup location, select waste category, upload photos, specify bin size/count and estimated weight, obtain an estimate, choose payment, request collection, and wait for rider acceptance. Includes unavailable-rider/retry states, cancellation reasons, rider details, chat/call actions, tracking, payment, receipt, and review.
- Customer scheduling: select a future pickup date/time; view ongoing, scheduled, and historical bookings. Split-payment screens collect neighbour contributions.
- Institutional customer: organization identity and collection summaries, one-time or recurring/tailored collection, daily/weekly/specific-day schedules and multiple pickups per day.
- Rider: signup and documents, approval state, safety/sanitation guidance and checks, online/offline availability, review request details and capacity suitability, accept/decline, navigate to pickups, mark arrival, collect payment, navigate to a disposal station, and complete collection. Designs include first/second/third pickup states and a multi-stop journey.
- Rider finances: earnings, wallet balance, top-up/withdrawal, commissions, transaction history, performance, bonuses, reports, receipts, ratings, and referrals.
- Shared features: profile/password management, notifications, support chat, emergency contact/reporting, referrals, informational content, and language selection.

## Admin workflows

Dashboard and analytics; real-time rider monitor; user/rider details; rider document approval with operating-zone assignment; zones, boundaries and stations; operations and zone health; payments, refunds, payouts and commission settings; rider/customer incentives and loyalty; customer support and emergency support; support-team/sales-lead access; settings and content.

## Backend mapping

Existing modules broadly correspond to these areas: auth/otp/users, bookings/riders, riderVerification, zones/stations, payments/wallets/commissions/earnings, ratings/messages/notifications, dashboard/operations/realtime monitor, referrals/incentivesLoyalty, emergencySupport, specialAccess and contents/contentPages.

Current booking records include category, images, bin size/count, weight, pickup/dropoff, customer/rider, payment flags, station, lifecycle timestamps, optional scheduledFor, neighbour name/amount entries, and persisted rider-search state. Rider search currently uses 15-minute retry intervals within a two-hour cycle.

## Items to verify before implementation

- Recurring institutional schedules: current Booking schema has a single scheduledFor timestamp; no explicit recurrence model was found.
- Multi-stop rider routes: current Booking has one pickup and optional dropoff; no explicit route/stop entity was found.
- Safety checklist submissions, photo proof, shift completion and capacity/licence/permit fields: visible in designs, but dedicated persistence was not identified in the reviewed schema. Generic documents/content may support parts of these flows.
- Neighbour contribution entries exist, but do not establish independent payment collection or settlement for each neighbour.
- Payment mockups show Mobile Money, cash and card-brand examples. Current Booking.paymentMethod values are hubtel and cash; do not infer separate supported gateways from decorative payment logos.
- Scheduling eligibility, price calculation, matching radius, capacity enforcement, referral rewards, minimum wallet balance and commissions must be verified against service code and agreed requirements rather than sample design values.

No application behavior was changed during this study.
