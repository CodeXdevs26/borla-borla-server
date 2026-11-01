# API Documentation

Complete documentation for the Borla Waste Collection System API.

## Table of Contents

### Core Features

1. [**Zone Management**](./ZONES.md) - Geographic service area management
2. [**Station Management**](./STATIONS.md) - Waste drop-off point management
3. [**Integration Guide**](./INTEGRATION_GUIDE.md) - Complete workflow and frontend examples

---

## Quick Start

### For Admins

**Step 1: Create a Zone**

```bash
POST /zones
{
  "name": "Madina Zone",
  "boundary": { "type": "Polygon", "coordinates": [...] }
}
```

**Step 2: Add Stations**

```bash
POST /stations
{
  "zoneId": "<zone-id>",
  "name": "Central Hub",
  "address": "123 Main St",
  "location": { "type": "Point", "coordinates": [lng, lat] }
}
```

**Step 3: Approve Riders**

```bash
PATCH /rider-verification/:riderId/approve
{
  "zoneId": "<zone-id>"
}
```

### For Riders

**Fetch Your Stations**

```bash
GET /stations/my-stations
Authorization: Bearer <rider-token>
```

**Response:** List of all stations in your assigned zone

---

## Documentation Files

### 📍 [ZONES.md](./ZONES.md)

Complete API reference for zone management including:

- Creating zones with geographic boundaries
- Listing zones with statistics
- Updating zone details
- Deleting zones
- GeoJSON polygon format
- Map integration examples

**Key Endpoints:**

- `POST /zones` - Create new zone
- `GET /zones` - List all zones
- `GET /zones/:id` - Get zone details
- `PATCH /zones/:id` - Update zone
- `DELETE /zones/:id` - Delete zone

---

### 🏢 [STATIONS.md](./STATIONS.md)

Complete API reference for station management including:

- Creating stations within zones
- Listing stations by zone
- Getting rider's assigned stations
- Updating station details
- Deleting stations
- GeoJSON point format
- Distance calculations

**Key Endpoints:**

- `POST /stations` - Create new station
- `GET /stations` - List all stations (filterable by zone)
- `GET /stations/my-stations` - Get rider's stations (rider only)
- `GET /stations/:id` - Get station details
- `PATCH /stations/:id` - Update station
- `DELETE /stations/:id` - Delete station

---

### 🔗 [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

Complete integration guide including:

- System architecture overview
- Step-by-step workflows
- Frontend implementation examples
- Data flow diagrams
- Role-based access control
- Best practices
- Troubleshooting guide

**Topics Covered:**

- Admin dashboard implementation
- Rider app implementation
- Map integration (Google Maps, Mapbox)
- Zone and station management workflows
- Security considerations

---

## Key Concepts

### Geographic Data

#### GeoJSON Format

All geographic data uses GeoJSON specification:

**Point** (for stations):

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

**Polygon** (for zones):

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [lng1, lat1],
      [lng2, lat2],
      [lng3, lat3],
      [lng1, lat1]  // Must close
    ]
  ]
}
```

⚠️ **Important:** Coordinates are `[longitude, latitude]`, NOT `[latitude, longitude]`

### Zone Assignment

- Every rider must be assigned to exactly one zone
- Zone assignment happens during rider approval
- Riders can only see stations in their assigned zone
- Admins can see all zones and stations

### Station Access

- Stations belong to a specific zone
- Riders can only see stations in their zone via `/stations/my-stations`
- Admins can see all stations across all zones via `/stations`

---

## Authentication & Authorization

### Required Headers

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Roles

- **Admin/Super Admin**: Full access to all endpoints
- **Rider**: Read-only access to zones, read-only access to own zone's stations
- **User**: No access to zone/station management

---

## Response Format

### Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": { ... }  // For paginated responses
}
```

### Error Response

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Error message",
  "errorMessages": [
    {
      "path": "field.name",
      "message": "Detailed error"
    }
  ]
}
```

---

## Common HTTP Status Codes

| Code | Meaning               | When Used                                |
| ---- | --------------------- | ---------------------------------------- |
| 200  | OK                    | Successful GET, PATCH, DELETE            |
| 201  | Created               | Successful POST (resource created)       |
| 400  | Bad Request           | Validation error, invalid data           |
| 401  | Unauthorized          | Missing or invalid token                 |
| 403  | Forbidden             | Valid token but insufficient permissions |
| 404  | Not Found             | Resource doesn't exist                   |
| 500  | Internal Server Error | Server-side error                        |

---

## Environment Setup

### Required Environment Variables

```env
DATABASE_URL="mongodb://..."
JWT_SECRET="your-jwt-secret"
PORT=5000
```

### Installation

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

---

## Testing

### Run Tests

```bash
npm test
```

### Example Test

```javascript
describe('Zone Management', () => {
  test('Should create zone', async () => {
    const response = await request(app)
      .post('/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Zone',
        boundary: { ... }
      });

    expect(response.status).toBe(201);
  });
});
```

---

## Support & Contributing

### Report Issues

Contact the development team or create an issue in the repository.

### Request Features

Submit feature requests with detailed use cases.

---

## Additional Resources

- [GeoJSON Specification](https://geojson.org/)
- [Google Maps API](https://developers.google.com/maps)
- [Mapbox Documentation](https://docs.mapbox.com/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## Version History

- **v1.0.0** (2026-03-07) - Initial release with Zone and Station management

---

## Quick Reference

### Base URL

```
http://localhost:5000/api/v1
```

### Key Endpoints Summary

| Method | Endpoint              | Description      | Auth         |
| ------ | --------------------- | ---------------- | ------------ |
| POST   | /zones                | Create zone      | Admin        |
| GET    | /zones                | List zones       | Admin, Rider |
| GET    | /zones/:id            | Get zone         | Admin, Rider |
| PATCH  | /zones/:id            | Update zone      | Admin        |
| DELETE | /zones/:id            | Delete zone      | Admin        |
| POST   | /stations             | Create station   | Admin        |
| GET    | /stations             | List stations    | Admin, Rider |
| GET    | /stations/my-stations | Rider's stations | Rider        |
| GET    | /stations/:id         | Get station      | Admin, Rider |
| PATCH  | /stations/:id         | Update station   | Admin        |
| DELETE | /stations/:id         | Delete station   | Admin        |

---

_For detailed information, see the individual documentation files listed above._
