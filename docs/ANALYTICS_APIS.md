# Analytics Dashboard APIs

This document describes the analytics APIs for the operations dashboard.

## Base URL

```
/api/v1/operations
```

## Authentication

All endpoints require admin or super admin authentication.

**Headers:**

```
Authorization: Bearer <admin_token>
```

---

## 1. Pickup Success Rate

Get pickup success rate for a zone as a time series of percentage values.

**Endpoint:** `GET /zones/:zoneId/pickup-success-rate`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| zoneId | string | Yes | - | Zone ID in the URL path |
| period | enum | No | all-time | Time period: `weekly`, `monthly`, `yearly`, `all-time` |
| startDate | string | No | - | Start date (ISO format) |
| endDate | string | No | now | End date (ISO format) |

**Response:**

```json
{
  "success": true,
  "message": "Pickup success rate retrieved successfully",
  "data": [
    { "day": "Apr 6", "rate": 88 },
    { "day": "Apr 7", "rate": 92 },
    { "day": "Apr 8", "rate": 86 },
    { "day": "Apr 9", "rate": 80 },
    { "day": "Apr 10", "rate": 89 },
    { "day": "Apr 11", "rate": 83 },
    { "day": "Apr 12", "rate": 85 }
  ]
}
```

**Frontend Integration (React):**

```tsx
const { data } = await fetch(
  `/api/v1/operations/zones/${zoneId}/pickup-success-rate?period=weekly`,
);
// Use data array directly in BarChart component
```

---

## 2. Zone Performance Ranking

Get zones ranked by revenue with performance metrics.

**Endpoint:** `GET /zone-ranking`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | enum | No | monthly | Time period: `daily`, `weekly`, `monthly` |
| startDate | string | No | - | Start date (ISO format) |
| endDate | string | No | now | End date (ISO format) |
| limit | number | No | 10 | Number of zones to return |

**Response:**

```json
{
  "success": true,
  "message": "Zone ranking retrieved successfully",
  "data": [
    {
      "rank": 1,
      "zone": "Central Zone",
      "zoneId": "507f1f77bcf86cd799439011",
      "revenue": 42500,
      "pickups": 892,
      "growth": 12.5,
      "status": "High"
    },
    {
      "rank": 2,
      "zone": "North Zone",
      "zoneId": "507f1f77bcf86cd799439012",
      "revenue": 36300,
      "pickups": 765,
      "growth": 8.3,
      "status": "High"
    },
    {
      "rank": 3,
      "zone": "South Zone",
      "zoneId": "507f1f77bcf86cd799439013",
      "revenue": 31700,
      "pickups": 698,
      "growth": 5.7,
      "status": "Medium"
    }
  ]
}
```

**Status Determination:**

- **High**: Growth ≥ 8% AND Pickups ≥ 700
- **Medium**: Growth ≥ 3% AND Pickups ≥ 500
- **Low**: Below medium thresholds

**Growth Calculation:**
Growth percentage is calculated by comparing revenue in the current period with the previous period of the same duration.

**Frontend Integration (React):**

```tsx
const { data } = await fetch(
  '/api/v1/operations/zone-ranking?period=monthly&limit=5',
);
// Map data to table rows
```

---

## 3. Top Performing Riders

Get top riders ranked by trips and earnings.

**Endpoint:** `GET /top-riders`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | enum | No | weekly | Time period: `daily`, `weekly`, `monthly` |
| startDate | string | No | - | Start date (ISO format) |
| endDate | string | No | now | End date (ISO format) |
| limit | number | No | 5 | Number of riders to return |

**Response:**

```json
{
  "success": true,
  "message": "Top performing riders retrieved successfully",
  "data": [
    {
      "rank": 1,
      "riderId": "507f1f77bcf86cd799439011",
      "name": "Kwame Mensah",
      "zone": "Central Zone",
      "trips": 87,
      "earnings": 12450,
      "rating": 4.9
    },
    {
      "rank": 2,
      "riderId": "507f1f77bcf86cd799439012",
      "name": "Ama Serwaa",
      "zone": "Central Zone",
      "trips": 82,
      "earnings": 11680,
      "rating": 4.8
    },
    {
      "rank": 3,
      "riderId": "507f1f77bcf86cd799439013",
      "name": "Kofi Asante",
      "zone": "Central Zone",
      "trips": 78,
      "earnings": 11120,
      "rating": 4.8
    }
  ]
}
```

