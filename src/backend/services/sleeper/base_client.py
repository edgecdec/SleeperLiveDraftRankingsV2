"""
Base Sleeper API Client

Handles core HTTP communication with the Sleeper API
"""

import requests
from typing import Dict, Optional
from ...config import SLEEPER_API_BASE_URL, API_TIMEOUT


class SleeperAPIError(Exception):
    """Custom exception for Sleeper API errors"""
    pass


class BaseSleeperClient:
    """Base client for Sleeper API communication"""
    
    BASE_URL = SLEEPER_API_BASE_URL
    
    @staticmethod
    def make_request(endpoint: str, timeout: int = API_TIMEOUT) -> Optional[Dict]:
        """Make a request to the Sleeper API with error handling"""
        url = f"{BaseSleeperClient.BASE_URL}{endpoint}"
        
        try:
            response = requests.get(url, timeout=timeout)
            
            if response.status_code == 404:
                return None  # Not found is not an error, return None
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            raise SleeperAPIError(f"Timeout while fetching {endpoint}")
        except requests.exceptions.ConnectionError:
            raise SleeperAPIError("Unable to connect to Sleeper API")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                raise SleeperAPIError("Rate limited by Sleeper API")
            raise SleeperAPIError(f"Sleeper API error: {e.response.status_code}")
        except Exception as e:
            raise SleeperAPIError(f"Unexpected error: {str(e)}")
