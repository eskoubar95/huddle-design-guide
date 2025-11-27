# Huddle API v1

RESTful API for Huddle platform. All endpoints are versioned under `/api/v1/`.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

Most endpoints require authentication via Clerk. Include the Clerk session token in the `Authorization` header:

```
Authorization: Bearer <clerk_session_token>
```

**Getting the token:**
- Frontend: Use `useAuth()` hook from `@clerk/nextjs` and call `getToken()`
- API clients: Obtain token from Clerk authentication flow

**Public endpoints** (no authentication required):
- `GET /api/v1/jerseys`
- `GET /api/v1/jerseys/:id`
- `GET /api/v1/listings`
- `GET /api/v1/listings/:id`
- `GET /api/v1/auctions`
- `GET /api/v1/auctions/:id`
- `GET /api/v1/posts`
- `GET /api/v1/posts/:id`
- `GET /api/v1/profiles/:id`
- `GET /api/v1/profiles/username/:username`
- `GET /api/v1/health`

**Protected endpoints** require authentication and may require ownership:
- All `POST`, `PATCH`, `DELETE` operations
- Some `GET` operations for private resources

## Rate Limiting

All endpoints are rate-limited:

- **Anonymous users:** 100 requests per 15 minutes
- **Authenticated users:** 300 requests per 15 minutes

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 250
X-RateLimit-Reset: 1701234567890
```

When rate limit is exceeded, you'll receive:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "resetAt": 1701234567890
    }
  }
}
```

Status code: `429 Too Many Requests`

## Error Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": null // Optional additional context
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Authenticated but not authorized for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed (Zod schema) |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate entry) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

## Pagination

List endpoints use cursor-based pagination:

**Request:**
```
GET /api/v1/jerseys?limit=20&cursor=eyJjcmVhdGVkX2F0IjoiMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIn0
```

**Response:**
```json
{
  "items": [...],
  "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNC0wMS0wMlQwMDowMDowMC4wMDBaIn0" // null if no more items
}
```

**Parameters:**
- `limit` (optional): Number of items per page (default: 20, max: 100)
- `cursor` (optional): Encoded cursor from previous response's `nextCursor`

**Usage:**
1. First request: `GET /api/v1/jerseys?limit=20`
2. If `nextCursor` is not null, use it: `GET /api/v1/jerseys?limit=20&cursor=<nextCursor>`
3. Repeat until `nextCursor` is `null`

## Endpoints

### Health Check

#### `GET /api/v1/health`

Check API and database health.

**Authentication:** None

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "healthy"
}
```

**Status codes:**
- `200`: Healthy
- `503`: Unhealthy (database connection failed)

---

### Jerseys

#### `GET /api/v1/jerseys`

List jerseys with optional filters.

**Authentication:** Optional (affects visibility filtering)

**Query Parameters:**
- `limit` (optional): Number of items (default: 20, max: 100)
- `cursor` (optional): Pagination cursor
- `ownerId` (optional): Filter by owner ID
- `visibility` (optional): `"public"` | `"private"` | `"all"` (default: `"all"`)
- `club` (optional): Filter by club name
- `season` (optional): Filter by season

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "owner_id": "clerk_user_id",
      "club": "FC Barcelona",
      "season": "2023-24",
      "jersey_type": "Home",
      "player_name": "Lionel Messi",
      "player_number": "10",
      "images": ["https://..."],
      "visibility": "public",
      "condition_rating": 9,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "eyJ..." // or null
}
```

#### `POST /api/v1/jerseys`

Create a new jersey.

**Authentication:** Required

**Request Body:**
```json
{
  "club": "FC Barcelona",
  "season": "2023-24",
  "jersey_type": "Home",
  "player_name": "Lionel Messi",
  "player_number": "10",
  "images": ["https://..."],
  "visibility": "public",
  "condition_rating": 9,
  "notes": "Excellent condition"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "owner_id": "clerk_user_id",
  ...
}
```

#### `GET /api/v1/jerseys/:id`

Get a specific jersey by ID.