**Ranking Logic:**

1. Primary sort: Number of trips (descending)
2. Secondary sort: Total earnings (descending)
3. Only riders with at least 1 completed trip are included

**Rating Calculation:**
Average rating is calculated from all ratings received on completed bookings within the specified period.

**Frontend Integration (React):**

```tsx
const { data } = await fetch(
  '/api/v1/operations/top-riders?period=weekly&limit=5',
);
// Map data to table rows with Avatar, name, zone, trips, earnings, rating
```

### Top Performing Riders By Zone

Get top riders for a specific zone ranked by trips, earnings, and rating.

**Endpoint:** `GET /zones/:zoneId/top-performing-riders`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| zoneId | string | Yes | - | Zone ID in the URL path |
| period | enum | No | weekly | Time period: `daily`, `weekly`, `monthly` |
| startDate | string | No | - | Start date (ISO format) |
| endDate | string | No | now | End date (ISO format) |
| limit | number | No | 5 | Number of riders to return |

**Response:**

```json
{
  "success": true,
  "message": "Zone top performing riders retrieved successfully",
  "data": [
    {
      "rank": 1,
      "name": "Kwame Mensah",
      "zone": "Central Zone",
      "trips": 87,
      "earnings": 12450,
      "rating": 4.9
    },
    {
      "rank": 2,
      "name": "Ama Serwaa",
      "zone": "Central Zone",
      "trips": 82,
      "earnings": 11680,
      "rating": 4.8
    }
  ]
}
```

**Ranking Logic:**

1. Primary sort: Number of trips (descending)
2. Secondary sort: Total earnings (descending)
3. Third sort: Average rating (descending)
4. Only riders with at least 1 completed trip are included

**Frontend Integration (React):**

```tsx
const { data } = await fetch(
  `/api/v1/operations/zones/${zoneId}/top-performing-riders?period=weekly&limit=5`,
);
// Use data directly in table rows: rank, name, zone, trips, earnings, rating
```

### Incentives & Loyalty Rider Cards (Zone)

Get rider card data for incentives and loyalty by rider assigned zone.

**Endpoint:** `GET /api/v1/incentives-loyalty/rider-cards`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| zoneId | string | No | - | Optional zone ID filter |
| zoneName | string | No | - | Optional zone name filter |
| limit | number | No | all riders | Optional maximum number of cards |

**Business Rules:**

1. Only `bookingStatus.completed` counts as a ride.
2. Daily target is `25` rides.
3. Bonus eligibility is based on completed rides in the current day.
4. `extraRidesCompleted` is computed as `todayRides - 25`.

**Response (Card-friendly):**

```json
{
  "success": true,
  "message": "Rider incentives and loyalty cards retrieved successfully",
  "data": [
    {
      "name": "Kwame Mensah",
      "initials": "KM",
      "rideCount": 260,
      "rating": 4.9,
      "todayRides": 28,
      "totalRides": 25,
      "extraRidesCompleted": 3,
      "status": "bonus-eligible"
    },
    {
      "name": "Ama Serwaa",
      "initials": "AS",
      "rideCount": 190,
      "rating": 4.7,
      "todayRides": 17,
      "totalRides": 25,
      "extraRidesCompleted": -8,
      "status": "in-progress"
    }
  ]
}
```

**Frontend Integration (React):**

```tsx
const { data } = await fetch('/api/v1/incentives-loyalty/rider-cards');
// or filter by zone id
// const { data } = await fetch(`/api/v1/incentives-loyalty/rider-cards?zoneId=${zoneId}`);
// or filter by zone name
// const { data } = await fetch('/api/v1/incentives-loyalty/rider-cards?zoneName=Central Zone');
// Use each object directly with RiderCard props
```

### Customer Loyalty Leaderboard

Get customers ranked by completed bookings, then by total bookings created.

**Endpoint:** `GET /api/v1/incentives-loyalty/customer-loyalty`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| search | string | No | - | Search by customer name, email, or phone |
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Ranking Rules:**

1. Higher `completedBookings` ranks first.
2. Tie-breaker is higher `totalBookingsCreated`.

**Points Calculation:**

