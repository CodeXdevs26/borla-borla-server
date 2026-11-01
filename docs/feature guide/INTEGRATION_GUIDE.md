# Zone & Station Integration Guide

## Overview

This guide explains how Zones and Stations work together in the Borla waste collection system, focusing on the complete workflow from zone creation to rider operations.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Create Zones (with boundaries)                       │
│  2. Create Stations (within zones)                       │
│  3. Approve Riders (assign to zones)                     │
│                                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    ZONE MANAGEMENT                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Zone: "Madina Zone"                                     │
│  ├── Boundary: Polygon covering Madina area             │
│  ├── Stations (3):                                       │
│  │   ├── Madina Central Hub                             │
│  │   ├── Madina North Station                           │
│  │   └── Madina Express Point                           │
│  └── Riders (24):                                        │
│      ├── Jamal Khan (Online)                            │
│      ├── Samuel Ofori (Online)                          │
│      └── ... (22 more)                                  │
│                                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                     RIDER APP                            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Rider Dashboard:                                        │
│  ├── My Zone: Madina Zone                               │
│  ├── Available Stations (3):                            │
│  │   └── Can only deliver to these 3 stations          │
│  └── Bookings:                                          │
│      └── Customer location must be in Madina Zone       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Complete Workflow

### Phase 1: Zone Setup (Admin)

#### Step 1: Create Zone

```http
POST /zones
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Madina Zone",
  "boundary": {
    "type": "Polygon",
    "coordinates": [
      [
        [-0.1670, 5.6837],
        [-0.1470, 5.6837],
        [-0.1470, 5.6637],
        [-0.1670, 5.6637],
        [-0.1670, 5.6837]
      ]
    ]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "65f1234567890abcdef12345",
    "name": "Madina Zone",
    "boundary": {...}
  }
}
```

**Save the `id`** - you'll need it for creating stations and assigning riders.

---

#### Step 2: Add Stations to Zone

```http
POST /stations
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "zoneId": "65f1234567890abcdef12345",
  "name": "Madina Central Hub",
  "address": "12 Uptown Blvd, Block A, Madina",
  "location": {
    "type": "Point",
    "coordinates": [-0.1570, 5.6737]
  }
}
```

Repeat for each station in the zone. Typically 2-5 stations per zone.

**Example: Create 3 Stations**

```javascript
const stations = [
  {
    name: 'Madina Central Hub',
    address: '12 Uptown Blvd, Block A',
    location: { type: 'Point', coordinates: [-0.157, 5.6737] },
  },
  {
    name: 'Madina North Station',
    address: '45 North Ave, Block B',
    location: { type: 'Point', coordinates: [-0.147, 5.6837] },
  },
  {
    name: 'Madina Express Point',
    address: '78 Heights Rd, Block C',
    location: { type: 'Point', coordinates: [-0.167, 5.6637] },
  },
];

for (const station of stations) {
  await fetch('/stations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zoneId: '65f1234567890abcdef12345',
      ...station,
    }),
  });
}
```

---

### Phase 2: Rider Verification (Admin)

When a rider applies and uploads documents, admin reviews and approves:

#### Step 3: Approve Rider with Zone Assignment

```http
PATCH /rider-verification/:riderId/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "zoneId": "65f1234567890abcdef12345"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "65f9876543210abcdef98765",
    "name": "Jamal Khan",
    "email": "jamal@example.com",
    "riderVerified": true,
    "zoneId": "65f1234567890abcdef12345",
    "zone": {
      "id": "65f1234567890abcdef12345",
      "name": "Madina Zone"
    }
  }
}
```

**What Happens:**

1. ✅ Rider status → `riderVerified: true`
2. ✅ Rider linked to zone → `zoneId` set
3. ✅ Documents marked as verified
4. ✅ Approval email sent to rider
5. ✅ Rider can now login and see their zone's stations

---

### Phase 3: Rider Operations

