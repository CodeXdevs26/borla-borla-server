# Station Management API Documentation

## Overview

Stations are waste collection drop-off points where riders deliver collected waste. Each station:

- Belongs to exactly one zone
- Has a specific geographic location (point)
- Has a physical address
- Is accessible only to riders assigned to that zone

## Concepts

### Station Location

Stations use **GeoJSON Point** format to define exact geographic coordinates. This allows:

- Precise location rendering on maps
- Distance calculations
- Navigation/directions for riders

### Zone Relationship

Stations are tightly coupled with zones:

- Each station belongs to one zone
- Riders can only see/access stations in their assigned zone
- Deleting a zone soft-deletes all its stations

---

## API Endpoints

### 1. Create Station

**Endpoint:** `POST /stations`

**Auth Required:** Admin, Super Admin

**Request Body:**

```json
{
  "zoneId": "65f1234567890abcdef12345",
  "name": "Madina Central Hub",
  "address": "12 Uptown Blvd, Block A, Madina, Accra",
  "location": {
    "type": "Point",
    "coordinates": [-0.157, 5.6737]
  }
}
```

**Response:** `201 Created`

```json
{
  "statusCode": 201,
  "success": true,
  "message": "Station created successfully",
  "data": {
    "id": "65f1234567890abcdef12346",
    "zoneId": "65f1234567890abcdef12345",
    "name": "Madina Central Hub",
    "address": "12 Uptown Blvd, Block A, Madina, Accra",
    "location": {
      "type": "Point",
      "coordinates": [-0.157, 5.6737]
    },
    "isDeleted": false,
    "createdAt": "2026-03-07T10:30:00.000Z",
    "updatedAt": "2026-03-07T10:30:00.000Z",
    "zone": {
      "id": "65f1234567890abcdef12345",
      "name": "Madina Zone"
    }
  }
}
```

**Location Format Rules:**

- Must be valid GeoJSON Point
- Coordinates format: `[longitude, latitude]` (NOT lat, lng)
- Longitude: -180 to 180
- Latitude: -90 to 90

**Validation:**

- `zoneId` must reference an existing, active zone
- Station name is required
- Address is required
- Location coordinates must be valid

---

### 2. Get All Stations

**Endpoint:** `GET /stations`

**Auth Required:** Admin, Super Admin, Rider

**Query Parameters:**

- `zoneId` (optional) - Filter stations by zone
- `searchTerm` (optional) - Search by name or address
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page

**Request Examples:**

```
GET /stations
GET /stations?zoneId=65f1234567890abcdef12345
GET /stations?searchTerm=central&page=1&limit=10
GET /stations?zoneId=65f1234567890abcdef12345&searchTerm=hub
```

**Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Stations retrieved successfully",
  "data": [
    {
      "id": "65f1234567890abcdef12346",
      "zoneId": "65f1234567890abcdef12345",
      "name": "Madina Central Hub",
      "address": "12 Uptown Blvd, Block A, Madina, Accra",
      "location": {
        "type": "Point",
        "coordinates": [-0.157, 5.6737]
      },
      "isDeleted": false,
      "createdAt": "2026-03-07T10:30:00.000Z",
      "updatedAt": "2026-03-07T10:30:00.000Z",
      "zone": {
        "id": "65f1234567890abcdef12345",
        "name": "Madina Zone"
      }
    },
    {
      "id": "65f1234567890abcdef12347",
      "zoneId": "65f1234567890abcdef12345",
      "name": "Madina North Station",
      "address": "45 North Ave, Block B, Madina, Accra",
      "location": {
        "type": "Point",
        "coordinates": [-0.147, 5.6837]
      },
      "isDeleted": false,
      "createdAt": "2026-03-07T11:00:00.000Z",
      "updatedAt": "2026-03-07T11:00:00.000Z",
      "zone": {
        "id": "65f1234567890abcdef12345",
        "name": "Madina Zone"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

**Use Cases:**

- Admin views all stations across zones
- Filter stations by zone for management
- Search for specific station by name

---

### 3. Get Rider's Assigned Stations

**Endpoint:** `GET /stations/my-stations`

**Auth Required:** Rider only

**Request Example:**

```
GET /stations/my-stations
Authorization: Bearer <rider-token>
```

**Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Your assigned stations retrieved successfully",
  "data": [
    {
      "id": "65f1234567890abcdef12346",
      "name": "Madina Central Hub",
      "address": "12 Uptown Blvd, Block A, Madina, Accra",
      "location": {
        "type": "Point",
        "coordinates": [-0.157, 5.6737]
      }
    },
    {
      "id": "65f1234567890abcdef12347",
      "name": "Madina North Station",
      "address": "45 North Ave, Block B, Madina, Accra",
      "location": {
        "type": "Point",
        "coordinates": [-0.147, 5.6837]
      }
    },
    {
      "id": "65f1234567890abcdef12348",
      "name": "Madina Express Point",
      "address": "78 Heights Rd, Block C, Madina, Accra",
      "location": {
        "type": "Point",
        "coordinates": [-0.167, 5.6637]
      }
    }
  ]
}
```

**How It Works:**

1. Rider's token is decoded to get rider user ID
2. System fetches rider's assigned `zoneId`
3. Returns all active stations in that zone
4. Returns 404 if rider has no zone assigned

**Error Response (No Zone):** `404 Not Found`

```json
{
  "statusCode": 404,
  "success": false,
  "message": "Rider not found or no zone assigned",
  "errorMessages": [
    {
      "path": "",
      "message": "Rider not found or no zone assigned"
    }
  ]
}
```

**Use Cases:**

- Rider app displays available drop-off locations
- Rider selects station for navigation
- Rider completes booking by confirming delivery to station

---

### 4. Get Station by ID

**Endpoint:** `GET /stations/:id`

**Auth Required:** Admin, Super Admin, Rider

**Request Example:**

```
GET /stations/65f1234567890abcdef12346
```

**Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Station retrieved successfully",
  "data": {
    "id": "65f1234567890abcdef12346",
    "zoneId": "65f1234567890abcdef12345",
    "name": "Madina Central Hub",
    "address": "12 Uptown Blvd, Block A, Madina, Accra",
    "location": {
      "type": "Point",
      "coordinates": [-0.1570, 5.6737]
    },
    "isDeleted": false,
    "createdAt": "2026-03-07T10:30:00.000Z",
    "updatedAt": "2026-03-07T10:30:00.000Z",
    "zone": {
      "id": "65f1234567890abcdef12345",
      "name": "Madina Zone",
      "boundary": {
        "type": "Polygon",
        "coordinates": [[...]]
      }
    }
  }
}
```

**Use Cases:**

- View detailed station information
- Display station location on map with zone boundary
- Edit station details (admin)

---

### 5. Update Station

**Endpoint:** `PATCH /stations/:id`

**Auth Required:** Admin, Super Admin

**Request Body:** (all fields optional)

```json
{
  "name": "Madina Central Hub - Updated",
  "address": "12 Uptown Blvd, Block A (New Building), Madina, Accra",
  "location": {
    "type": "Point",
    "coordinates": [-0.1575, 5.674]
  }
}
```

**Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Station updated successfully",
  "data": {
    "id": "65f1234567890abcdef12346",
    "zoneId": "65f1234567890abcdef12345",
    "name": "Madina Central Hub - Updated",
    "address": "12 Uptown Blvd, Block A (New Building), Madina, Accra",
    "location": {
      "type": "Point",
      "coordinates": [-0.1575, 5.674]
    },
    "isDeleted": false,
    "createdAt": "2026-03-07T10:30:00.000Z",
    "updatedAt": "2026-03-07T14:20:00.000Z",
    "zone": {
      "id": "65f1234567890abcdef12345",
      "name": "Madina Zone"
    }
  }
}
```

**Use Cases:**

- Update station name when renamed
- Correct address information
- Update GPS coordinates if station relocated

**Note:** Cannot change `zoneId` through this endpoint. To move a station to different zone, delete and recreate.

---

### 6. Delete Station

**Endpoint:** `DELETE /stations/:id`

**Auth Required:** Admin, Super Admin

**Request Example:**

```
DELETE /stations/65f1234567890abcdef12346
```

**Response:** `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Station deleted successfully",
  "data": null
}
```

**Important Notes:**

- Soft delete (sets `isDeleted: true`)
- Station is hidden from all queries
- Historical bookings referencing this station remain intact
- Cannot be undone through API (requires direct DB update)

---

## Error Responses

### Zone Not Found

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

### Station Not Found

```json
{
  "statusCode": 404,
  "success": false,
  "message": "Station not found",
  "errorMessages": [
    {
      "path": "",
      "message": "Station not found"
    }
  ]
}
```

### Validation Error

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "body.location.coordinates",
      "message": "Invalid coordinates format"
    }
  ]
}
```