- `points = (completedBookings * 10) + totalBookingsCreated`
- Completed bookings carry higher weight, while all created bookings add a smaller bonus.

**Response:**

```json
{
  "success": true,
  "message": "Customer loyalty leaderboard retrieved successfully",
  "data": [
    {
      "id": "69c77b0ef058fb1dabe66053",
      "rank": 1,
      "name": "John Smith",
      "points": 2450,
      "rides": 245,
      "rating": 5,
      "badges": [
        { "label": "Top Performer", "variant": "primary" },
        { "label": "100 Rides", "variant": "info" }
      ],
      "totalBookingsCreated": 260,
      "completedBookings": 245
    }
  ],
  "meta": {
    "total": 20,
    "page": 1,
    "limit": 10,
    "totalPage": 2
  }
}
```

**Frontend Integration (React):**

```tsx
const response = await fetch(
  '/api/v1/incentives-loyalty/customer-loyalty?search=john&page=1&limit=10',
);
const payload = await response.json();
const rows = payload.data;
const pagination = payload.meta;
```

---

## 4. Zone Comparison

Get revenue and pickups comparison for all zones.

**Endpoint:** `GET /zone-comparison`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | enum | No | monthly | Time period: `daily`, `weekly`, `monthly` |
| startDate | string | No | - | Start date (ISO format) |
| endDate | string | No | now | End date (ISO format) |

**Response:**

```json
{
  "success": true,
  "message": "Zone comparison data retrieved successfully",
  "data": [
    { "zone": "Central Zone", "revenue": 45000, "pickups": 892 },
    { "zone": "North Zone", "revenue": 36300, "pickups": 765 },
    { "zone": "South Zone", "revenue": 31700, "pickups": 698 },
    { "zone": "West Zone", "revenue": 29000, "pickups": 623 },
    { "zone": "East Zone", "revenue": 26100, "pickups": 547 }
  ]
}
```

**Data Structure:**

- **zone**: Zone name
- **revenue**: Total revenue from completed bookings in the period (GHS)
- **pickups**: Count of completed bookings in the period
- Results are sorted by revenue (descending)

**Frontend Integration (React):**

```tsx
const [period, setPeriod] = useState('Weekly');
const { data } = await fetch(
  `/api/v1/operations/zone-comparison?period=${period.toLowerCase()}`,
);

// Use directly in dual-axis BarChart:
<BarChart data={data}>
  <Bar yAxisId="right" dataKey="pickups" name="Pickups" fill="#2F80ED" />
  <Bar yAxisId="left" dataKey="revenue" name="Revenue (GHC)" fill="#10B981" />
</BarChart>;
```

---

## 5. Zone Details (KPIs)

Get detailed KPIs for a specific zone.

**Endpoint:** `GET /zones/:zoneId/details`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| zoneId | string | Yes | MongoDB ObjectId of the zone |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | enum | No | monthly | Time period: `daily`, `weekly`, `monthly` |
| startDate | string | No | - | Start date (ISO format) |
| endDate | string | No | now | End date (ISO format) |

**Response:**

```json
{
  "success": true,
  "message": "Zone details retrieved successfully",
  "data": {
    "zoneId": "507f1f77bcf86cd799439011",
    "zoneName": "Central Zone",
    "totalRevenue": 42500,
    "totalPickups": 892,
    "avgRating": 4.8,
    "activeRiders": 12,
    "growth": 12.5,
    "status": "High"
  }
}
```

**Metrics Explanation:**

- **totalRevenue**: Sum of all completed booking prices in the period
- **totalPickups**: Count of completed bookings in the period
- **avgRating**: Average rating from all bookings in the period
- **activeRiders**: Current count of verified riders assigned to this zone
- **growth**: Percentage change in revenue compared to previous period
- **status**: Performance status (High/Medium/Low) based on growth and pickups

**Frontend Integration (React):**

```tsx
const zoneId = '507f1f77bcf86cd799439011';
const { data } = await fetch(`/api/v1/operations/zones/${zoneId}/details?period=monthly`);

// Use in KPI cards:
<KpiCard label="Total Revenue" value={`GHC₵ ${data.totalRevenue.toLocaleString()}`} />
<KpiCard label="Total Pickups" value={data.totalPickups} />
<KpiCard label="Avg Rating" value={`${data.avgRating} ★`} />
<KpiCard label="Active Riders" value={data.activeRiders} />
```

