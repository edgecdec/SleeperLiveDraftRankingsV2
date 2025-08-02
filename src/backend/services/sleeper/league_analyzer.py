"""
League Analyzer Module

Handles league format detection and analysis
"""

from typing import Dict, List, Tuple
from .user_league_api import UserLeagueAPI
from .draft_api import DraftAPI


class LeagueAnalyzer:
    """Analyzes league settings and format"""
    
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
    def is_dynasty_or_keeper_league(league_info: Dict) -> bool:
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
                    rosters = UserLeagueAPI.get_league_rosters(league_id)
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
                    draft_info = DraftAPI.get_draft_info(draft_id)
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
    
    @staticmethod
    def get_rostered_players(league_id: str) -> List[str]:
        """
        Get all rostered player IDs in a league (for dynasty/keeper filtering)
        
        Args:
            league_id: Sleeper league ID
            
        Returns:
            List of player IDs that are currently rostered
        """
        try:
            rosters = UserLeagueAPI.get_league_rosters(league_id)
            rostered_players = set()
            
            for roster in rosters:
                # Add players from main roster
                players = roster.get('players', [])
                if players:
                    rostered_players.update(players)
                
                # Add players from taxi squad (dynasty feature)
                taxi = roster.get('taxi', [])
                if taxi:
                    rostered_players.update(taxi)
                
                # Add players from IR
                reserve = roster.get('reserve', [])
                if reserve:
                    rostered_players.update(reserve)
            
            print(f"🏰 Found {len(rostered_players)} rostered players in league {league_id}")
            return list(rostered_players)
            
        except Exception as e:
            print(f"⚠️ Error getting rostered players: {e}")
            return []
