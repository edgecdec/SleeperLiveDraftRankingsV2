"""
Refactored Sleeper API Service

Main facade that combines all Sleeper API modules
"""

from typing import Dict, List, Optional, Tuple
from .sleeper.base_client import SleeperAPIError
from .sleeper.user_league_api import UserLeagueAPI
from .sleeper.draft_api import DraftAPI
from .sleeper.player_api import PlayerAPI
from .sleeper.league_analyzer import LeagueAnalyzer


class SleeperAPI:
    """
    Main Sleeper API facade that combines all functionality
    
    This class provides a unified interface to all Sleeper API operations
    while maintaining the same public API as the original monolithic version.
    """
    
    # Re-export the exception for backward compatibility
    SleeperAPIError = SleeperAPIError
    
    # User and League Operations
    @staticmethod
    def get_user(username: str) -> Optional[Dict]:
        """Get user info by username"""
        return UserLeagueAPI.get_user(username)
    
    @staticmethod
    def get_user_leagues(user_id: str, season: str = "2025") -> List[Dict]:
        """Get all leagues for a user in a given season"""
        return UserLeagueAPI.get_user_leagues(user_id, season)
    
    @staticmethod
    def get_league_info(league_id: str) -> Optional[Dict]:
        """Get league information"""
        return UserLeagueAPI.get_league_info(league_id)
    
    @staticmethod
    def get_league_rosters(league_id: str) -> List[Dict]:
        """Get all rosters for a league"""
        return UserLeagueAPI.get_league_rosters(league_id)
    
    @staticmethod
    def get_league_users(league_id: str) -> List[Dict]:
        """Get all users in a league"""
        return UserLeagueAPI.get_league_users(league_id)
    
    @staticmethod
    def get_league_drafts(league_id: str) -> List[Dict]:
        """Get all drafts for a league"""
        return UserLeagueAPI.get_league_drafts(league_id)
    
    # Draft Operations
    @staticmethod
    def get_draft_info(draft_id: str) -> Optional[Dict]:
        """Get draft information by draft ID"""
        return DraftAPI.get_draft_info(draft_id)
    
    @staticmethod
    def get_draft_picks(draft_id: str) -> List[Dict]:
        """Get all draft picks for a draft"""
        return DraftAPI.get_draft_picks(draft_id)
    
    # Player Operations
    @staticmethod
    def get_all_players() -> Dict:
        """Get all NFL players with caching"""
        return PlayerAPI.get_all_players()
    
    @staticmethod
    def get_player_name(player_id: str, all_players: Dict = None) -> Optional[str]:
        """Get player name from player ID"""
        return PlayerAPI.get_player_name(player_id, all_players)
    
    @staticmethod
    def create_player_from_sleeper_data(player_id: str, player_data: Dict) -> Dict:
        """Create a standardized player object from Sleeper data"""
        return PlayerAPI.create_player_from_sleeper_data(player_id, player_data)
    
    # League Analysis
    @staticmethod
    def detect_league_format(league_info: Dict) -> Tuple[str, str]:
        """Detect scoring format and league type from Sleeper league settings"""
        return LeagueAnalyzer.detect_league_format(league_info)
    
    @staticmethod
    def is_dynasty_or_keeper_league(league_info: Dict) -> bool:
        """Determine if a league is dynasty or keeper"""
        return LeagueAnalyzer.is_dynasty_or_keeper_league(league_info)
    
    @staticmethod
    def get_rostered_players(league_id: str) -> List[str]:
        """Get all rostered player IDs in a league (for dynasty/keeper filtering)"""
        return LeagueAnalyzer.get_rostered_players(league_id)
    
    # Complex Operations (combining multiple API calls)
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
            picks = DraftAPI.get_draft_picks(draft_id)
            
            # Get all players for name resolution
            all_players = PlayerAPI.get_all_players()
            
            drafted_players = []
            for pick in picks:
                player_id = pick.get('player_id')
                if player_id:
                    player_data = all_players.get(player_id, {})
                    
                    # Create enhanced player info
                    player_info = {
                        'player_id': player_id,
                        'player_name': PlayerAPI.get_player_name(player_id, all_players) or f"Player {player_id}",
                        'position': player_data.get('position', 'Unknown'),
                        'team': player_data.get('team', 'N/A'),
                        'pick_no': pick.get('pick_no'),
                        'round': pick.get('round'),
                        'draft_slot': pick.get('draft_slot'),
                        'drafted_by': pick.get('picked_by'),
                        'picked_at': pick.get('picked_at')
                    }
                    drafted_players.append(player_info)
            
            return drafted_players
            
        except Exception as e:
            raise SleeperAPIError(f"Failed to get drafted players with names: {str(e)}")
    
    @staticmethod
    def get_all_unavailable_players(draft_id: str, league_id: str = None) -> Tuple[List[str], bool]:
        """
        Get all unavailable players (drafted + rostered for dynasty)
        
        Args:
            draft_id: Sleeper draft ID
            league_id: Optional league ID (will be fetched from draft if not provided)
            
        Returns:
            Tuple of (unavailable_player_ids, is_dynasty_league)
        """
        try:
            unavailable_players = set()
            
            # Get drafted players
            drafted_players = SleeperAPI.get_drafted_players_with_names(draft_id)
            for player in drafted_players:
                if player.get('player_id'):
                    unavailable_players.add(player['player_id'])
            
            # Get league info if not provided
            if not league_id:
                draft_info = DraftAPI.get_draft_info(draft_id)
                league_id = draft_info.get('league_id') if draft_info else None
            
            is_dynasty = False
            if league_id:
                # Check if dynasty/keeper league
                league_info = UserLeagueAPI.get_league_info(league_id)
                if league_info:
                    is_dynasty = LeagueAnalyzer.is_dynasty_or_keeper_league(league_info)
                    
                    if is_dynasty:
                        print(f"🏰 Dynasty/Keeper league detected - filtering rostered players")
                        rostered_players = LeagueAnalyzer.get_rostered_players(league_id)
                        unavailable_players.update(rostered_players)
                    else:
                        print(f"🏈 Redraft league detected - only filtering drafted players")
            
            print(f"📊 Total unavailable players: {len(unavailable_players)} (drafted + rostered)")
            return list(unavailable_players), is_dynasty
            
        except Exception as e:
            print(f"⚠️ Error getting unavailable players: {e}")
            # Fallback to just drafted players
            try:
                drafted_players = SleeperAPI.get_drafted_players_with_names(draft_id)
                drafted_ids = [p.get('player_id') for p in drafted_players if p.get('player_id')]
                return drafted_ids, False
            except:
                return [], False
