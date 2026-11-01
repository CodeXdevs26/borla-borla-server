# Zone Management API Documentation

## Overview

The Zone Management system allows administrators to define geographic service areas (zones) where riders operate. Each zone contains:

- A geographic boundary (polygon)
- Multiple collection stations
- Assigned riders who operate within that zone

## Concepts

### Zone Boundary

Zones use **GeoJSON Polygon** format to define geographic boundaries. This allows precise geographic containment checks to ensure riders only operate within their assigned zones.

### Zone Assignment

When a rider is approved by admin, they must be assigned to a specific zone. Riders can only:

- Operate within their assigned zone boundary
- Deliver waste to stations within their zone

---

## API Endpoints

### 1. Create Zone

**Endpoint:** `POST /zones`

**Auth Required:** Admin, Super Admin

**Request Body:**

```json
{
  "name": "Madina Zone",
  "boundary": {
    "type": "Polygon",
    "coordinates": [
      [
        [-0.167, 5.6837],
        [-0.147, 5.6837],
        [-0.147, 5.6637],
        [-0.167, 5.6637],
        [-0.167, 5.6837]
      ]
    ]
  }
}
```

**Response:** `201 Created`

```json
{
  "statusCode": 201,
  "success": true,
  "message": "Zone created successfully",
  "data": {
    "id": "65f1234567890abcdef12345",
    "name": "Madina Zone",
    "boundary": {
      "type": "Polygon",
      "coordinates": [
        [
          [-0.167, 5.6837],
          [-0.147, 5.6837],
          [-0.147, 5.6637],
          [-0.167, 5.6637],
          [-0.167, 5.6837]
        ]
      ]
    },
    "isDeleted": false,
    "createdAt": "2026-03-07T10:30:00.000Z",
    "updatedAt": "2026-03-07T10:30:00.000Z"
  }
}
```

**Boundary Format Rules:**

- Must be valid GeoJSON Polygon
- Coordinates format: `[longitude, latitude]` (NOT lat, lng)
- First and last coordinate must be identical (closes the polygon)
- Minimum 4 points (3 unique corners + 1 to close)
- Outer array represents the boundary, inner arrays can represent holes (optional)

**Example with Drawing Tool:**

```javascript
// Frontend: When admin draws polygon on map
const drawnPolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [lng1, lat1],
      [lng2, lat2],
      [lng3, lat3],
      [lng4, lat4],
      [lng1, lat1], // Close polygon
    ],
  ],
};

// Send to API
fetch('/zones', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: zoneName,
    boundary: drawnPolygon,
  }),
});
```

---

### 2. Get All Zones

**Endpoint:** `GET /zones`

**Auth Required:** Admin, Super Admin, Rider

**Query Parameters:**

- `searchTerm` (optional) - Search by zone name
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page

**Request Example:**

```
GET /zones?searchTerm=madina&page=1&limit=10
```

**Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Zones retrieved successfully",
  "data": [
    {
      "id": "65f1234567890abcdef12345",
      "name": "Madina Zone",
      "boundary": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "totalRiders": 24,
      "activeRiders": 18,
      "offlineRiders": 6,
      "totalStations": 3,
      "stations": [
        {
          "id": "65f1234567890abcdef12346",
          "name": "East Hub",
          "address": "12 Uptown Blvd, Block A"
        },
        {
          "id": "65f1234567890abcdef12347",
          "name": "West Hub",
          "address": "45 North Ave, Block B"
        },
        {
          "id": "65f1234567890abcdef12348",
          "name": "Uptown Express C",
          "address": "78 Heights Rd, Block C"
        }
      ],
      "createdAt": "2026-03-07T10:30:00.000Z",
      "updatedAt": "2026-03-07T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 15
  }
}
```

**Use Case:** Display all zones in admin dashboard with rider counts and station info.

---

### 3. Get Zone by ID

**Endpoint:** `GET /zones/:id`

**Auth Required:** Admin, Super Admin, Rider

**Request Example:**

```
GET /zones/65f1234567890abcdef12345
```

**Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Zone retrieved successfully",
  "data": {
    "id": "65f1234567890abcdef12345",
    "name": "Madina Zone",
    "boundary": {
      "type": "Polygon",
      "coordinates": [[...]]
    },
    "totalRiders": 24,
    "activeRiders": 18,
    "offlineRiders": 6,
    "totalStations": 3,
    "riders": [
      {
        "id": "65f1234567890abcdef12350",
        "name": "Jamal Khan",
        "email": "jamal@example.com",
        "phoneNumber": "+233301234567",
        "onlineStatus": "online",
        "location": {
          "type": "Point",
          "coordinates": [-0.1570, 5.6737]
        }
      }
    ],
    "stations": [
      {
        "id": "65f1234567890abcdef12346",
        "name": "East Hub",
        "address": "12 Uptown Blvd, Block A",
        "location": {
          "type": "Point",
          "coordinates": [-0.1570, 5.6737]
        }
      }
    ],
    "createdAt": "2026-03-07T10:30:00.000Z",
    "updatedAt": "2026-03-07T10:30:00.000Z"
  }
}
```

