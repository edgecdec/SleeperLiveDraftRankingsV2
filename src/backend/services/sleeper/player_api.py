"""
Player Data API Module

Handles player-related Sleeper API calls with caching
"""

import time
from typing import Dict, List, Optional
from .base_client import BaseSleeperClient, SleeperAPIError


class PlayerAPI(BaseSleeperClient):
    """API client for player operations with caching"""
    
    _players_cache = None
    _players_cache_time = None
    CACHE_DURATION = 3600  # 1 hour cache for player data
    
    @staticmethod
    def get_all_players() -> Dict:
        """Get all NFL players with caching"""
        current_time = time.time()
        
        # Return cached data if still valid
        if (PlayerAPI._players_cache and PlayerAPI._players_cache_time and 
            current_time - PlayerAPI._players_cache_time < PlayerAPI.CACHE_DURATION):
            print(f"📊 Using cached player data ({len(PlayerAPI._players_cache)} players)")
            return PlayerAPI._players_cache
        
        print("📊 Fetching fresh player data from Sleeper API...")
        players_data = PlayerAPI.make_request("/players/nfl", timeout=30)
        
        if not players_data:
            raise SleeperAPIError("Empty player data received from Sleeper API")
        
        PlayerAPI._players_cache = players_data
        PlayerAPI._players_cache_time = current_time
        
        print(f"📊 Updated player cache with {len(players_data)} players")
        return players_data
    
    @staticmethod
    def get_player_name(player_id: str, all_players: Dict = None) -> Optional[str]:
        """
        Get player name from player ID
        
        Args:
            player_id: Sleeper player ID
            all_players: Optional pre-fetched players dict for efficiency
            
        Returns:
            Player name string or None if not found
        """
        try:
            if all_players is None:
                all_players = PlayerAPI.get_all_players()
            
            player_data = all_players.get(player_id)
            if player_data:
                first_name = player_data.get('first_name', '')
                last_name = player_data.get('last_name', '')
                return f"{first_name} {last_name}".strip()
            
            return None
        except Exception as e:
            print(f"⚠️ Error getting player name for {player_id}: {e}")
            return None
    
    @staticmethod
    def create_player_from_sleeper_data(player_id: str, player_data: Dict) -> Dict:
        """
        Create a standardized player object from Sleeper data
        
        Args:
            player_id: Sleeper player ID
            player_data: Player data from Sleeper API
            
        Returns:
            Standardized player dictionary
        """
        try:
            first_name = player_data.get('first_name', '')
            last_name = player_data.get('last_name', '')
            name = f"{first_name} {last_name}".strip()
            
            return {
                'player_id': player_id,
                'name': name or f"Player {player_id}",
                'position': player_data.get('position', 'Unknown'),
                'team': player_data.get('team', 'N/A'),
                'status': player_data.get('status', 'Unknown'),
                'injury_status': player_data.get('injury_status'),
                'years_exp': player_data.get('years_exp', 0),
                'age': player_data.get('age'),
                'height': player_data.get('height'),
                'weight': player_data.get('weight'),
                'college': player_data.get('college'),
                'fantasy_positions': player_data.get('fantasy_positions', [])
            }
        except Exception as e:
            print(f"⚠️ Error creating player from Sleeper data: {e}")
            return {
                'player_id': player_id,
                'name': f"Player {player_id}",
                'position': 'Unknown',
                'team': 'N/A'
            }