**Authentication:** Optional (affects visibility check)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "owner_id": "clerk_user_id",
  ...
}
```

#### `PATCH /api/v1/jerseys/:id`

Update a jersey. Only the owner can update.

**Authentication:** Required (owner only)

**Request Body:** (all fields optional)
```json
{
  "visibility": "private",
  "condition_rating": 8
}
```

**Response:** `200 OK` (updated jersey)

#### `DELETE /api/v1/jerseys/:id`

Delete a jersey. Only the owner can delete.

**Authentication:** Required (owner only)

**Response:** `204 No Content`

---

### Sale Listings

#### `GET /api/v1/listings`

List sale listings with optional filters.

**Authentication:** Optional

**Query Parameters:**
- `limit` (optional): Number of items (default: 20, max: 100)
- `cursor` (optional): Pagination cursor
- `status` (optional): `"active"` | `"sold"` | `"cancelled"`
- `club` (optional): Filter by club name
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `country` (optional): Filter by country
- `sort` (optional): Sort order

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "jersey_id": "uuid",
      "seller_id": "clerk_user_id",
      "price": 150.00,
      "currency": "EUR",
      "status": "active",
      "country": "Denmark",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "eyJ..." // or null
}
```

#### `POST /api/v1/listings`

Create a new sale listing.

**Authentication:** Required

**Request Body:**
```json
{
  "jersey_id": "uuid",
  "price": 150.00,
  "currency": "EUR",
  "country": "Denmark",
  "description": "Selling my jersey"
}
```

**Response:** `201 Created`

#### `GET /api/v1/listings/:id`

Get a specific listing by ID.

**Authentication:** Optional

**Response:** `200 OK`

#### `PATCH /api/v1/listings/:id`

Update a listing. Only the seller can update.

**Authentication:** Required (seller only)

**Request Body:** (all fields optional)
```json
{
  "price": 140.00,
  "status": "sold"
}
```

**Response:** `200 OK`

#### `DELETE /api/v1/listings/:id`

Delete a listing. Only the seller can delete.

**Authentication:** Required (seller only)

**Response:** `204 No Content`

---

### Auctions

#### `GET /api/v1/auctions`

List auctions with optional filters.

**Authentication:** Optional

