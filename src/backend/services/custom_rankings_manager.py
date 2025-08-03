"""
Custom Rankings Manager for Fantasy Football Draft Assistant V2

This module handles user-uploaded custom rankings files and integrates them
with the existing rankings system.

Part of Sprint 4: User Experience implementation.
"""

import csv
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import tempfile

from ..config import get_data_path


class CustomRankingsManager:
    """Manages user-uploaded custom rankings files"""
    
    def __init__(self):
        """Initialize the custom rankings manager"""
        self.data_dir = get_data_path()
        self.custom_rankings_dir = os.path.join(self.data_dir, 'custom_rankings')
        self.metadata_file = os.path.join(self.custom_rankings_dir, 'rankings_metadata.json')
        
        # Ensure directories exist
        os.makedirs(self.custom_rankings_dir, exist_ok=True)
        
        # Supported CSV formats
        self.supported_formats = {
            'standard': {
                'required_columns': ['name', 'position'],
                'optional_columns': ['rank', 'tier', 'team', 'bye_week', 'notes'],
                'description': 'Standard format with name and position'
            },
            'fantasypros': {
                'required_columns': ['player_name', 'pos'],
                'optional_columns': ['rank', 'tier', 'team', 'bye'],
                'description': 'FantasyPros export format',
                'column_mapping': {
                    'player_name': 'name',
                    'pos': 'position',
                    'bye': 'bye_week'
                }
            },
            'espn': {
                'required_columns': ['PLAYER', 'POS'],
                'optional_columns': ['RK', 'TIER', 'TEAM', 'BYE'],
                'description': 'ESPN export format',
                'column_mapping': {
                    'PLAYER': 'name',
                    'POS': 'position',
                    'RK': 'rank',
                    'TIER': 'tier',
                    'TEAM': 'team',
                    'BYE': 'bye_week'
                }
            }
        }
    
    def upload_rankings_file(self, file_content: str, filename: str, 
                           format_type: str = 'auto', user_id: str = 'default') -> Dict:
        """
        Upload and process a custom rankings CSV file
        
        Args:
            file_content: CSV file content as string
            filename: Original filename
            format_type: Format type ('auto', 'standard', 'fantasypros', 'espn')
            user_id: User identifier for file organization
            
        Returns:
            Dictionary with upload results and processed data
        """
        try:
            # Create user directory
            user_dir = os.path.join(self.custom_rankings_dir, user_id)
            os.makedirs(user_dir, exist_ok=True)
            
            # Parse CSV content
            parsed_data = self._parse_csv_content(file_content, format_type)
            
            if 'error' in parsed_data:
                return parsed_data
            
            # Validate and process players
            processed_players = self._process_player_data(parsed_data['players'])
            
            if 'error' in processed_players:
                return processed_players
            
            # Generate unique file ID
            file_id = self._generate_file_id(filename)
            
            # Save processed rankings
            rankings_file = os.path.join(user_dir, f'{file_id}.json')
            rankings_data = {
                'file_id': file_id,
                'original_filename': filename,
                'format_type': parsed_data['detected_format'],
                'upload_date': datetime.now().isoformat(),
                'user_id': user_id,
                'total_players': len(processed_players['players']),
                'position_counts': processed_players['position_counts'],
                'players': processed_players['players']
            }
            
            with open(rankings_file, 'w') as f:
                json.dump(rankings_data, f, indent=2)
            
            # Update metadata
            self._update_metadata(user_id, file_id, rankings_data)
            
            return {
                'status': 'success',
                'file_id': file_id,
                'message': f'Successfully uploaded {len(processed_players["players"])} players',
                'data': {
                    'total_players': len(processed_players['players']),
                    'position_counts': processed_players['position_counts'],
                    'format_detected': parsed_data['detected_format'],
                    'filename': filename
                }
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Upload failed: {str(e)}',
                'code': 'UPLOAD_ERROR'
            }
    
    def _parse_csv_content(self, content: str, format_type: str) -> Dict:
        """Parse CSV content and detect format"""
        try:
            # Split content into lines
            lines = content.strip().split('\n')
            if len(lines) < 2:
                return {'error': 'CSV file must have at least a header and one data row'}
            
            # Parse CSV
            csv_reader = csv.DictReader(lines)
            rows = list(csv_reader)
            
            if not rows:
                return {'error': 'No data rows found in CSV file'}
            
            # Detect format if auto
            detected_format = format_type
            if format_type == 'auto':
                detected_format = self._detect_csv_format(csv_reader.fieldnames)
            
            if detected_format not in self.supported_formats:
                return {
                    'error': f'Unsupported format: {detected_format}',
                    'supported_formats': list(self.supported_formats.keys())
                }
            
            # Validate required columns
            format_config = self.supported_formats[detected_format]
            required_columns = format_config['required_columns']
            
            missing_columns = [col for col in required_columns if col not in csv_reader.fieldnames]
            if missing_columns:
                return {
                    'error': f'Missing required columns: {missing_columns}',
                    'required_columns': required_columns,
                    'found_columns': list(csv_reader.fieldnames)
                }
            
            return {
                'players': rows,
                'detected_format': detected_format,
                'columns': list(csv_reader.fieldnames),
                'total_rows': len(rows)
            }
            
        except Exception as e:
            return {'error': f'CSV parsing failed: {str(e)}'}
    
    def _detect_csv_format(self, columns: List[str]) -> str:
        """Auto-detect CSV format based on column names"""
        if not columns:
            return 'standard'
        
        columns_lower = [col.lower() for col in columns]
        
        # Check for FantasyPros format
        if 'player_name' in columns_lower and 'pos' in columns_lower:
            return 'fantasypros'
        
        # Check for ESPN format
        if 'PLAYER' in columns and 'POS' in columns:
            return 'espn'
        
        # Default to standard
        return 'standard'
    
    def _process_player_data(self, raw_players: List[Dict]) -> Dict:
        """Process and validate player data"""
        try:
            processed_players = []
            position_counts = {}
            errors = []
            
            for i, raw_player in enumerate(raw_players):
                try:
                    # Apply column mapping if needed
                    player = self._apply_column_mapping(raw_player)
                    
                    # Validate required fields
                    if not player.get('name') or not player.get('name').strip():
                        errors.append(f'Row {i+2}: Missing player name')
                        continue
                    
                    if not player.get('position') or not player.get('position').strip():
                        errors.append(f'Row {i+2}: Missing position for {player.get("name", "unknown")}')
                        continue
                    
                    # Clean and standardize data
                    processed_player = {
                        'name': player['name'].strip(),
                        'position': self._standardize_position(player['position'].strip()),
                        'rank': self._safe_int(player.get('rank')),
                        'tier': self._safe_int(player.get('tier')),
                        'team': player.get('team', '').strip().upper() if player.get('team') else None,
                        'bye_week': self._safe_int(player.get('bye_week')),
                        'notes': player.get('notes', '').strip() if player.get('notes') else None,
                        'custom_ranking': True,
                        'original_row': i + 2  # For error reporting
                    }
                    
                    # Count positions
                    pos = processed_player['position']
                    position_counts[pos] = position_counts.get(pos, 0) + 1
                    
                    processed_players.append(processed_player)
                    
                except Exception as e:
                    errors.append(f'Row {i+2}: Processing error - {str(e)}')
            
            if not processed_players:
                return {'error': 'No valid players found in CSV file', 'errors': errors}
            
            # Sort by rank if available, otherwise by position and name
            processed_players.sort(key=lambda x: (
                x.get('rank') or 999,
                x['position'],
                x['name']
            ))
            
            result = {
                'players': processed_players,
                'position_counts': position_counts,
                'total_processed': len(processed_players),
                'total_errors': len(errors)
            }
            
            if errors:
                result['errors'] = errors[:10]  # Limit error messages
                if len(errors) > 10:
                    result['errors'].append(f'... and {len(errors) - 10} more errors')
            
            return result
            
        except Exception as e:
            return {'error': f'Player data processing failed: {str(e)}'}
    
    def _apply_column_mapping(self, raw_player: Dict) -> Dict:
        """Apply column mapping based on detected format"""
        # This would be enhanced based on the detected format
        # For now, return as-is since we handle mapping in detection
        return raw_player
    
    def _standardize_position(self, position: str) -> str:
        """Standardize position names"""
        position_map = {
            'QB': 'QB',
            'RB': 'RB', 
            'WR': 'WR',
            'TE': 'TE',
            'K': 'K',
            'DEF': 'DEF',
            'DST': 'DEF',  # Defense/Special Teams
            'D/ST': 'DEF',
            'PK': 'K',     # Place Kicker
            'FLEX': 'FLEX'
        }
        
        pos_upper = position.upper()
        return position_map.get(pos_upper, pos_upper)
    
    def _safe_int(self, value) -> Optional[int]:
        """Safely convert value to integer"""
        if value is None or value == '':
            return None
        try:
            return int(float(str(value)))  # Handle decimal strings
        except (ValueError, TypeError):
            return None
    
    def _generate_file_id(self, filename: str) -> str:
        """Generate unique file ID"""
        timestamp = int(time.time())
        clean_name = ''.join(c for c in filename if c.isalnum() or c in '._-')[:20]
        return f"{clean_name}_{timestamp}"
    
    def _update_metadata(self, user_id: str, file_id: str, rankings_data: Dict):
        """Update rankings metadata file"""
        try:
            # Load existing metadata
            metadata = {}
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'r') as f:
                    metadata = json.load(f)
            
            # Update user metadata
            if user_id not in metadata:
                metadata[user_id] = {}
            
            metadata[user_id][file_id] = {
                'filename': rankings_data['original_filename'],
                'upload_date': rankings_data['upload_date'],
                'total_players': rankings_data['total_players'],
                'position_counts': rankings_data['position_counts'],
                'format_type': rankings_data['format_type']
            }
            
            # Save metadata
            with open(self.metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except Exception as e:
            print(f"⚠️ Failed to update metadata: {e}")
    
    def get_user_rankings(self, user_id: str = 'default') -> List[Dict]:
        """Get all rankings files for a user"""
        try:
            if not os.path.exists(self.metadata_file):
                return []
            
            with open(self.metadata_file, 'r') as f:
                metadata = json.load(f)
            
            user_metadata = metadata.get(user_id, {})
            
            rankings_list = []
            for file_id, file_info in user_metadata.items():
                rankings_list.append({
                    'file_id': file_id,
                    'filename': file_info['filename'],
                    'upload_date': file_info['upload_date'],
                    'total_players': file_info['total_players'],
                    'position_counts': file_info['position_counts'],
                    'format_type': file_info['format_type']
                })
            
            # Sort by upload date (newest first)
            rankings_list.sort(key=lambda x: x['upload_date'], reverse=True)
            
            return rankings_list
            
        except Exception as e:
            print(f"⚠️ Error getting user rankings: {e}")
            return []
    
    def get_rankings_data(self, file_id: str, user_id: str = 'default') -> Optional[Dict]:
        """Get specific rankings file data"""
        try:
            user_dir = os.path.join(self.custom_rankings_dir, user_id)
            rankings_file = os.path.join(user_dir, f'{file_id}.json')
            
            if not os.path.exists(rankings_file):
                return None
            
            with open(rankings_file, 'r') as f:
                return json.load(f)
                
        except Exception as e:
            print(f"⚠️ Error loading rankings data: {e}")
            return None
    
    def delete_rankings(self, file_id: str, user_id: str = 'default') -> bool:
        """Delete a rankings file"""
        try:
            # Delete file
            user_dir = os.path.join(self.custom_rankings_dir, user_id)
            rankings_file = os.path.join(user_dir, f'{file_id}.json')
            
            if os.path.exists(rankings_file):
                os.remove(rankings_file)
            
            # Update metadata
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                if user_id in metadata and file_id in metadata[user_id]:
                    del metadata[user_id][file_id]
                    
                    with open(self.metadata_file, 'w') as f:
                        json.dump(metadata, f, indent=2)
            
            return True
            
        except Exception as e:
            print(f"⚠️ Error deleting rankings: {e}")
            return False
    
    def get_supported_formats(self) -> Dict:
        """Get information about supported CSV formats"""
        return {
            'formats': self.supported_formats,
            'examples': {
                'standard': 'name,position,rank,tier,team,bye_week\nJosh Allen,QB,1,1,BUF,7',
                'fantasypros': 'player_name,pos,rank,tier,team,bye\nJosh Allen,QB,1,1,BUF,7',
                'espn': 'PLAYER,POS,RK,TIER,TEAM,BYE\nJosh Allen,QB,1,1,BUF,7'
            }
        }
