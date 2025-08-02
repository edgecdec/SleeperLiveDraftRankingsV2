"""
User and League API Module

Handles user and league-related Sleeper API calls
"""

from typing import Dict, List, Optional
from .base_client import BaseSleeperClient, SleeperAPIError


class UserLeagueAPI(BaseSleeperClient):
    """API client for user and league operations"""
    
    @staticmethod
    def get_user(username: str) -> Optional[Dict]:
        """Get user info by username"""
        if not username or not isinstance(username, str):
            raise ValueError("Username must be a non-empty string")
        
        return UserLeagueAPI.make_request(f"/user/{username}")
    
    @staticmethod
    def get_user_leagues(user_id: str, season: str = "2025") -> List[Dict]:
        """Get all leagues for a user in a given season"""
        if not user_id:
            raise ValueError("User ID is required")
        
        if not season or not season.isdigit():
            raise ValueError("Season must be a valid year")
        
        result = UserLeagueAPI.make_request(f"/user/{user_id}/leagues/nfl/{season}", timeout=15)
        return result or []
    
    @staticmethod
    def get_league_info(league_id: str) -> Optional[Dict]:
        """Get league information"""
        if not league_id:
            raise ValueError("League ID is required")
        
        return UserLeagueAPI.make_request(f"/league/{league_id}")
    
    @staticmethod
    def get_league_rosters(league_id: str) -> List[Dict]:
        """Get all rosters for a league"""
        if not league_id:
            raise ValueError("League ID is required")
        
        result = UserLeagueAPI.make_request(f"/league/{league_id}/rosters")
        return result or []
    
    @staticmethod
    def get_league_users(league_id: str) -> List[Dict]:
        """Get all users in a league"""
        if not league_id:
            raise ValueError("League ID is required")
        
        result = UserLeagueAPI.make_request(f"/league/{league_id}/users")
        return result or []
    
    @staticmethod
    def get_league_drafts(league_id: str) -> List[Dict]:
        """Get all drafts for a league"""
        if not league_id:
            raise ValueError("League ID is required")
        
        result = UserLeagueAPI.make_request(f"/league/{league_id}/drafts")
        return result or []