**Query Parameters:**
- `limit` (optional): Number of items (default: 20, max: 100)
- `cursor` (optional): Pagination cursor
- `status` (optional): `"active"` | `"ended"` | `"cancelled"`
- `sellerId` (optional): Filter by seller ID

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "jersey_id": "uuid",
      "seller_id": "clerk_user_id",
      "starting_bid": 100.00,
      "current_bid": 150.00,
      "reserve_price": 200.00,
      "end_time": "2024-01-10T00:00:00.000Z",
      "status": "active",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "eyJ..." // or null
}
```

#### `POST /api/v1/auctions`

Create a new auction.

**Authentication:** Required

**Request Body:**
```json
{
  "jersey_id": "uuid",
  "starting_bid": 100.00,
  "reserve_price": 200.00,
  "end_time": "2024-01-10T00:00:00.000Z",
  "description": "Auction for my jersey"
}
```

**Response:** `201 Created`

#### `GET /api/v1/auctions/:id`

Get a specific auction by ID.

**Authentication:** Optional

**Response:** `200 OK`

#### `PATCH /api/v1/auctions/:id`

Update an auction. Only the seller can update.

**Authentication:** Required (seller only)

**Request Body:** (all fields optional)
```json
{
  "reserve_price": 250.00
}
```

**Response:** `200 OK`

#### `DELETE /api/v1/auctions/:id`

Delete an auction. Only the seller can delete.

**Authentication:** Required (seller only)

**Response:** `204 No Content`

---

### Bids

#### `POST /api/v1/bids`

Place a bid on an auction.

**Authentication:** Required

**Request Body:**
```json
{
  "auction_id": "uuid",
  "amount": 150.00
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "auction_id": "uuid",
  "bidder_id": "clerk_user_id",
  "amount": 150.00,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Error codes:**
- `VALIDATION_ERROR`: Bid amount too low (must be > current_bid)
- `NOT_FOUND`: Auction not found
- `CONFLICT`: Auction has ended or been cancelled

**Note:** Bid placement is atomic (uses Supabase RPC function) to prevent race conditions.

---

### Posts

#### `GET /api/v1/posts`

List posts with optional filters.

**Authentication:** Optional

**Query Parameters:**
- `limit` (optional): Number of items (default: 20, max: 100)
- `cursor` (optional): Pagination cursor
- `userId` (optional): Filter by user ID
- `jerseyId` (optional): Filter by jersey ID

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "clerk_user_id",
      "jersey_id": "uuid",
      "content": "Just got this amazing jersey!",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "eyJ..." // or null
}
```

#### `POST /api/v1/posts`

Create a new post.

**Authentication:** Required

**Request Body:**
```json
{
  "jersey_id": "uuid",
  "content": "Just got this amazing jersey!"
}
```

**Response:** `201 Created`

#### `GET /api/v1/posts/:id`

Get a specific post by ID.

**Authentication:** Optional

**Response:** `200 OK`

#### `PATCH /api/v1/posts/:id`

Update a post. Only the author can update.

**Authentication:** Required (author only)

**Request Body:** (all fields optional)
```json
{
  "content": "Updated content"
}
```

**Response:** `200 OK`

#### `DELETE /api/v1/posts/:id`

Delete a post. Only the author can delete.

**Authentication:** Required (author only)

**Response:** `204 No Content`

---

### Profiles

#### `GET /api/v1/profiles/:id`

Get a profile by user ID.

**Authentication:** Optional

**Response:** `200 OK`
```json
{
  "id": "clerk_user_id",
  "username": "johndoe",
  "avatar_url": "https://...",
  "bio": "Jersey collector",
  "location": "Copenhagen, Denmark",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

#### `GET /api/v1/profiles/username/:username`

Get a profile by username.

**Authentication:** Optional

**Response:** `200 OK` (same format as above)

#### `PATCH /api/v1/profiles/:id`

Update a profile. Only the owner can update.

**Authentication:** Required (owner only)

**Request Body:** (all fields optional)
```json
{
  "username": "newusername",
  "bio": "Updated bio",
  "location": "New location",
  "avatar_url": "https://..."
}
```

**Response:** `200 OK` (updated profile)

**Error codes:**
- `CONFLICT`: Username already taken

---

### Auth

#### `POST /api/v1/auth`

Check authentication status.

**Authentication:** Required (via Clerk token)

**Response:** `200 OK`
```json
{
  "authenticated": true,
  "userId": "clerk_user_id"
}
```

**Error codes:**
- `UNAUTHORIZED`: Not authenticated

**Note:** This endpoint is mainly for consistency. Frontend authentication is handled by Clerk's `ClerkProvider` and `useAuth()` hook.

---

## Testing

### Manual Testing

Use tools like Postman, Thunder Client, or `curl` to test endpoints:

```bash
# Health check
curl https://your-domain.com/api/v1/health

# List jerseys (public)
curl https://your-domain.com/api/v1/jerseys

# Create jersey (requires auth)
curl -X POST https://your-domain.com/api/v1/jerseys \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"club": "FC Barcelona", "season": "2023-24", ...}'
```

### Automated Testing

See `apps/web/scripts/test-phase1.sh` for automated endpoint testing.

---

## Performance

- **Target response time:** < 500ms for simple queries
- **Database indexes:** Optimized for common query patterns
- **Caching:** Consider implementing Redis caching for frequently accessed resources

---

## Monitoring

- **Error tracking:** Sentry integration (per `.cursor/rules/24-observability_sentry.mdc`)
- **Health checks:** `/api/v1/health` endpoint for monitoring
- **Rate limiting:** Tracked per user/IP

---

## Support

For issues or questions:
- Check error messages for specific error codes
- Review validation errors in `details` field
- Check rate limit headers if receiving 429 errors

---

**Last updated:** 2024-11-27

