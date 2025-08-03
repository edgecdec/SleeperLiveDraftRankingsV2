"""
Ranked Player Cache Manager for Fantasy Football Draft Assistant V2

This module handles caching of only the players that exist in our rankings system,
rather than all 11,387 NFL players. This is much more efficient.
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, Set, Optional
from pathlib import Path

from ..config import get_data_path


class RankedPlayerCache:
    """Manages caching of only ranked players to minimize storage and API calls"""
    
    def __init__(self):
        """Initialize the ranked player cache manager"""
        self.data_dir = get_data_path()
        self.cache_file = os.path.join(self.data_dir, 'ranked_players.json')
        self.metadata_file = os.path.join(self.data_dir, 'ranked_player_cache_metadata.json')
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
    
    def _get_cache_metadata(self) -> Dict:
        """Get cache metadata (last updated, etc.)"""
        try:
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"⚠️ Error reading ranked player cache metadata: {e}")
        
        return {
            'last_updated': 0,
            'player_count': 0,
            'version': '1.0'
        }
    
    def _save_cache_metadata(self, player_count: int, ranked_player_ids: Set[str]):
        """Save cache metadata"""
        try:
            metadata = {
                'last_updated': time.time(),
                'player_count': player_count,
                'ranked_player_count': len(ranked_player_ids),
                'version': '1.0',
                'last_updated_readable': datetime.now().isoformat(),
                'sample_player_ids': list(ranked_player_ids)[:10]  # First 10 for debugging
            }
            
            with open(self.metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except Exception as e:
            print(f"⚠️ Error saving ranked player cache metadata: {e}")
    
    def is_cache_valid(self, max_age_hours: int = 24) -> bool:
        """
        Check if the cached ranked player data is still valid
        
        Args:
            max_age_hours: Maximum age in hours before cache is considered stale
            
        Returns:
            True if cache is valid, False otherwise
        """
        try:
            # Check if cache file exists
            if not os.path.exists(self.cache_file):
                print("📊 No ranked player cache file found")
                return False
            
            # Check metadata
            metadata = self._get_cache_metadata()
            last_updated = metadata.get('last_updated', 0)
            
            if last_updated == 0:
                print("📊 No ranked player cache timestamp found")
                return False
            
            # Check age
            current_time = time.time()
            age_hours = (current_time - last_updated) / 3600
            
            if age_hours > max_age_hours:
                print(f"📊 Ranked player cache is {age_hours:.1f} hours old (max: {max_age_hours})")
                return False
            
            print(f"📊 Ranked player cache is {age_hours:.1f} hours old - still valid")
            return True
            
        except Exception as e:
            print(f"⚠️ Error checking ranked player cache validity: {e}")
            return False
    
    def load_cached_ranked_players(self) -> Optional[Dict]:
        """
        Load ranked player data from cache file
        
        Returns:
            Ranked player data dictionary or None if cache is invalid/missing
        """
        try:
            if not self.is_cache_valid():
                return None
            
            print("📊 Loading ranked player data from cache...")
            with open(self.cache_file, 'r') as f:
                ranked_players_data = json.load(f)
            
            print(f"📊 Loaded {len(ranked_players_data)} ranked players from cache")
            return ranked_players_data
            
        except Exception as e:
            print(f"⚠️ Error loading cached ranked players: {e}")
            return None
    
    def save_ranked_players_to_cache(self, all_players_data: Dict, ranked_player_ids: Set[str]) -> bool:
        """
        Save only ranked player data to cache file
        
        Args:
            all_players_data: Full dictionary of player data from Sleeper API
            ranked_player_ids: Set of player IDs that exist in our rankings
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Filter to only ranked players
            ranked_players_data = {
                player_id: player_data 
                for player_id, player_data in all_players_data.items()
                if player_id in ranked_player_ids
            }
            
            print(f"📊 Saving {len(ranked_players_data)} ranked players to cache (filtered from {len(all_players_data)} total players)...")
            
            # Save ranked player data
            with open(self.cache_file, 'w') as f:
                json.dump(ranked_players_data, f, separators=(',', ':'))  # Compact format
            
            # Save metadata
            self._save_cache_metadata(len(ranked_players_data), ranked_player_ids)
            
            # Get file size for logging
            file_size = os.path.getsize(self.cache_file) / (1024 * 1024)  # MB
            print(f"📊 Ranked player cache saved successfully ({file_size:.1f} MB)")
            
            return True
            
        except Exception as e:
            print(f"❌ Error saving ranked player cache: {e}")
            return False
    
    def get_ranked_player_ids_from_rankings(self) -> Set[str]:
        """
        Get player IDs from the rankings system
        
        Returns:
            Set of player IDs that exist in our rankings
        """
        try:
            # Try to get rankings manager to extract player IDs
            from ..rankings.SimpleRankingsManager import SimpleRankingsManager
            rankings_manager = SimpleRankingsManager()
            
            # Get all available formats and extract player IDs
            ranked_player_ids = set()
            
            try:
                formats = rankings_manager.get_available_formats()
                for format_name in formats:
                    try:
                        # Get players for this format (limit to get all)
                        players = rankings_manager.get_available_players(
                            drafted_players=set(),
                            league_format=format_name,
                            limit=2000  # High limit to get all ranked players
                        )
                        
                        for player in players:
                            if 'player_id' in player:
                                ranked_player_ids.add(player['player_id'])
                                
                    except Exception as e:
                        print(f"⚠️ Error getting players for format {format_name}: {e}")
                        continue
                        
            except Exception as e:
                print(f"⚠️ Error getting rankings formats: {e}")
            
            print(f"📊 Found {len(ranked_player_ids)} unique player IDs in rankings system")
            return ranked_player_ids
            
        except Exception as e:
            print(f"⚠️ Error extracting ranked player IDs: {e}")
            # Fallback to empty set - will cache all players if rankings unavailable
            return set()
    
    def get_cache_info(self) -> Dict:
        """
        Get information about the current ranked player cache
        
        Returns:
            Dictionary with cache information
        """
        metadata = self._get_cache_metadata()
        
        info = {
            'cache_exists': os.path.exists(self.cache_file),
            'cache_valid': self.is_cache_valid(),
            'last_updated': metadata.get('last_updated', 0),
            'player_count': metadata.get('player_count', 0),
            'ranked_player_count': metadata.get('ranked_player_count', 0),
            'cache_file': self.cache_file,
            'metadata_file': self.metadata_file,
            'cache_type': 'ranked_players_only'
        }
        
        # Add readable timestamp
        if info['last_updated'] > 0:
            info['last_updated_readable'] = datetime.fromtimestamp(
                info['last_updated']
            ).strftime('%Y-%m-%d %H:%M:%S')
        else:
            info['last_updated_readable'] = 'Never'
        
        # Add file size if exists
        if info['cache_exists']:
            try:
                file_size = os.path.getsize(self.cache_file) / (1024 * 1024)  # MB
                info['file_size_mb'] = round(file_size, 1)
            except:
                info['file_size_mb'] = 0
        
        return info
    
    def clear_cache(self) -> bool:
        """
        Clear the ranked player cache (delete files)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            files_removed = []
            
            if os.path.exists(self.cache_file):
                os.remove(self.cache_file)
                files_removed.append('ranked player data')
            
            if os.path.exists(self.metadata_file):
                os.remove(self.metadata_file)
                files_removed.append('metadata')
            
            if files_removed:
                print(f"📊 Cleared ranked player cache: {', '.join(files_removed)}")
            else:
                print("📊 No ranked player cache files to clear")
            
            return True
            
        except Exception as e:
            print(f"❌ Error clearing ranked player cache: {e}")
            return False


# Global cache instance
_ranked_player_cache = None

def get_ranked_player_cache() -> RankedPlayerCache:
    """Get the global ranked player cache instance"""
    global _ranked_player_cache
    if _ranked_player_cache is None:
        _ranked_player_cache = RankedPlayerCache()
    return _ranked_player_cache