#### Step 4: Rider Logs In

```http
POST /auth/login
Content-Type: application/json

{
  "email": "jamal@example.com",
  "password": "password123"
}
```

**Response includes:**

```json
{
  "data": {
    "user": {
      "id": "65f9876543210abcdef98765",
      "name": "Jamal Khan",
      "role": "rider",
      "riderVerified": true,
      "zoneId": "65f1234567890abcdef12345"
    },
    "token": "eyJhbGc..."
  }
}
```

---

#### Step 5: Rider Fetches Available Stations

```http
GET /stations/my-stations
Authorization: Bearer <rider-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Your assigned stations retrieved successfully",
  "data": [
    {
      "id": "65f1234567890abcdef12346",
      "name": "Madina Central Hub",
      "address": "12 Uptown Blvd, Block A, Madina",
      "location": {
        "type": "Point",
        "coordinates": [-0.157, 5.6737]
      }
    },
    {
      "id": "65f1234567890abcdef12347",
      "name": "Madina North Station",
      "address": "45 North Ave, Block B, Madina",
      "location": {
        "type": "Point",
        "coordinates": [-0.147, 5.6837]
      }
    },
    {
      "id": "65f1234567890abcdef12348",
      "name": "Madina Express Point",
      "address": "78 Heights Rd, Block C, Madina",
      "location": {
        "type": "Point",
        "coordinates": [-0.167, 5.6637]
      }
    }
  ]
}
```

**Rider App Displays:**

- Map with 3 station markers
- List of stations sorted by distance from current location
- Option to navigate to each station

---

#### Step 6: Rider Accepts Booking

When a customer books waste collection:

```http
GET /bookings/:bookingId
Authorization: Bearer <rider-token>
```

**Booking Details Include:**