---

## 6. Zone Performance Trends

Get daily trends (pickups and revenue) for a specific zone.

**Endpoint:** `GET /zones/:zoneId/trends`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| zoneId | string | Yes | MongoDB ObjectId of the zone |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | enum | No | weekly | Time period: `daily`, `weekly`, `monthly` |
| startDate | string | No | - | Start date (ISO format) |
| endDate | string | No | now | End date (ISO format) |

**Response:**

```json
{
  "success": true,
  "message": "Zone performance trends retrieved successfully",
  "data": [
    { "day": "Day 1", "pickups": 7500, "revenue": 5000 },
    { "day": "Day 2", "pickups": 7700, "revenue": 5200 },
    { "day": "Day 3", "pickups": 8000, "revenue": 6500 },
    { "day": "Day 4", "pickups": 7600, "revenue": 6400 },
    { "day": "Day 5", "pickups": 7300, "revenue": 6300 },
    { "day": "Day 6", "pickups": 7900, "revenue": 5600 },
    { "day": "Day 7", "pickups": 7100, "revenue": 5100 }
  ]
}
```

**Data Structure:**

- **day**: Day label (Day 1, Day 2, etc.)
- **pickups**: Count of completed bookings on that day
- **revenue**: Total revenue (in GHS) from completed bookings on that day

**Frontend Integration (React):**

```tsx
const zoneId = '507f1f77bcf86cd799439011';
const { data } = await fetch(
  `/api/v1/operations/zones/${zoneId}/trends?period=weekly`,
);

// Use directly in dual-axis LineChart:
<LineChart data={data}>
  <Line yAxisId="left" dataKey="pickups" stroke="#374151" />
  <Line yAxisId="right" dataKey="revenue" stroke="#10B981" />
</LineChart>;
```

---

## Complete Example Requests

### Get Zone Success Rate

```bash
curl -X GET "http://localhost:5000/api/v1/operations/zones/<zoneId>/pickup-success-rate?period=weekly" \
  -H "Authorization: Bearer <admin_token>"
```

### Get Monthly Zone Rankings (Top 10)

```bash
curl -X GET "http://localhost:5000/api/v1/operations/zone-ranking?period=monthly&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

### Get Top 5 Riders This Week

```bash
curl -X GET "http://localhost:5000/api/v1/operations/top-riders?period=weekly&limit=5" \
  -H "Authorization: Bearer <admin_token>"
```

### Get Zone Comparison

```bash
curl -X GET "http://localhost:5000/api/v1/operations/zone-comparison?period=monthly" \
  -H "Authorization: Bearer <admin_token>"
```

### Custom Date Range

```bash
curl -X GET "http://localhost:5000/api/v1/operations/zone-ranking?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer <admin_token>"
```

### Get Zone Details with KPIs

```bash
curl -X GET "http://localhost:5000/api/v1/operations/zones/507f1f77bcf86cd799439011/details?period=monthly" \
  -H "Authorization: Bearer <admin_token>"
```

### Get Zone Performance Trends

```bash
curl -X GET "http://localhost:5000/api/v1/operations/zones/507f1f77bcf86cd799439011/trends?period=weekly" \
  -H "Authorization: Bearer <admin_token>"
```

---

## Frontend Implementation Example

```tsx
// React component for analytics dashboard
import { useEffect, useState } from 'react';

