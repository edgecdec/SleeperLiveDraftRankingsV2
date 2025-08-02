# Development Guide

This guide covers development practices, coding standards, and workflows for the Fantasy Football Draft Assistant V2.

## 🚀 Getting Started

### Prerequisites
- Python 3.8+ (3.9+ recommended)
- Git
- A modern web browser

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd SleeperLiveDraftRankingsV2

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

## 📋 Coding Standards

### Python Code Style
We follow **PEP 8** with these specific guidelines:

```python
# ✅ Good: Clear function names and docstrings
def get_available_players(draft_id: str, league_format: str) -> List[Player]:
    """
    Retrieve available players for a specific draft.
    
    Args:
        draft_id: Unique identifier for the draft
        league_format: Format string like 'ppr_superflex'
    
    Returns:
        List of Player objects that haven't been drafted
    """
    pass

# ✅ Good: Type hints for clarity
from typing import List, Dict, Optional, Union

# ✅ Good: Constants in UPPER_CASE
DEFAULT_PORT = 5000
MAX_RETRIES = 3
API_BASE_URL = "https://api.sleeper.app/v1"

# ✅ Good: Error handling with specific exceptions
try:
    response = requests.get(url, timeout=10)
    response.raise_for_status()
except requests.RequestException as e:
    logger.error(f"API request failed: {e}")
    raise ServiceError(f"Failed to fetch data: {e}")
```

### JavaScript Code Style
We use modern ES6+ JavaScript with these conventions:

```javascript
// ✅ Good: Use const/let, not var
const API_BASE = '/api';
let currentDraftId = null;

// ✅ Good: Arrow functions for callbacks
const fetchPlayers = async (draftId) => {
    try {
        const response = await fetch(`${API_BASE}/draft/${draftId}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch players:', error);
        throw error;
    }
};

// ✅ Good: Destructuring for cleaner code
const { available_players, positions } = await fetchPlayers(draftId);

// ✅ Good: Template literals for strings
const message = `Found ${available_players.length} available players`;
```

### File Organization
```python
# ✅ Good: Imports organized by type
# Standard library
import os
import sys
from typing import List, Dict

# Third-party
import requests
from flask import Flask, jsonify

# Local imports
from .services.sleeper_api import SleeperAPI
from .utils.port_finder import find_available_port
```

## 🏗️ Architecture Patterns

### Service Layer Pattern
All business logic goes in services, not routes:

```python
# ❌ Bad: Business logic in route
@app.route('/api/draft/<draft_id>')
def get_draft(draft_id):
    # Don't put business logic here
    response = requests.get(f"https://api.sleeper.app/v1/draft/{draft_id}")
    data = response.json()
    # ... processing logic ...
    return jsonify(data)

# ✅ Good: Thin route, thick service
@app.route('/api/draft/<draft_id>')
def get_draft(draft_id):
    try:
        draft_data = draft_service.get_draft_data(draft_id)
        return jsonify(draft_data)
    except ServiceError as e:
        return jsonify({'error': str(e)}), 500
```

### Error Handling Pattern
Consistent error handling across the application:

```python
# Custom exceptions
class ServiceError(Exception):
    """Base exception for service layer errors"""
    pass

class APIError(ServiceError):
    """External API related errors"""
    pass

class DataError(ServiceError):
    """Data processing related errors"""
    pass

# Service method with proper error handling
def get_league_info(self, league_id: str) -> Dict:
    try:
        response = self._make_api_request(f"/league/{league_id}")
        return self._process_league_data(response)
    except requests.RequestException as e:
        raise APIError(f"Failed to fetch league {league_id}: {e}")
    except (KeyError, ValueError) as e:
        raise DataError(f"Invalid league data format: {e}")
```

### Configuration Pattern
Environment-based configuration:

```python
# config.py
import os
from typing import Optional

class Config:
    """Base configuration class"""
    DEBUG = False
    PORT = int(os.environ.get('PORT', 5000))
    HOST = os.environ.get('HOST', 'localhost')
    
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

def get_config() -> Config:
    """Get configuration based on environment"""
    env = os.environ.get('FLASK_ENV', 'production')
    if env == 'development':
        return DevelopmentConfig()
    return ProductionConfig()
```

## 🧪 Testing Guidelines

### Unit Testing
Test each service method independently:

```python
# test_rankings_service.py
import pytest
from unittest.mock import Mock, patch
from src.backend.services.rankings_service import RankingsService

