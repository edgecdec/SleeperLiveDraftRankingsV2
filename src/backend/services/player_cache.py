"""
Player Data Cache Manager for Fantasy Football Draft Assistant V2

This module handles caching of Sleeper player data to JSON files to minimize API calls.
Player data should only be fetched once per day and saved locally.
"""

import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
from pathlib import Path

from ..config import get_data_path


class PlayerCache:
    """Manages player data caching to JSON files"""
    
    def __init__(self):
        """Initialize the player cache manager"""
        self.data_dir = get_data_path()
        self.cache_file = os.path.join(self.data_dir, 'sleeper_players.json')
        self.metadata_file = os.path.join(self.data_dir, 'player_cache_metadata.json')
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
    
    def _get_cache_metadata(self) -> Dict:
        """Get cache metadata (last updated, etc.)"""
        try:
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"⚠️ Error reading cache metadata: {e}")
        
        return {
            'last_updated': 0,
            'player_count': 0,
            'version': '1.0'
        }
    
    def _save_cache_metadata(self, player_count: int):
        """Save cache metadata"""
        try:
            metadata = {
                'last_updated': time.time(),
                'player_count': player_count,
                'version': '1.0',
                'last_updated_readable': datetime.now().isoformat()
            }
            
            with open(self.metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except Exception as e:
            print(f"⚠️ Error saving cache metadata: {e}")
    
    def is_cache_valid(self, max_age_hours: int = 24) -> bool:
        """
        Check if the cached player data is still valid
        
        Args:
            max_age_hours: Maximum age in hours before cache is considered stale
            
        Returns:
            True if cache is valid, False otherwise
        """
        try:
            # Check if cache file exists
            if not os.path.exists(self.cache_file):
                print("📊 No player cache file found")
                return False
            
            # Check metadata
            metadata = self._get_cache_metadata()
            last_updated = metadata.get('last_updated', 0)
            
            if last_updated == 0:
                print("📊 No cache timestamp found")
                return False
            
            # Check age
            current_time = time.time()
            age_hours = (current_time - last_updated) / 3600
            
            if age_hours > max_age_hours:
                print(f"📊 Player cache is {age_hours:.1f} hours old (max: {max_age_hours})")
                return False
            
            print(f"📊 Player cache is {age_hours:.1f} hours old - still valid")
            return True
            
        except Exception as e:
            print(f"⚠️ Error checking cache validity: {e}")
            return False
    
    def load_cached_players(self) -> Optional[Dict]:
        """
        Load player data from cache file
        
        Returns:
            Player data dictionary or None if cache is invalid/missing
        """
        try:
            if not self.is_cache_valid():
                return None
            
            print("📊 Loading player data from cache...")
            with open(self.cache_file, 'r') as f:
                players_data = json.load(f)
            
            print(f"📊 Loaded {len(players_data)} players from cache")
            return players_data
            
        except Exception as e:
            print(f"⚠️ Error loading cached players: {e}")
            return None
    
    def save_players_to_cache(self, players_data: Dict) -> bool:
        """
        Save player data to cache file
        
        Args:
            players_data: Dictionary of player data from Sleeper API
            
        Returns:
            True if successful, False otherwise
        """
        try:
            print(f"📊 Saving {len(players_data)} players to cache...")
            
            # Save player data
            with open(self.cache_file, 'w') as f:
                json.dump(players_data, f, separators=(',', ':'))  # Compact format
            
            # Save metadata
            self._save_cache_metadata(len(players_data))
            
            # Get file size for logging
            file_size = os.path.getsize(self.cache_file) / (1024 * 1024)  # MB
            print(f"📊 Player cache saved successfully ({file_size:.1f} MB)")
            
            return True
            
        except Exception as e:
            print(f"❌ Error saving player cache: {e}")
            return False
    
    def get_cache_info(self) -> Dict:
        """
        Get information about the current cache
        
        Returns:
            Dictionary with cache information
        """
        metadata = self._get_cache_metadata()
        
        info = {
            'cache_exists': os.path.exists(self.cache_file),
            'cache_valid': self.is_cache_valid(),
            'last_updated': metadata.get('last_updated', 0),
            'player_count': metadata.get('player_count', 0),
            'cache_file': self.cache_file,
            'metadata_file': self.metadata_file
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
        Clear the player cache (delete files)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            files_removed = []
            
            if os.path.exists(self.cache_file):
                os.remove(self.cache_file)
                files_removed.append('player data')
            
            if os.path.exists(self.metadata_file):
                os.remove(self.metadata_file)
                files_removed.append('metadata')
            
            if files_removed:
                print(f"📊 Cleared player cache: {', '.join(files_removed)}")
            else:
                print("📊 No cache files to clear")
            
            return True
            
        except Exception as e:
            print(f"❌ Error clearing cache: {e}")
            return False


# Global cache instance
_player_cache = None

def get_player_cache() -> PlayerCache:
    """Get the global player cache instance"""
    global _player_cache
    if _player_cache is None:
        _player_cache = PlayerCache()
    return _player_cache