**Use Case:**

- View detailed zone information
- Display riders and stations on a map
- Monitor zone activity in real-time

---

### 4. Update Zone

**Endpoint:** `PATCH /zones/:id`

**Auth Required:** Admin, Super Admin

**Request Body:** (all fields optional)

```json
{
  "name": "Updated Madina Zone",
  "boundary": {
    "type": "Polygon",
    "coordinates": [[...]]
  }
}
```

**Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Zone updated successfully",
  "data": {
    "id": "65f1234567890abcdef12345",
    "name": "Updated Madina Zone",
    "boundary": {
      "type": "Polygon",
      "coordinates": [[...]]
    },
    "isDeleted": false,
    "createdAt": "2026-03-07T10:30:00.000Z",
    "updatedAt": "2026-03-07T11:45:00.000Z"
  }
}
```

**Use Case:**

- Rename zones
- Adjust zone boundaries as service areas change

---

### 5. Delete Zone

**Endpoint:** `DELETE /zones/:id`

**Auth Required:** Admin, Super Admin

**Request Example:**

```
DELETE /zones/65f1234567890abcdef12345
```

**Success Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Zone deleted successfully",
  "data": null
}
```

**Error Response (if riders assigned):** `400 Bad Request`

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Cannot delete zone with assigned riders. Please reassign riders first.",
  "errorMessages": [
    {
      "path": "",
      "message": "Cannot delete zone with assigned riders. Please reassign riders first."
    }
  ]
}
```

**Important Notes:**

- Soft delete (sets `isDeleted: true`)
- All stations in the zone are also soft deleted
- Cannot delete if riders are assigned to the zone
- Admin must reassign riders to other zones first

---

## Error Responses

### Validation Error

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "body.boundary",
      "message": "Invalid boundary format"
    }
  ]
}
```

### Not Found

```json
{
  "statusCode": 404,
  "success": false,
  "message": "Zone not found",
  "errorMessages": [
    {
      "path": "",
      "message": "Zone not found"
    }
  ]
}
```

### Unauthorized

```json
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized access",
  "errorMessages": [
    {
      "path": "",
      "message": "You are not authorized"
    }
  ]
}
```

---

## Integration Examples

### Frontend Map Integration

#### Using Google Maps

```javascript
// Display zone boundary on map
function displayZone(zone) {
  const polygon = new google.maps.Polygon({
    paths: zone.boundary.coordinates[0].map(coord => ({
      lng: coord[0],
      lat: coord[1],
    })),
    strokeColor: '#FFC107',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#FFC107',
    fillOpacity: 0.2,
  });

  polygon.setMap(map);
}

// Check if location is within zone
function isPointInZone(lat, lng, zoneBoundary) {
  const point = new google.maps.LatLng(lat, lng);
  const polygon = new google.maps.Polygon({
    paths: zoneBoundary.coordinates[0].map(coord => ({
      lng: coord[0],
      lat: coord[1],
    })),
  });

  return google.maps.geometry.poly.containsLocation(point, polygon);
}
```

#### Using Mapbox/Leaflet

