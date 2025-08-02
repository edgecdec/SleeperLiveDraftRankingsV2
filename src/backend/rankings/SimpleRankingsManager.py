#!/usr/bin/env python3
"""
Simplified Rankings Manager for Fantasy Football Draft Assistant V2

This version works with existing CSV files and doesn't require external scraping.
It provides the core functionality needed for draft assistance.
"""

import os
import sys
import json
import pandas as pd
from typing import Dict, Optional, List, Any
from pathlib import Path

class SimpleRankingsManager:
    """
    Simplified rankings manager that works with existing CSV files
    """
    
    def __init__(self, data_path: Optional[str] = None):
        """
        Initialize the rankings manager
        
        Args:
            data_path: Path to the data directory (optional)
        """
        self.data_path = data_path or self._get_data_path()
        self.rankings_cache = {}
        self.last_updated = None
        self.total_players = 0
        
        # Load available rankings
        self._load_available_rankings()
    
    def _get_data_path(self) -> str:
        """Get the path to the data directory"""
        if hasattr(sys, '_MEIPASS'):
            # PyInstaller executable
            return os.path.join(sys._MEIPASS, 'data')
        else:
            # Development mode
            current_dir = os.path.dirname(os.path.abspath(__file__))
            return os.path.join(current_dir, '..', '..', '..', 'data')
    
    def _load_available_rankings(self):
        """Load and cache available ranking files"""
        try:
            data_dir = Path(self.data_path)
            if not data_dir.exists():
                print(f"⚠️ Data directory not found: {data_dir}")
                return
            
            # Find all CSV files
            csv_files = list(data_dir.glob('*.csv'))
            print(f"📊 Found {len(csv_files)} ranking files")
            
            for csv_file in csv_files:
                try:
                    # Parse filename to determine format
                    filename = csv_file.stem
                    format_key = self._parse_filename_to_format(filename)
                    
                    if format_key:
                        # Load the CSV
                        df = pd.read_csv(csv_file)
                        self.rankings_cache[format_key] = df
                        self.total_players = max(self.total_players, len(df))
                        print(f"✅ Loaded {format_key}: {len(df)} players")
                
                except Exception as e:
                    print(f"⚠️ Error loading {csv_file}: {e}")
            
            self.last_updated = "Static files loaded"
            
        except Exception as e:
            print(f"⚠️ Error loading rankings: {e}")
    
    def _parse_filename_to_format(self, filename: str) -> Optional[str]:
        """
        Parse filename to determine league format
        
        Args:
            filename: CSV filename without extension
            
        Returns:
            Format key or None if not recognized
        """
        filename_lower = filename.lower()
        
        # Map filename patterns to format keys
        format_mappings = {
            'fantasypros_rankings_half_ppr_standard': 'half_ppr_standard',
            'fantasypros_rankings_half_ppr_superflex': 'half_ppr_superflex',
            'fantasypros_rankings_ppr_standard': 'ppr_standard',
            'fantasypros_rankings_ppr_superflex': 'ppr_superflex',
            'fantasypros_rankings_standard_standard': 'standard_standard',
            'fantasypros_rankings_standard_superflex': 'standard_superflex'
        }
        
        for pattern, format_key in format_mappings.items():
            if pattern in filename_lower:
                return format_key
        
        # Check for custom rankings
        if 'custom' in filename_lower:
            return 'custom'
        
        return None
    
    def get_available_formats(self) -> List[str]:
        """
        Get list of available ranking formats
        
        Returns:
            List of available format keys
        """
        return list(self.rankings_cache.keys())
    
    def get_available_players(self, 
                            drafted_players: List[str] = None,
                            league_format: str = None,
                            position_filter: str = None,
                            limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get available players based on criteria with Sleeper integration
        
        Args:
            drafted_players: List of drafted player IDs
            league_format: League format key
            position_filter: Position to filter by
            limit: Maximum number of players to return
            
        Returns:
            List of available players with rankings
        """
        try:
            # Import here to avoid circular imports
            from ..services.sleeper_api import SleeperAPI
            
            # Use default format if not specified
            if not league_format or league_format not in self.rankings_cache:
                available_formats = self.get_available_formats()
                if not available_formats:
                    return []
                league_format = available_formats[0]  # Use first available
            
            # Get rankings dataframe
            df = self.rankings_cache[league_format].copy()
            
            # Get Sleeper player data for name matching
            try:
                sleeper_players = SleeperAPI.get_all_players()
                print(f"📊 Loaded {len(sleeper_players)} Sleeper players for matching")
            except Exception as e:
                print(f"⚠️ Could not load Sleeper players: {e}")
                sleeper_players = {}
            
            # Convert drafted players to set for faster lookup
            drafted_set = set(drafted_players or [])
            
            # Filter out drafted players by matching names
            if drafted_players and sleeper_players:
                # Get names of drafted players
                drafted_names = set()
                for player_id in drafted_players:
                    player_data = sleeper_players.get(player_id, {})
                    if player_data:
                        first_name = player_data.get('first_name', '')
                        last_name = player_data.get('last_name', '')
                        name = f"{first_name} {last_name}".strip()
                        if name:
                            drafted_names.add(name.upper())
                            # Also add variations
                            drafted_names.add(f"{last_name}, {first_name}".upper())
                            drafted_names.add(f"{first_name[0]}. {last_name}".upper() if first_name else "")
                
                # Filter out drafted players by name matching
                if drafted_names:
                    def is_drafted(row):
                        player_name = self._get_player_name(row).upper()
                        # Check exact match and common variations
                        return (player_name in drafted_names or
                                any(drafted_name in player_name or player_name in drafted_name 
                                    for drafted_name in drafted_names if len(drafted_name) > 3))
                    
                    df = df[~df.apply(is_drafted, axis=1)]
            
            # Filter by position if specified
            if position_filter:
                position_columns = ['Position', 'Pos', 'position']
                position_col = None
                for col in position_columns:
                    if col in df.columns:
                        position_col = col
                        break
                
                if position_col:
                    df = df[df[position_col].str.upper() == position_filter.upper()]
            
            # Sort by rank if available
            rank_columns = ['Rank', 'Overall', 'rank', 'overall']
            rank_col = None
            for col in rank_columns:
                if col in df.columns:
                    rank_col = col
                    break
            
            if rank_col:
                df = df.sort_values(rank_col)
            
            # Limit results
            df = df.head(limit)
            
            # Convert to list of dictionaries with enhanced data
            players = []
            for _, row in df.iterrows():
                player_name = self._get_player_name(row)
                
                # Try to find matching Sleeper player for additional data
                sleeper_match = self._find_sleeper_match(player_name, sleeper_players)
                
                player_info = {
                    'name': player_name,
                    'position': self._get_player_position(row),
                    'team': self._get_player_team(row),
                    'rank': self._get_player_rank(row),
                    'tier': self._get_player_tier(row),
                    'bye_week': self._get_player_bye(row)
                }
                
                # Add Sleeper data if found
                if sleeper_match:
                    player_info.update({
                        'player_id': sleeper_match['id'],
                        'sleeper_team': sleeper_match.get('team', player_info['team']),
                        'injury_status': sleeper_match.get('injury_status'),
                        'years_exp': sleeper_match.get('years_exp', 0)
                    })
                
                players.append(player_info)
            
            return players
            
        except Exception as e:
            print(f"⚠️ Error getting available players: {e}")
            return []
    
    def _find_sleeper_match(self, player_name: str, sleeper_players: Dict) -> Optional[Dict]:
        """
        Find matching Sleeper player by name
        
        Args:
            player_name: Player name from rankings
            sleeper_players: Dictionary of Sleeper players
            
        Returns:
            Matching Sleeper player data or None
        """
        if not player_name or not sleeper_players:
            return None
        
        player_name_clean = player_name.upper().strip()
        
        # Try exact matches first
        for player_id, player_data in sleeper_players.items():
            if not player_data:
                continue
                
            first_name = player_data.get('first_name', '').upper()
            last_name = player_data.get('last_name', '').upper()
            full_name = f"{first_name} {last_name}".strip()
            
            if full_name == player_name_clean:
                return {**player_data, 'id': player_id}
        
        # Try partial matches
        for player_id, player_data in sleeper_players.items():
            if not player_data:
                continue
                
            first_name = player_data.get('first_name', '').upper()
            last_name = player_data.get('last_name', '').upper()
            
            # Check if last name matches and first name starts with same letter
            if (last_name and last_name in player_name_clean and
                first_name and len(first_name) > 0 and len(player_name_clean) > 0 and
                first_name[0] == player_name_clean[0]):
                return {**player_data, 'id': player_id}
        
        return None
    
    def _get_player_name(self, row) -> str:
        """Extract player name from row"""
        name_columns = ['Player', 'Name', 'player', 'name']
        for col in name_columns:
            if col in row and pd.notna(row[col]):
                return str(row[col])
        return "Unknown Player"
    
    def _get_player_position(self, row) -> str:
        """Extract player position from row"""
        pos_columns = ['Position', 'Pos', 'position', 'pos']
        for col in pos_columns:
            if col in row and pd.notna(row[col]):
                return str(row[col])
        return "Unknown"
    
    def _get_player_team(self, row) -> str:
        """Extract player team from row"""
        team_columns = ['Team', 'Tm', 'team', 'tm']
        for col in team_columns:
            if col in row and pd.notna(row[col]):
                return str(row[col])
        return "Unknown"
    
    def _get_player_rank(self, row) -> int:
        """Extract player rank from row"""
        rank_columns = ['Rank', 'Overall', 'rank', 'overall']
        for col in rank_columns:
            if col in row and pd.notna(row[col]):
                try:
                    return int(row[col])
                except (ValueError, TypeError):
                    pass
        return 999  # Default high rank
    
    def _get_player_tier(self, row) -> int:
        """Extract or calculate player tier from row"""
        tier_columns = ['Tier', 'tier']
        for col in tier_columns:
            if col in row and pd.notna(row[col]):
                try:
                    return int(row[col])
                except (ValueError, TypeError):
                    pass
        
        # Calculate tier based on rank
        rank = self._get_player_rank(row)
        if rank <= 12:
            return 1
        elif rank <= 24:
            return 2
        elif rank <= 36:
            return 3
        elif rank <= 60:
            return 4
        else:
            return 5
    
    def _get_player_bye(self, row) -> Optional[int]:
        """Extract player bye week from row"""
        bye_columns = ['Bye', 'ByeWeek', 'bye', 'bye_week']
        for col in bye_columns:
            if col in row and pd.notna(row[col]):
                try:
                    return int(row[col])
                except (ValueError, TypeError):
                    pass
        return None
    
    def get_best_available_by_position(self, 
                                     drafted_players: List[str] = None,
                                     league_format: str = None,
                                     positions: List[str] = None,
                                     count: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get best available players by position
        
        Args:
            drafted_players: List of drafted player IDs
            league_format: League format key
            positions: List of positions to get players for
            count: Number of players per position
            
        Returns:
            Dictionary mapping positions to lists of players
        """
        positions = positions or ['QB', 'RB', 'WR', 'TE']
        result = {}
        
        for position in positions:
            players = self.get_available_players(
                drafted_players=drafted_players,
                league_format=league_format,
                position_filter=position,
                limit=count
            )
            result[position] = players
        
        return result
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get rankings system status
        
        Returns:
            Status information dictionary
        """
        return {
            'initialized': True,
            'available_formats': self.get_available_formats(),
            'last_updated': self.last_updated,
            'total_players': self.total_players,
            'data_path': self.data_path
        }
