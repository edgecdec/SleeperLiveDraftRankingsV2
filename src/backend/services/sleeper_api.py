"""
Sleeper API Service for Fantasy Football Draft Assistant V2

This module handles all interactions with the Sleeper Fantasy Football API
with proper error handling and caching.
"""

import requests
import time
from typing import Dict, List, Optional, Tuple
from ..config import SLEEPER_API_BASE_URL, API_TIMEOUT


class SleeperAPIError(Exception):
    """Custom exception for Sleeper API errors"""
    pass


class SleeperAPI:
    """Helper class for Sleeper API calls with error handling and caching"""
    
    BASE_URL = SLEEPER_API_BASE_URL
    _players_cache = None
    _players_cache_time = None
    CACHE_DURATION = 3600  # 1 hour cache for player data
    
    @staticmethod
    def _make_request(endpoint: str, timeout: int = API_TIMEOUT) -> Optional[Dict]:
        """Make a request to the Sleeper API with error handling"""
        url = f"{SleeperAPI.BASE_URL}{endpoint}"
        
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
    
    @staticmethod
    def get_user(username: str) -> Optional[Dict]:
        """Get user info by username"""
        if not username or not isinstance(username, str):
            raise ValueError("Username must be a non-empty string")
        
        return SleeperAPI._make_request(f"/user/{username}")
    
    @staticmethod
    def get_user_leagues(user_id: str, season: str = "2025") -> List[Dict]:
        """Get all leagues for a user in a given season"""
        if not user_id:
            raise ValueError("User ID is required")
        
        if not season or not season.isdigit():
            raise ValueError("Season must be a valid year")
        
        result = SleeperAPI._make_request(f"/user/{user_id}/leagues/nfl/{season}", timeout=15)
        return result or []
    
    @staticmethod
    def get_draft_info(draft_id: str) -> Optional[Dict]:
        """Get draft information by draft ID"""
        if not draft_id:
            raise ValueError("Draft ID is required")
        
        return SleeperAPI._make_request(f"/draft/{draft_id}")
    
    @staticmethod
    def get_draft_picks(draft_id: str) -> List[Dict]:
        """Get all draft picks for a draft"""
        if not draft_id:
            raise ValueError("Draft ID is required")
        
        result = SleeperAPI._make_request(f"/draft/{draft_id}/picks", timeout=15)
        return result or []
    
    @staticmethod
    def get_league_drafts(league_id: str) -> List[Dict]:
        """Get all drafts for a league"""
        if not league_id:
            raise ValueError("League ID is required")
        
        result = SleeperAPI._make_request(f"/league/{league_id}/drafts")
        return result or []
    
    @staticmethod
    def get_league_info(league_id: str) -> Optional[Dict]:
        """Get league information"""
        if not league_id:
            raise ValueError("League ID is required")
        
        return SleeperAPI._make_request(f"/league/{league_id}")
    
    @staticmethod
    def get_league_rosters(league_id: str) -> List[Dict]:
        """Get all rosters for a league"""
        if not league_id:
            raise ValueError("League ID is required")
        
        result = SleeperAPI._make_request(f"/league/{league_id}/rosters")
        return result or []
    
    @staticmethod
    def get_league_users(league_id: str) -> List[Dict]:
        """Get all users in a league"""
        if not league_id:
            raise ValueError("League ID is required")
        
        result = SleeperAPI._make_request(f"/league/{league_id}/users")
        return result or []
    
    @staticmethod
    def get_all_players() -> Dict:
        """Get all NFL players with caching"""
        current_time = time.time()
        
        # Return cached data if still valid
        if (SleeperAPI._players_cache and SleeperAPI._players_cache_time and 
            current_time - SleeperAPI._players_cache_time < SleeperAPI.CACHE_DURATION):
            print(f"📊 Using cached player data ({len(SleeperAPI._players_cache)} players)")
            return SleeperAPI._players_cache
        
        print("📊 Fetching fresh player data from Sleeper API...")
        players_data = SleeperAPI._make_request("/players/nfl", timeout=30)
        
        if not players_data:
            raise SleeperAPIError("Empty player data received from Sleeper API")
        
        SleeperAPI._players_cache = players_data
        SleeperAPI._players_cache_time = current_time
        
        print(f"📊 Updated player cache with {len(players_data)} players")
        return players_data
    
    @staticmethod
    def detect_league_format(league_info: Dict) -> Tuple[str, str]:
        """
        Detect scoring format and league type from Sleeper league settings
        
        Returns:
            Tuple of (scoring_format, league_type)
            scoring_format: 'standard', 'half_ppr', or 'ppr'
            league_type: 'standard' or 'superflex'
        """
        if not league_info or not isinstance(league_info, dict):
            print("⚠️ No league info provided, using default format")
            return 'half_ppr', 'superflex'  # Safe default
        
        try:
            # Detect scoring format
            scoring_settings = league_info.get('scoring_settings', {})
            rec_points = scoring_settings.get('rec', 0)
            
            if rec_points == 0:
                scoring_format = 'standard'
            elif rec_points == 0.5:
                scoring_format = 'half_ppr'
            elif rec_points == 1.0:
                scoring_format = 'ppr'
            else:
                print(f"⚠️ Unusual PPR value: {rec_points}, defaulting to half_ppr")
                scoring_format = 'half_ppr'
            
            # Detect league type (standard vs superflex)
            roster_positions = league_info.get('roster_positions', [])
            qb_count = roster_positions.count('QB')
            has_superflex = 'SUPER_FLEX' in roster_positions
            
            if qb_count > 1 or has_superflex:
                league_type = 'superflex'
            else:
                league_type = 'standard'
            
            print(f"🏈 Detected league format: {scoring_format} {league_type}")
            print(f"   📊 Scoring: rec={rec_points} -> {scoring_format}")
            print(f"   🏟️  Roster: QB={qb_count}, SUPER_FLEX={has_superflex} -> {league_type}")
            
            return scoring_format, league_type
            
        except Exception as e:
            print(f"⚠️ Error in format detection: {e}, using default")
            return 'half_ppr', 'superflex'
    
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
                all_players = SleeperAPI.get_all_players()
            
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
    def get_drafted_players_with_names(draft_id: str) -> List[Dict]:
        """
        Get drafted players with resolved names and metadata
        
        Args:
            draft_id: Sleeper draft ID
            
        Returns:
            List of drafted players with names and metadata
        """
        try:
            # Get draft picks
            picks = SleeperAPI.get_draft_picks(draft_id)
            
            # Get all players for name resolution
            all_players = SleeperAPI.get_all_players()
            
            drafted_players = []
            for pick in picks:
                player_id = pick.get('player_id')
                if player_id:
                    player_data = all_players.get(player_id, {})
                    
                    # Create enhanced player info
                    player_info = {
                        'player_id': player_id,
                        'name': SleeperAPI.get_player_name(player_id, all_players) or f"Player {player_id}",
                        'position': player_data.get('position', 'Unknown'),
                        'team': player_data.get('team', 'N/A'),
                        'pick_number': pick.get('pick_no'),
                        'round': pick.get('round'),
                        'draft_slot': pick.get('draft_slot'),
                        'picked_by': pick.get('picked_by'),
                        'picked_at': pick.get('picked_at')
                    }
                    drafted_players.append(player_info)
            
            return drafted_players
            
        except Exception as e:
            raise SleeperAPIError(f"Failed to get drafted players with names: {str(e)}")
    
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
        """Determine if a league is dynasty or keeper"""
        if not league_info or not isinstance(league_info, dict):
            print("⚠️ No league info provided for dynasty/keeper detection")
            return False
        
        try:
            settings = league_info.get('settings', {})
            league_id = league_info.get('league_id')
            
            print(f"🔍 Checking dynasty/keeper for league {league_id}")
            
            # Check for dynasty indicators
            league_type = settings.get('type', 0)
            if league_type == 2:  # Dynasty league type
                print(f"🏰 Dynasty league detected: type={league_type}")
                return True
            
            # Check for taxi squad (dynasty feature)
            taxi_slots = settings.get('taxi_slots', 0)
            if taxi_slots > 0:
                print(f"🚕 Dynasty league detected: taxi_slots={taxi_slots}")
                return True
            
            # Check for actual keepers
            max_keepers = settings.get('max_keepers', 0)
            
            if max_keepers > 0 and league_id:
                try:
                    rosters = SleeperAPI.get_league_rosters(league_id)
                    actual_keepers = sum(len(roster.get('keepers', [])) for roster in rosters)
                    
                    if actual_keepers > 0:
                        print(f"🔒 Keeper league detected: {actual_keepers} actual keepers found")
                        return True
                    elif max_keepers > 1:
                        print(f"🔒 Keeper league assumed: max_keepers={max_keepers}")
                        return True
                        
                except Exception as e:
                    print(f"⚠️ Error checking keepers: {e}")
                    if max_keepers > 1:
                        return True
            
            # Check draft metadata
            draft_id = league_info.get('draft_id')
            if draft_id:
                try:
                    draft_info = SleeperAPI.get_draft_info(draft_id)
                    if (draft_info and 
                        draft_info.get('metadata', {}).get('scoring_type', '').startswith('dynasty')):
                        print(f"🏰 Dynasty league detected: draft metadata indicates dynasty")
                        return True
                except Exception as e:
                    print(f"⚠️ Error checking draft metadata: {e}")
            
            print(f"🏈 Redraft league detected: no dynasty/keeper indicators found")
            return False
            
        except Exception as e:
            print(f"⚠️ Error in dynasty/keeper detection: {e}")
            return False  # Default to redraft on error