export function AnalyticsDashboard() {
  const [successRate, setSuccessRate] = useState([]);
  const [zoneRanking, setZoneRanking] = useState([]);
  const [topRiders, setTopRiders] = useState([]);

  useEffect(() => {
    // Fetch all analytics data
    Promise.all([
      fetch(
        `/api/v1/operations/zones/${zoneId}/pickup-success-rate?period=weekly`,
      ),
      fetch('/api/v1/operations/zone-ranking?period=monthly&limit=5'),
      fetch('/api/v1/operations/top-riders?period=weekly&limit=5'),
    ])
      .then(responses => Promise.all(responses.map(r => r.json())))
      .then(([successData, zoneData, riderData]) => {
        setSuccessRate(successData.data);
        setZoneRanking(zoneData.data);
        setTopRiders(riderData.data);
      });
  }, []);

  return (
    <div className="grid gap-6">
      <PickupSuccessRateChart data={successRate} />
      <RankedZonesTable data={zoneRanking} />
      <TopPerformingRiders data={topRiders} />
    </div>
  );
}
```

### Zone Details Page Example

```tsx
// React component for zone details page
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export function ZoneDetailsPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;

  const [zoneDetails, setZoneDetails] = useState(null);
  const [zoneTrends, setZoneTrends] = useState([]);
  const [topRiders, setTopRiders] = useState([]);

  useEffect(() => {
    // Fetch zone-specific data
    Promise.all([
      fetch(`/api/v1/operations/zones/${zoneId}/details?period=monthly`),
      fetch(`/api/v1/operations/zones/${zoneId}/trends?period=weekly`),
      fetch(`/api/v1/operations/top-riders?period=weekly&limit=5`),
    ])
      .then(responses => Promise.all(responses.map(r => r.json())))
      .then(([detailsData, trendsData, ridersData]) => {
        setZoneDetails(detailsData.data);
        setZoneTrends(trendsData.data);
        setTopRiders(ridersData.data);
      });
  }, [zoneId]);

  if (!zoneDetails) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Zone Header */}
      <div>
        <h1>{zoneDetails.zoneName}</h1>
        <div className="badge">{zoneDetails.status} Performance</div>
        <p>Growth: +{zoneDetails.growth}%</p>
      </div>

      {/* KPI Cards */}
      <KpiGrid
        items={[
          {
            label: 'Total Revenue',
            value: `GHC₵ ${zoneDetails.totalRevenue.toLocaleString()}`,
          },
          { label: 'Total Pickups', value: zoneDetails.totalPickups },
          { label: 'Avg Rating', value: `${zoneDetails.avgRating} ★` },
          { label: 'Active Riders', value: zoneDetails.activeRiders },
        ]}
      />

      {/* Performance Trends Chart */}
      <ZonePerformanceTrends data={zoneTrends} />

      {/* Top Riders Table */}
      <TopPerformingRiders data={topRiders} />
    </div>
  );
}
```

---

## 7. Zone Statistics (Fleet Management)

Get statistics for all zones including total riders and active riders count.

**Endpoint:** `GET /zone-stats`

**Query Parameters:** None

**Response:**

```json
{
  "success": true,
  "message": "Zone statistics retrieved successfully",
  "data": [
    {
      "zoneId": "zone_id_1",
      "name": "Zone Central",
      "totalRiders": 45,
      "activeNow": 12
    },
    {
      "zoneId": "zone_id_2",
      "name": "Zone East",
      "totalRiders": 38,
      "activeNow": 8
    },
    {
      "zoneId": "zone_id_3",
      "name": "Zone West",
      "totalRiders": 52,
      "activeNow": 15
    }
  ]
}
```

**Usage Example:**

```tsx
// FleetZoneManagement Component
const { data: zoneStats } = useQuery('/api/v1/operations/zone-stats');

