# API Reference

This document provides a complete reference for the Fantasy Football Draft Assistant V2 API endpoints.

## Base URL

All API endpoints are relative to the base URL:
```
http://localhost:{PORT}/api
```

Where `{PORT}` is the port the application is running on (default: 5000).

## Response Format

All API responses are in JSON format with the following structure:

### Success Response
```json
{
  "data": { ... },
  "status": "success"
}
```

### Error Response
```json
{
  "error": "Error message",
  "status": "error"
}
```

## Endpoints

### Health Check

#### GET `/health`

Check if the API server is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "debug": false,
  "static_path": "/path/to/frontend"
}
```

**Status Codes:**
- `200 OK`: Server is healthy

---

### API Information

#### GET `/info`

Get information about the API and available endpoints.

**Response:**
```json
{
  "name": "Fantasy Football Draft Assistant API",
  "version": "2.0.0",
  "endpoints": {
    "health": "/api/health",
    "info": "/api/info"
  }
}
```

**Status Codes:**
- `200 OK`: Information retrieved successfully

---

## Future Endpoints

The following endpoints will be implemented as the application develops:

### Draft Management

#### GET `/draft/{draft_id}`

Get draft information and available players.

**Parameters:**
- `draft_id` (string): Sleeper draft ID

**Response:**
```json
{
  "draft_id": "123456789",
  "available_players": [
    {
      "name": "Josh Allen",
      "position": "QB",
      "team": "BUF",
      "rank": 1,
      "tier": 1
    }
  ],
  "positions": {
    "QB": [...],
    "RB": [...],
    "WR": [...],
    "TE": [...]
  },
  "total_available": 450,
  "total_drafted": 34
}
```

#### GET `/draft/{draft_id}/picks`

Get all picks made in the draft.

**Parameters:**
- `draft_id` (string): Sleeper draft ID

**Response:**
```json
{
  "picks": [
    {
      "pick_no": 1,
      "player_id": "4046",
      "player_name": "Christian McCaffrey",
      "position": "RB",
      "team": "SF",
      "picked_by": "user123"
    }
  ]
}
```

### League Management

#### GET `/league/{league_id}`

Get league information and settings.

**Parameters:**
- `league_id` (string): Sleeper league ID

**Response:**
```json
{
  "league_id": "123456789",
  "name": "My Fantasy League",
  "scoring_format": "ppr",
  "league_type": "standard",
  "roster_positions": ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"],
  "total_teams": 12
}
```

### Rankings Management

#### GET `/rankings/formats`

Get available ranking formats.

**Response:**
```json
{
  "formats": [
    {
      "id": "ppr_standard",
      "name": "PPR Standard",
      "scoring": "ppr",
      "type": "standard"
    },
    {
      "id": "half_ppr_superflex",
      "name": "Half PPR Superflex",
      "scoring": "half_ppr",
      "type": "superflex"
    }
  ]
}
```

#### POST `/rankings/select`

Select a specific ranking format.

**Request Body:**
```json
{
  "format_id": "ppr_superflex"
}
```

**Response:**
```json
{
  "format_id": "ppr_superflex",
  "name": "PPR Superflex",
  "applied": true
}
```

#### GET `/rankings/current`

Get current rankings for the selected format.

**Response:**
```json
{
  "format": "ppr_superflex",
  "players": [
    {
      "name": "Josh Allen",
      "position": "QB",
      "team": "BUF",
      "rank": 1,
      "tier": 1,
      "adp": 2.3
    }
  ],
  "last_updated": "2025-01-01T12:00:00Z"
}
```

### User Management

#### GET `/user/{username}`

Get user information from Sleeper.

**Parameters:**
- `username` (string): Sleeper username

**Response:**
```json
{
  "user_id": "123456789",
  "username": "example_user",
  "display_name": "Example User",
  "avatar": "avatar_url"
}
```

#### GET `/user/{username}/leagues`

Get leagues for a specific user.

**Parameters:**
- `username` (string): Sleeper username

**Response:**
```json
{
  "leagues": [
    {
      "league_id": "123456789",
      "name": "My Fantasy League",
      "season": "2024",
      "status": "in_season"
    }
  ]
}
```

## Error Codes

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Application Error Codes

- `INVALID_DRAFT_ID`: Draft ID format is invalid
- `DRAFT_NOT_FOUND`: Draft does not exist
- `LEAGUE_NOT_FOUND`: League does not exist
- `USER_NOT_FOUND`: User does not exist
- `RANKINGS_NOT_AVAILABLE`: Rankings data not available
- `API_RATE_LIMIT`: External API rate limit exceeded
- `NETWORK_ERROR`: Network connection error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Local endpoints**: No rate limiting
- **External API calls**: Limited by Sleeper API (approximately 1000 requests per minute)

## Authentication

This is a local desktop application, so no authentication is required. All endpoints are accessible without credentials.

## CORS

CORS is enabled for local development with the following origins:
- `http://localhost:*`
- `http://127.0.0.1:*`

## WebSocket Support

Future versions may include WebSocket support for real-time draft updates:

#### WS `/ws/draft/{draft_id}`

Real-time draft updates.

**Messages:**
```json
{
  "type": "pick_made",
  "data": {
    "pick_no": 15,
    "player_name": "Derrick Henry",
    "picked_by": "user123"
  }
}
```

## SDK / Client Libraries

### JavaScript (Frontend)

```javascript
class DraftAssistantAPI {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }
  
  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
  
  async getDraftData(draftId) {
    const response = await fetch(`${this.baseUrl}/draft/${draftId}`);
    return response.json();
  }
}

// Usage
const api = new DraftAssistantAPI();
const health = await api.healthCheck();
```

### Python (Testing)

```python
import requests

class DraftAssistantAPI:
    def __init__(self, base_url='http://localhost:5000/api'):
        self.base_url = base_url
    
    def health_check(self):
        response = requests.get(f'{self.base_url}/health')
        return response.json()
    
    def get_draft_data(self, draft_id):
        response = requests.get(f'{self.base_url}/draft/{draft_id}')
        return response.json()

# Usage
api = DraftAssistantAPI()
health = api.health_check()
```

## Testing

### Manual Testing

Use curl to test endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# API info
curl http://localhost:5000/api/info

# Draft data (when implemented)
curl http://localhost:5000/api/draft/123456789
```

### Automated Testing

The project includes pytest tests for all endpoints:

```bash
# Run all API tests
python -m pytest tests/test_api.py -v

# Run specific test
python -m pytest tests/test_api.py::test_health_endpoint -v
```

## Changelog

### Version 2.0.0
- Initial API design
- Health check endpoint
- API info endpoint
- Documentation structure

### Future Versions
- Draft management endpoints
- League information endpoints
- Rankings management
- Real-time updates via WebSocket

This API reference will be updated as new endpoints are implemented. The current version provides the foundation for the single executable fantasy football draft assistant.