---

## Integration Examples

### Frontend Map Integration

#### Display Station Markers (Google Maps)

```javascript
function displayStations(stations) {
  stations.forEach(station => {
    const marker = new google.maps.Marker({
      position: {
        lat: station.location.coordinates[1],
        lng: station.location.coordinates[0],
      },
      map: map,
      title: station.name,
      icon: {
        url: '/station-icon.png',
        scaledSize: new google.maps.Size(40, 40),
      },
    });

    // Info window on click
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div>
          <h3>${station.name}</h3>
          <p>${station.address}</p>
          <button onclick="navigateToStation('${station.id}')">
            Navigate
          </button>
        </div>
      `,
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });
  });
}
```

#### Display Stations (Mapbox/Leaflet)

```javascript
function displayStations(stations) {
  stations.forEach(station => {
    L.marker(
      [
        station.location.coordinates[1], // lat
        station.location.coordinates[0], // lng
      ],
      {
        icon: L.icon({
          iconUrl: '/station-icon.png',
          iconSize: [40, 40],
        }),
      },
    )
      .bindPopup(
        `
      <strong>${station.name}</strong><br>
      ${station.address}
    `,
      )
      .addTo(map);
  });
}
```

#### Calculate Nearest Station

```javascript
function findNearestStation(currentLat, currentLng, stations) {
  let nearest = null;
  let minDistance = Infinity;

  stations.forEach(station => {
    const distance = calculateDistance(
      currentLat,
      currentLng,
      station.location.coordinates[1], // lat
      station.location.coordinates[0], // lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  });

  return { station: nearest, distance: minDistance };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
```

---

## Workflow: Station Management

### Admin Workflow

#### Step 1: Create Zone

1. Admin creates a zone (see ZONES.md)
2. System returns `zoneId`

#### Step 2: Add Stations to Zone

1. Admin opens "Add Station" form
2. Admin selects zone from dropdown
3. Admin enters station details:
   - Name
   - Address
4. Admin clicks on map to set location (or enters coordinates)
5. Frontend sends POST request to `/stations`
6. Station is created and linked to zone

#### Step 3: Manage Stations

1. Admin views all stations in zone
2. Can edit station details (name, address, location)
3. Can delete unused stations
4. Can view which riders have access (based on zone)

### Rider Workflow

#### Step 1: View Available Stations

1. Rider opens app after being approved and assigned to zone
2. App calls `GET /stations/my-stations`
3. Map displays all stations in rider's zone
4. Rider sees list of drop-off points

#### Step 2: Select Destination

1. When completing a booking, rider chooses destination station
2. App shows stations sorted by distance from current location
3. Rider selects nearest or preferred station

#### Step 3: Navigate to Station

1. Rider taps "Navigate" button
2. App opens Google Maps/Waze with station coordinates
3. Rider follows directions to station
4. On arrival, rider marks booking as delivered

---

## Business Rules

### Station Creation

1. Station must belong to a valid, active zone
2. Station name and address are required
3. Location must be valid GeoJSON Point
4. Multiple stations can have same name in different zones

### Station Access

1. Riders can only see stations in their assigned zone
2. Admins can see all stations across all zones
3. Stations in deleted zones are not visible

### Station Updates

1. Only admins can create, update, or delete stations
2. Station's `zoneId` cannot be changed (delete and recreate instead)
3. Updates are reflected immediately for all riders

### Station Deletion

1. Soft delete preserves historical data
2. Deleted stations don't appear in rider's station list
3. Cascade deletion when zone is deleted

---

## Database Schema

```prisma
model Station {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  zoneId    String   @db.ObjectId
  name      String
  address   String
  location  Json     // GeoJSON Point
  isDeleted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  zone Zone @relation(fields: [zoneId], references: [id], onDelete: Cascade)

  @@map("stations")
}
```

---

## Performance Considerations

### Indexing

```javascript
// Recommended MongoDB indexes
db.stations.createIndex({ zoneId: 1, isDeleted: 1 });
db.stations.createIndex({ location: '2dsphere' }); // For geospatial queries
db.stations.createIndex({ name: 'text', address: 'text' }); // For search
```

### Caching Strategy

```javascript
// Cache rider's stations (rarely changes)
const CACHE_KEY = `rider:${riderId}:stations`;
const CACHE_TTL = 3600; // 1 hour

async function getRiderStations(riderId) {
  // Check cache
  const cached = await redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  // Fetch from DB
  const stations = await stationService.getStationsByRiderZone(riderId);

  // Store in cache
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(stations));

  return stations;
}

// Invalidate cache on station updates
async function invalidateStationCache(zoneId) {
  // Get all riders in zone
  const riders = await prisma.user.findMany({
    where: { zoneId, role: 'rider' },
    select: { id: true },
  });

  // Clear cache for each rider
  for (const rider of riders) {
    await redis.del(`rider:${rider.id}:stations`);
  }
}
```

---

## Testing Examples

### Create Station Test

```javascript
test('Should create station successfully', async () => {
  const response = await request(app)
    .post('/stations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      zoneId: testZoneId,
      name: 'Test Hub',
      address: '123 Test Street',
      location: {
        type: 'Point',
        coordinates: [-0.15, 5.65],
      },
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.data.name).toBe('Test Hub');
  expect(response.body.data.zone).toBeDefined();
});
```

### Get Rider Stations Test

```javascript
test('Rider should only see stations in their zone', async () => {
  const response = await request(app)
    .get('/stations/my-stations')
    .set('Authorization', `Bearer ${riderToken}`);

  expect(response.status).toBe(200);
  expect(response.body.data).toBeInstanceOf(Array);

  // Verify all stations belong to rider's zone
  const riderZoneId = decodedToken.zoneId;
  response.body.data.forEach(station => {
    // Station should not expose zoneId in my-stations response
    // but all should belong to same zone
  });
});
```

---

## Common Issues and Solutions

### Issue: Rider Cannot See Stations

**Problem:** `/stations/my-stations` returns empty array
**Solutions:**

1. Verify rider has been assigned a zone
2. Check if zone has any stations
3. Ensure stations are not soft-deleted

### Issue: Invalid Location Coordinates

**Problem:** Station creation fails with validation error
**Solutions:**

1. Verify coordinates are in format `[longitude, latitude]`
2. Ensure longitude is between -180 and 180
3. Ensure latitude is between -90 and 90

### Issue: Station Not Appearing on Map

**Problem:** Station created but not visible
**Solutions:**

1. Check coordinates are correct (lng, lat order)
2. Verify station is not soft-deleted
3. Check map bounds include station location

---

## Related Documentation

- [Zones API](./ZONES.md)
- [Rider Verification API](./RIDER_VERIFICATION.md)
- [Bookings API](./BOOKINGS.md)
- [GeoJSON Specification](https://geojson.org/)