return (
  <div className="grid grid-cols-3 gap-4">
    {zoneStats?.map(zone => (
      <div key={zone.zoneId} className="zone-card">
        <h3>{zone.name}</h3>
        <p>Total Riders: {zone.totalRiders}</p>
        <p>Active Now: {zone.activeNow}</p>
      </div>
    ))}
  </div>
);
```

---

## 8. Riders List (Fleet Management)

Get a paginated list of riders with zone assignments, status, and filtering options.

**Endpoint:** `GET /riders-list`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| search | string | No | - | Search term for rider name or email |
| zoneId | string | No | - | Filter by specific zone ID |
| status | enum | No | - | Filter by rider status: `Online`, `Offline`, `Busy` |
| page | number | No | 1 | Page number for pagination |
| limit | number | No | 12 | Number of riders per page |

**Response:**

```json
{
  "success": true,
  "message": "Riders list retrieved successfully",
  "data": [
    {
      "riderId": "rider_id_1",
      "name": "John Doe",
      "email": "john@example.com",
      "location": "Downtown Area",
      "zipCode": "N/A",
      "zoneId": "zone_id_1",
      "zoneName": "Zone Central",
      "completedTrips": 142,
      "status": "Online"
    },
    {
      "riderId": "rider_id_2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "location": "Uptown District",
      "zipCode": "N/A",
      "zoneId": "zone_id_2",
      "zoneName": "Zone East",
      "completedTrips": 89,
      "status": "Busy"
    },
    {
      "riderId": "rider_id_3",
      "name": "Mike Johnson",
      "email": "mike@example.com",
      "location": "Westside",
      "zipCode": "N/A",
      "zoneId": null,
      "zoneName": null,
      "completedTrips": 234,
      "status": "Offline"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 12,
    "totalPage": 4
  }
}
```

**Rider Status Logic:**

- **Busy**: Rider is online AND has an active booking (status: `accepted`, `arrived_pickup`, `in_progress`, `arrived_dropoff`)
- **Online**: Rider's `onlineStatus` is `online` AND has no active booking
- **Offline**: Rider's `onlineStatus` is `offline`

**Usage Example:**

```tsx
// FleetZoneManagement Component with Rider List
const [search, setSearch] = useState('');
const [selectedZone, setSelectedZone] = useState('');
const [statusFilter, setStatusFilter] = useState('');
const [page, setPage] = useState(1);

const { data: ridersData } = useQuery(
  `/api/v1/operations/riders-list?search=${search}&zoneId=${selectedZone}&status=${statusFilter}&page=${page}&limit=12`,
);

return (
  <div>
    {/* Search and Filters */}
    <div className="filters">
      <input
        type="text"
        placeholder="Search riders..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <select
        value={selectedZone}
        onChange={e => setSelectedZone(e.target.value)}
      >
        <option value="">All Zones</option>
        {zones.map(z => (
          <option value={z.zoneId}>{z.name}</option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
      >
        <option value="">All Status</option>
        <option value="Online">Online</option>
        <option value="Busy">Busy</option>
        <option value="Offline">Offline</option>
      </select>
    </div>

    {/* Riders Table */}
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Zone</th>
          <th>Completed Trips</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {ridersData?.data.map(rider => (
          <tr key={rider.riderId}>
            <td>{rider.name}</td>
            <td>{rider.email}</td>
            <td>{rider.zoneName || 'Unassigned'}</td>
            <td>{rider.completedTrips}</td>
            <td>
              <span
                className={`status-badge status-${rider.status.toLowerCase()}`}
              >
                {rider.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* Pagination */}
    <Pagination
      current={page}
      total={ridersData?.meta.totalPage}
      onChange={setPage}
    />
  </div>
);
```

---

## 9. Zone Summary (ZIP Code Management)

Get summary statistics for a specific zone including total areas and active riders.

**Endpoint:** `GET /zones/:zoneId/summary`

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| zoneId    | string | Yes      | Zone ID     |

**Response:**

```json
{
  "success": true,
  "message": "Zone summary retrieved successfully",
  "data": {
    "totalArea": 24,
    "activeRiders": 847
  }
}
```

**Usage Example:**

```tsx
// Uptown Zone Page
const { data: summary } = useQuery(
  `/api/v1/operations/zones/${zoneId}/summary`,
);

return (
  <div className="flex items-center gap-x-2">
    <div className="bg-card rounded-xl p-6">
      <p className="text-muted-foreground text-sm mb-2">Total Area</p>
      <p className="text-foreground text-2xl font-semibold">
        {summary?.totalArea}
      </p>
    </div>
    <div className="bg-card rounded-xl p-6">
      <p className="text-muted-foreground text-sm mb-2">Active Riders</p>
      <p className="text-foreground text-2xl font-semibold">
        {summary?.activeRiders}
      </p>
    </div>
  </div>
);
```

---

## 10. Get ZIP Codes in Zone

Get all ZIP codes for a specific zone with search and pagination.

**Endpoint:** `GET /zones/:zoneId/zip-codes`

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| zoneId    | string | Yes      | Zone ID     |

**Query Parameters:**

| Parameter | Type   | Required | Default | Description                           |
| --------- | ------ | -------- | ------- | ------------------------------------- |
| search    | string | No       | -       | Search term for ZIP code or area name |
| page      | number | No       | 1       | Page number for pagination            |
| limit     | number | No       | 10      | Number of items per page              |

**Response:**

```json
{
  "success": true,
  "message": "ZIP codes retrieved successfully",
  "data": [
    {
      "id": "zip_id_1",
      "zipCode": "3535",
      "areaName": "Ahafo Region",
      "riders": 23,
      "createdAt": "2026-01-15T10:30:00Z"
    },
    {
      "id": "zip_id_2",
      "zipCode": "4242",
      "areaName": "Bono East Region",
      "riders": 18,
      "createdAt": "2026-01-14T09:20:00Z"
    }
  ],
  "meta": {
    "total": 24,
    "page": 1,
    "limit": 10,
    "totalPage": 3
  }
}
```

**Usage Example:**

```tsx
// UptownZoneTable Component
const [search, setSearch] = useState('');
const [page, setPage] = useState(1);

const { data: zipCodesData } = useQuery(
  `/api/v1/operations/zones/${zoneId}/zip-codes?search=${search}&page=${page}&limit=10`,
);

const columns = [
  {
    title: 'Serial',
    dataIndex: 'serial',
    render: (text, record, index) => <p>#{(page - 1) * 10 + index + 1}</p>,
  },
  {
    title: 'ZIP Code',
    dataIndex: 'zipCode',
  },
  {
    title: 'Area Name',
    dataIndex: 'areaName',
  },
  {
    title: 'Riders',
    dataIndex: 'riders',
  },
  {
    title: 'Action',
    render: record => (
      <Trash2
        size={20}
        onClick={() => handleDelete(record.id)}
        className="cursor-pointer"
      />
    ),
  },
];

return (
  <div>
    <Input.Search
      placeholder="Search here..."
      value={search}
      onChange={e => setSearch(e.target.value)}
    />
    <DataTable columns={columns} data={zipCodesData?.data} />
  </div>
);
```

---

## 11. Add ZIP Code to Zone

Add a new ZIP code to a specific zone.

**Endpoint:** `POST /zones/:zoneId/zip-codes`

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| zoneId    | string | Yes      | Zone ID     |

**Request Body:**

```json
{
  "zipCode": "3535",
  "areaName": "Ahafo Region"
}
```

**Response:**

```json
{
  "success": true,
  "message": "ZIP code created successfully",
  "data": {
    "id": "zip_id_123",
    "zoneId": "zone_id_1",
    "zipCode": "3535",
    "areaName": "Ahafo Region",
    "isDeleted": false,
    "createdAt": "2026-03-08T14:30:00Z",
    "updatedAt": "2026-03-08T14:30:00Z"
  }
}
```

**Usage Example:**

```tsx
// AddZIPCode Modal Component
const handleSubmit = async values => {
  try {
    const response = await fetch(
      `/api/v1/operations/zones/${zoneId}/zip-codes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          zipCode: values.zipCode,
          areaName: values.areaName,
        }),
      },
    );

    if (response.ok) {
      message.success('ZIP code added successfully');
      setOpen(false);
      refetch(); // Refresh the table
    }
  } catch (error) {
    message.error('Failed to add ZIP code');
  }
};
```

---

## 12. Delete ZIP Code

Delete a ZIP code from a zone (soft delete).

**Endpoint:** `DELETE /zip-codes/:zipCodeId`

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| zipCodeId | string | Yes      | ZIP code ID |

**Response:**

```json
{
  "success": true,
  "message": "ZIP code deleted successfully",
  "data": null
}
```

**Usage Example:**

```tsx
// Table Action Column
const handleDelete = async zipCodeId => {
  try {
    const confirmed = await confirm(
      'Are you sure you want to delete this ZIP code?',
    );

    if (confirmed) {
      const response = await fetch(
        `/api/v1/operations/zip-codes/${zipCodeId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        message.success('ZIP code deleted successfully');
        refetch(); // Refresh the table
      }
    }
  } catch (error) {
    message.error('Failed to delete ZIP code');
  }
};
```

---

## Notes

- All revenue and earnings values are in the system's base currency (GHS - Ghana Cedis)
- Dates are in ISO 8601 format
- Ratings are on a scale of 1-5 (calculated as average)
- Growth is calculated as percentage change from previous period
- Only completed bookings are included in calculations (cancelled bookings are excluded)
- Riders must have `riderVerified: true` to appear in rankings
- ZIP codes are unique per zone (same ZIP code can exist in different zones)
- Deleting a ZIP code performs a soft delete (sets `isDeleted: true`)