- Pickup location (customer's location)
- Waste details
- Estimated price

**Rider Workflow:**

1. Accept booking
2. Navigate to customer
3. Collect waste
4. Choose destination station
5. Navigate to station
6. Mark as delivered

---

#### Step 7: Rider Selects Destination Station

```javascript
// Rider app calculates nearest station
const riderCurrentLocation = { lat: 5.67, lng: -0.155 };
const stations = await fetch('/stations/my-stations');

function findNearestStation(currentLocation, stations) {
  return stations
    .map(station => ({
      ...station,
      distance: calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        station.location.coordinates[1],
        station.location.coordinates[0],
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}

const sortedStations = findNearestStation(riderCurrentLocation, stations);
console.log(
  `Nearest: ${sortedStations[0].name} - ${sortedStations[0].distance}km`,
);
```

---

## Frontend Implementation Examples

### Admin Dashboard: Zone Management

```javascript
// Admin creates zone with map drawing
import { DrawingManager } from '@react-google-maps/api';

function ZoneCreator() {
  const [zoneName, setZoneName] = useState('');
  const [polygon, setPolygon] = useState(null);

  const handlePolygonComplete = polygon => {
    const path = polygon.getPath();
    const coordinates = [];

    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push([point.lng(), point.lat()]);
    }

    // Close the polygon
    coordinates.push(coordinates[0]);

    setPolygon({
      type: 'Polygon',
      coordinates: [coordinates],
    });
  };

  const handleSubmit = async () => {
    const response = await fetch('/zones', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: zoneName,
        boundary: polygon,
      }),
    });

    const result = await response.json();
    console.log('Zone created:', result.data.id);
  };

  return (
    <div>
      <input
        value={zoneName}
        onChange={e => setZoneName(e.target.value)}
        placeholder="Zone name"
      />

      <GoogleMap>
        <DrawingManager
          onPolygonComplete={handlePolygonComplete}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              drawingModes: ['polygon'],
            },
          }}
        />
      </GoogleMap>

      <button onClick={handleSubmit}>Create Zone</button>
    </div>
  );
}
```

---

### Admin Dashboard: Station Management

```javascript
function StationCreator({ zoneId }) {
  const [stationData, setStationData] = useState({
    name: '',
    address: '',
    location: null,
  });

  const handleMapClick = event => {
    setStationData(prev => ({
      ...prev,
      location: {
        type: 'Point',
        coordinates: [event.latLng.lng(), event.latLng.lat()],
      },
    }));
  };

  const handleSubmit = async () => {
    const response = await fetch('/stations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zoneId,
        ...stationData,
      }),
    });

    const result = await response.json();
    console.log('Station created:', result.data);
  };

  return (
    <div>
      <input
        placeholder="Station name"
        value={stationData.name}
        onChange={e => setStationData({ ...stationData, name: e.target.value })}
      />

      <input
        placeholder="Address"
        value={stationData.address}
        onChange={e =>
          setStationData({ ...stationData, address: e.target.value })
        }
      />

      <GoogleMap onClick={handleMapClick}>
        {stationData.location && (
          <Marker
            position={{
              lat: stationData.location.coordinates[1],
              lng: stationData.location.coordinates[0],
            }}
          />
        )}
      </GoogleMap>

      <button onClick={handleSubmit}>Add Station</button>
    </div>
  );
}
```

---

### Admin Dashboard: Review Rider Documents

```javascript
function RiderReview({ rider }) {
  const [selectedZone, setSelectedZone] = useState('');
  const [zones, setZones] = useState([]);

  useEffect(() => {
    // Fetch all zones
    fetch('/zones')
      .then(res => res.json())
      .then(data => setZones(data.data));
  }, []);

  const handleApprove = async () => {
    const response = await fetch(`/rider-verification/${rider.id}/approve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zoneId: selectedZone,
      }),
    });

    const result = await response.json();
    if (result.success) {
      alert(`Rider approved and assigned to ${result.data.zone.name}`);
    }
  };

  return (
    <div>
      <h2>Review: {rider.name}</h2>

      {/* Display rider documents */}
      <div>
        {rider.documents.map(doc => (
          <img key={doc.id} src={doc.document} alt="Document" />
        ))}
      </div>

      {/* Zone selection */}
      <select
        value={selectedZone}
        onChange={e => setSelectedZone(e.target.value)}
      >
        <option value="">Select Zone...</option>
        {zones.map(zone => (
          <option key={zone.id} value={zone.id}>
            {zone.name} ({zone.totalStations} stations)
          </option>
        ))}
      </select>

      <button onClick={handleApprove} disabled={!selectedZone}>
        Approve Rider
      </button>
    </div>
  );
}
```

---

### Rider App: View Stations

```javascript
function RiderStations() {
  const [stations, setStations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    // Get rider's location
    navigator.geolocation.getCurrentPosition(position => {
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });

    // Fetch assigned stations
    fetch('/stations/my-stations', {
      headers: {
        Authorization: `Bearer ${riderToken}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        // Calculate distances
        const stationsWithDistance = data.data.map(station => ({
          ...station,
          distance: calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            station.location.coordinates[1],
            station.location.coordinates[0],
          ),
        }));

        // Sort by distance
        stationsWithDistance.sort((a, b) => a.distance - b.distance);
        setStations(stationsWithDistance);
      });
  }, []);

  return (
    <div>
      <h2>Drop-off Stations</h2>

      <GoogleMap center={currentLocation}>
        {/* Rider's current location */}
        {currentLocation && (
          <Marker position={currentLocation} icon="/rider-icon.png" />
        )}

        {/* Station markers */}
        {stations.map(station => (
          <Marker
            key={station.id}
            position={{
              lat: station.location.coordinates[1],
              lng: station.location.coordinates[0],
            }}
            icon="/station-icon.png"
            onClick={() => showStationDetails(station)}
          />
        ))}
      </GoogleMap>

      <div>
        {stations.map(station => (
          <div key={station.id}>
            <h3>{station.name}</h3>
            <p>{station.address}</p>
            <p>{station.distance.toFixed(2)} km away</p>
            <button onClick={() => navigateToStation(station)}>Navigate</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function navigateToStation(station) {
  const lat = station.location.coordinates[1];
  const lng = station.location.coordinates[0];

  // Open in Google Maps
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  );
}
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     SYSTEM DATA FLOW                          │
└──────────────────────────────────────────────────────────────┘

1. ZONE CREATION
   Admin → POST /zones → DB: Zone created
                        ↓
                   Returns zone ID

2. STATION CREATION
   Admin → POST /stations (with zoneId) → DB: Station created
                                         ↓
                                    Linked to Zone

3. RIDER APPROVAL
   Admin → PATCH /rider-verification/:id/approve (with zoneId)
        ↓
   DB: User.zoneId = zoneId
   DB: User.riderVerified = true
        ↓
   Email: Approval notification sent

4. RIDER LOGIN
   Rider → POST /auth/login → Token (includes zoneId)
                            ↓
                      Stored in app

5. FETCH STATIONS
   Rider → GET /stations/my-stations
        ↓
   Backend: Decode token → Get rider's zoneId
        ↓
   DB: Find all stations where zoneId = rider's zoneId
        ↓
   Return: List of stations

6. BOOKING COMPLETION
   Rider → Select destination station from list
        ↓
   Navigate to station
        ↓
   Mark booking as delivered
```

---

## Security & Authorization

### Role-Based Access Control

| Endpoint                  | Admin | Rider | User |
| ------------------------- | ----- | ----- | ---- |
| POST /zones               | ✅    | ❌    | ❌   |
| GET /zones                | ✅    | ✅    | ❌   |
| PATCH /zones/:id          | ✅    | ❌    | ❌   |
| DELETE /zones/:id         | ✅    | ❌    | ❌   |
| POST /stations            | ✅    | ❌    | ❌   |
| GET /stations             | ✅    | ✅    | ❌   |
| GET /stations/my-stations | ❌    | ✅    | ❌   |
| PATCH /stations/:id       | ✅    | ❌    | ❌   |
| DELETE /stations/:id      | ✅    | ❌    | ❌   |

### Zone Isolation

- Riders can only see stations in their assigned zone
- Riders cannot see other zones' data
- Admins can see all zones and stations

---

## Best Practices

### For Admins

1. **Zone Planning**
   - Create zones based on geographic service areas
   - Keep zones reasonably sized (not too large)
   - Ensure zones don't overlap

2. **Station Placement**
   - 2-5 stations per zone recommended
   - Place stations strategically (central locations, easy access)
   - Ensure stations are within zone boundaries

3. **Rider Assignment**
   - Assign riders to zones based on their location
   - Balance rider count across zones
   - Monitor rider activity per zone

### For Riders

1. **Station Selection**
   - Choose nearest station when possible
   - Consider traffic and road conditions
   - Know operating hours of each station

2. **Navigation**
   - Use GPS navigation for accuracy
   - Update location when arriving at station
   - Confirm delivery at station

---

## Troubleshooting

### Issue: Rider sees no stations

**Cause:** Rider not assigned to zone, or zone has no stations
**Solution:**

1. Check rider's `zoneId` field
2. Verify zone has active stations
3. Ensure stations are not soft-deleted

### Issue: Station outside zone boundary

**Cause:** Station coordinates don't fall within zone polygon
**Solution:**

1. Use point-in-polygon check when creating stations
2. Visually verify on map before creation
3. Update station location if needed

### Issue: Cannot delete zone

**Cause:** Zone has assigned riders
**Solution:**

1. List all riders in zone
2. Reassign riders to other zones
3. Then delete zone

---

## Related Documentation

- [Zones API Reference](./ZONES.md)
- [Stations API Reference](./STATIONS.md)
- [Rider Verification](./RIDER_VERIFICATION.md)