class TestRankingsService:
    def setup_method(self):
        self.service = RankingsService()
    
    @patch('src.backend.services.rankings_service.requests.get')
    def test_get_league_format_success(self, mock_get):
        # Arrange
        mock_response = Mock()
        mock_response.json.return_value = {
            'scoring_settings': {'rec': 0.5},
            'roster_positions': ['QB', 'RB', 'RB']
        }
        mock_get.return_value = mock_response
        
        # Act
        result = self.service.detect_league_format('123456')
        
        # Assert
        assert result == ('half_ppr', 'standard')
        mock_get.assert_called_once()
```

### Integration Testing
Test API endpoints end-to-end:

```python
# test_api.py
import pytest
from src.backend.app import create_app

@pytest.fixture
def client():
    app = create_app(testing=True)
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'

def test_draft_endpoint_valid_id(client):
    response = client.get('/api/draft/123456789')
    assert response.status_code == 200
    assert 'available_players' in response.json
```

## 🔧 Development Workflow

### Feature Development
1. **Create feature branch**: `git checkout -b feature/player-filtering`
2. **Write tests first**: Test-driven development
3. **Implement feature**: Start with service layer, then routes
4. **Test manually**: Run the app and test in browser
5. **Update documentation**: Update relevant docs
6. **Create pull request**: Include description and testing notes

### Debugging
```python
# Use logging instead of print statements
import logging

logger = logging.getLogger(__name__)

def process_draft_data(draft_id: str):
    logger.info(f"Processing draft data for {draft_id}")
    try:
        # ... processing ...
        logger.debug(f"Found {len(players)} players")
    except Exception as e:
        logger.error(f"Failed to process draft {draft_id}: {e}")
        raise
```

### Performance Monitoring
```python
# Add timing decorators for slow operations
import time
from functools import wraps

def timing_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start
        logger.info(f"{func.__name__} took {duration:.2f}s")
        return result
    return wrapper

@timing_decorator
def fetch_all_players(league_id: str):
    # ... expensive operation ...
    pass
```

## 🚀 Build and Deployment

### Development Server
```bash
# Run with auto-reload
python main.py --debug

# Run on specific port
python main.py --port 8080
```

### Building Executable
```bash
# Build for current platform
python scripts/build.py

# Build for all platforms (requires setup)
python scripts/build.py --all-platforms
```

### Testing Build
```bash
# Test the built executable
./build/dist/FantasyFootballDraftAssistant

# Verify all features work
python scripts/test_build.py
```

## 📝 Documentation Standards

### Code Documentation
```python
def calculate_player_value(player: Player, league_format: str) -> float:
    """
    Calculate a player's value based on league format.
    
    This function adjusts player rankings based on scoring format
    and league type (standard vs superflex).
    
    Args:
        player: Player object with stats and position
        league_format: Format string like 'ppr_superflex'
    
    Returns:
        Calculated value as float (higher = more valuable)
    
    Raises:
        ValueError: If league_format is not recognized
        
    Example:
        >>> player = Player(name="Josh Allen", position="QB")
        >>> value = calculate_player_value(player, "ppr_superflex")
        >>> print(f"Player value: {value}")
    """
```

### API Documentation
Update `docs/API_REFERENCE.md` for any new endpoints:

```markdown
### GET /api/draft/{draft_id}

Retrieve available players for a specific draft.

**Parameters:**
- `draft_id` (string): Unique identifier for the draft

**Response:**
```json
{
  "available_players": [...],
  "positions": {...},
  "total_available": 450
}
```

**Error Codes:**
- `404`: Draft not found
- `500`: Server error
```

## 🐛 Common Issues and Solutions

### Port Already in Use
```python
# The app automatically finds available ports
# If you need to specify a port:
python main.py --port 8080
```

### Import Errors
```python
# Always use relative imports within the package
from .services.sleeper_api import SleeperAPI  # ✅ Good
from src.backend.services.sleeper_api import SleeperAPI  # ❌ Bad
```

### CORS Issues
```python
# CORS is configured in app.py for local development
# If you add new origins, update the CORS configuration
```

### Build Issues
```bash
# Clean build directory
rm -rf build/
python scripts/build.py

# Check for missing dependencies
pip freeze > requirements.txt
```

## 📚 Learning Resources

### Python/Flask
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)
- [Requests Library](https://docs.python-requests.org/)

### JavaScript
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Modern JavaScript Features](https://javascript.info/)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

### Testing
- [pytest Documentation](https://docs.pytest.org/)
- [unittest.mock](https://docs.python.org/3/library/unittest.mock.html)

This development guide ensures consistent, maintainable code across the project. Follow these patterns and your code will integrate seamlessly with the existing architecture.