```javascript
// Display zone boundary
L.geoJSON(zone.boundary, {
  style: {
    color: '#FFC107',
    weight: 2,
    fillOpacity: 0.2,
  },
}).addTo(map);

// Check if point is in zone (using turf.js)
import * as turf from '@turf/turf';

function isPointInZone(lat, lng, zoneBoundary) {
  const point = turf.point([lng, lat]);
  const polygon = turf.polygon(zoneBoundary.coordinates);
  return turf.booleanPointInPolygon(point, polygon);
}
```

---

## Workflow: Creating and Managing Zones

### Step 1: Admin Creates Zone

1. Admin draws zone boundary on map using drawing tools
2. Admin enters zone name
3. Frontend sends POST request with name and boundary
4. System creates zone and returns zone ID

### Step 2: Admin Adds Stations

1. Admin creates stations within the zone (see STATIONS.md)
2. Each station is linked to the zone via `zoneId`

### Step 3: Admin Approves Rider

1. When approving a rider, admin selects which zone to assign
2. Rider verification endpoint requires `zoneId` in request body
3. Rider is assigned to zone and can only see stations in that zone

### Step 4: Rider Operations

1. Rider can view their assigned zone details
2. Rider can fetch stations within their zone using `/stations/my-stations`
3. Rider can only deliver waste to stations in their zone

---

## Business Rules

1. **Zone Assignment**
   - Every rider MUST be assigned to exactly one zone
   - Riders cannot be approved without zone assignment
   - Zone assignment happens during rider verification

2. **Station Association**
   - Each station belongs to exactly one zone
   - Riders can only deliver to stations in their assigned zone

3. **Zone Deletion**
   - Zones with assigned riders cannot be deleted
   - Admin must reassign riders before deletion
   - Stations are automatically soft-deleted with the zone

4. **Geographic Validation**
   - Frontend should validate that drawn boundaries are reasonable
   - Backend validates GeoJSON structure
   - Consider adding area limits to prevent extremely large zones

---

## Database Schema

```prisma
model Zone {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  boundary  Json     // GeoJSON Polygon
  isDeleted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stations Station[]
  riders   User[]

  @@map("zones")
}

model User {
  // ... other fields
  zoneId String? @db.ObjectId
  zone   Zone?   @relation(fields: [zoneId], references: [id])
}
```

---

## Performance Considerations

1. **Indexing**
   - Consider adding geospatial index on boundary field for faster queries
   - Index on `isDeleted` field for soft-delete queries

2. **Caching**
   - Cache zone boundaries as they rarely change
   - Cache zone-rider assignments for quick lookups

3. **Query Optimization**
   - Use `select` to limit returned fields when listing zones
   - Paginate zone lists for better performance

---

## Testing Examples

### Create Zone Test

```javascript
test('Should create zone successfully', async () => {
  const response = await request(app)
    .post('/zones')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Test Zone',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.2, 5.6],
            [-0.1, 5.6],
            [-0.1, 5.5],
            [-0.2, 5.5],
            [-0.2, 5.6],
          ],
        ],
      },
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.data.name).toBe('Test Zone');
});
```

### Get Zones Test

```javascript
test('Should get all zones with stats', async () => {
  const response = await request(app)
    .get('/zones?page=1&limit=10')
    .set('Authorization', `Bearer ${adminToken}`);

  expect(response.status).toBe(200);
  expect(response.body.data).toBeInstanceOf(Array);
  expect(response.body.data[0]).toHaveProperty('totalRiders');
  expect(response.body.meta).toHaveProperty('total');
});
```

---

## Common Issues and Solutions

### Issue: Invalid Boundary Format

**Problem:** GeoJSON polygon not closing properly
**Solution:** Ensure first and last coordinates are identical

### Issue: Cannot Delete Zone

**Problem:** Zone has assigned riders
**Solution:** Reassign riders to other zones first using rider update endpoint

### Issue: Riders Not Seeing Zone

**Problem:** Rider role cannot access zone details
**Solution:** Check auth middleware - riders should have read access to zones

---

## Related Documentation

- [Stations API](./STATIONS.md)
- [Rider Verification API](./RIDER_VERIFICATION.md)
- [GeoJSON Specification](https://geojson.org/)
