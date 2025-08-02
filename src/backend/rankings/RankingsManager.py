#!/usr/bin/env python3
"""
Comprehensive Rankings Manager for FantasyPros Integration
Handles automatic updates, league format detection, ranking selection, and custom uploads
"""

import os
import sys
import time
import threading
import shutil
import json
from datetime import datetime, timedelta
import pandas as pd
from typing import Dict, Optional, Tuple, List
from werkzeug.utils import secure_filename

# Add path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from PopulateFromSites.FantasyProsSeleniumV3 import FantasyProsSeleniumV3
from Constants import RANKINGS_OUTPUT_DIRECTORY

# Custom rankings directory
CUSTOM_RANKINGS_DIRECTORY = "backend/rankings/Custom/"
CUSTOM_RANKINGS_METADATA_FILE = "backend/rankings/custom_rankings_metadata.json"

class RankingsManager:
    """
    Manages FantasyPros rankings with automatic updates, format detection, and custom uploads
    """
    
    def __init__(self):
        self.rankings_cache = {}
        self.last_update_time = None
        self.update_in_progress = False
        self.custom_metadata = {}
        
        # FantasyPros formats - simple filenames, no versions
        self.available_formats = {
            'standard': {
                'standard': 'FantasyPros_Rankings_standard_standard.csv',
                'superflex': 'FantasyPros_Rankings_standard_superflex.csv'
            },
            'half_ppr': {
                'standard': 'FantasyPros_Rankings_half_ppr_standard.csv', 
                'superflex': 'FantasyPros_Rankings_half_ppr_superflex.csv'
            },
            'ppr': {
                'standard': 'FantasyPros_Rankings_ppr_standard.csv',
                'superflex': 'FantasyPros_Rankings_ppr_superflex.csv'
            }
        }
        
        # Ensure custom directory exists
        self._ensure_custom_directory()
        self._load_custom_metadata()
        
        # Initialize last_update_time based on existing files if not set
        self._initialize_update_time()
        
    def _initialize_update_time(self):
        """Initialize last_update_time based on existing rankings files"""
        if self.last_update_time is not None:
            return  # Already set
        
        # Find the most recent rankings file
        most_recent_time = None
        for scoring_format in self.available_formats:
            for league_type in self.available_formats[scoring_format]:
                filename = self.available_formats[scoring_format][league_type]
                filepath = f"{RANKINGS_OUTPUT_DIRECTORY}{filename}"
                
                if os.path.exists(filepath):
                    file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                    if most_recent_time is None or file_time > most_recent_time:
                        most_recent_time = file_time
        
        if most_recent_time:
            self.last_update_time = most_recent_time
            print(f"📅 Initialized last_update_time from existing files: {most_recent_time}")
    
    def _ensure_custom_directory(self):
        """Ensure custom rankings directory exists"""
        if not os.path.exists(CUSTOM_RANKINGS_DIRECTORY):
            os.makedirs(CUSTOM_RANKINGS_DIRECTORY)
            print(f"📁 Created custom rankings directory: {CUSTOM_RANKINGS_DIRECTORY}")
    
    def _load_custom_metadata(self):
        """Load custom rankings metadata"""
        try:
            if os.path.exists(CUSTOM_RANKINGS_METADATA_FILE):
                with open(CUSTOM_RANKINGS_METADATA_FILE, 'r') as f:
                    self.custom_metadata = json.load(f)
            else:
                self.custom_metadata = {}
        except Exception as e:
            print(f"⚠️  Error loading custom metadata: {e}")
            self.custom_metadata = {}
    
    def _save_custom_metadata(self):
        """Save custom rankings metadata"""
        try:
            with open(CUSTOM_RANKINGS_METADATA_FILE, 'w') as f:
                json.dump(self.custom_metadata, f, indent=2)
        except Exception as e:
            print(f"⚠️  Error saving custom metadata: {e}")
    
    def upload_custom_rankings(self, file_obj, display_name: str, 
                             description: str = "", scoring_format: str = "custom", 
                             league_type: str = "custom") -> Dict:
        """
        Upload and validate custom rankings file
        
        Args:
            file_obj: Flask FileStorage object or file path string
            display_name: User-friendly name for the rankings
            description: Optional description
            scoring_format: Scoring format (for organization)
            league_type: League type (for organization)
        
        Returns:
            Dict with success status and details
        """
        try:
            # Generate unique filename and paths first
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = secure_filename(display_name.replace(' ', '_'))
            filename = f"custom_{safe_name}_{timestamp}.csv"
            destination_path = os.path.join(CUSTOM_RANKINGS_DIRECTORY, filename)
            
            # Track original filename for metadata
            original_filename = None
            validation_result = None
            
            # Handle both FileStorage objects and file paths
            if hasattr(file_obj, 'filename'):
                # It's a FileStorage object from Flask
                original_filename = file_obj.filename
                temp_path = None
                try:
                    # Create temporary file to validate
                    import tempfile
                    temp_fd, temp_path = tempfile.mkstemp(suffix='.csv')
                    file_obj.save(temp_path)
                    os.close(temp_fd)
                    
                    # Validate CSV format using temporary file
                    validation_result = self._validate_rankings_file(temp_path)
                    if not validation_result['valid']:
                        return {'success': False, 'error': validation_result['error']}
                    
                    # Copy validated file to custom directory
                    shutil.copy2(temp_path, destination_path)
                    
                finally:
                    # Clean up temporary file
                    if temp_path and os.path.exists(temp_path):
                        os.unlink(temp_path)
                        
            else:
                # It's a file path string (legacy support)
                file_path = str(file_obj)
                original_filename = os.path.basename(file_path)
                
                # Validate file exists
                if not os.path.exists(file_path):
                    return {'success': False, 'error': 'File not found'}
                
                # Validate CSV format
                validation_result = self._validate_rankings_file(file_path)
                if not validation_result['valid']:
                    return {'success': False, 'error': validation_result['error']}
                
                # Copy file to custom directory
                shutil.copy2(file_path, destination_path)
            
            # Create metadata entry
            file_id = f"custom_{timestamp}_{safe_name}"
            metadata = {
                'id': file_id,
                'filename': filename,
                'display_name': display_name,
                'description': description,
                'scoring_format': scoring_format,
                'league_type': league_type,
                'upload_time': datetime.now().isoformat(),
                'file_size': os.path.getsize(destination_path),
                'player_count': validation_result['player_count'],
                'original_filename': original_filename
            }
            
            # Save metadata
            self.custom_metadata[file_id] = metadata
            self._save_custom_metadata()
            
            print(f"✅ Custom rankings uploaded: {display_name}")
            print(f"   File: {filename}")
            print(f"   Players: {validation_result['player_count']}")
            
            return {
                'success': True,
                'file_id': file_id,
                'filename': filename,
                'metadata': metadata
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Upload failed: {str(e)}'}
    
    def _validate_rankings_file(self, file_path: str) -> Dict:
        """
        Validate that uploaded file is a proper rankings CSV
        
        Returns:
            Dict with validation results
        """
        try:
            # Try to read as CSV
            df = pd.read_csv(file_path)
            
            # Check for required columns (flexible naming)
            required_columns = ['name', 'position']
            column_mapping = {}
            
            # Map columns (case-insensitive)
            df_columns_lower = [col.lower() for col in df.columns]
            
            for req_col in required_columns:
                found = False
                for i, col in enumerate(df_columns_lower):
                    if req_col in col or col in req_col:
                        column_mapping[req_col] = df.columns[i]
                        found = True
                        break
                
                if not found:
                    return {
                        'valid': False,
                        'error': f'Missing required column: {req_col}. Found columns: {list(df.columns)}'
                    }
            
            # Check for reasonable data
            if len(df) < 10:
                return {
                    'valid': False,
                    'error': f'File contains too few players ({len(df)}). Expected at least 10.'
                }
            
            if len(df) > 1000:
                return {
                    'valid': False,
                    'error': f'File contains too many players ({len(df)}). Expected at most 1000.'
                }
            
            # Check for valid positions
            position_col = column_mapping['position']
            valid_positions = {'QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'}
            unique_positions = set(df[position_col].str.upper().unique())
            
            if not unique_positions.intersection(valid_positions):
                return {
                    'valid': False,
                    'error': f'No valid positions found. Expected: {valid_positions}, Found: {unique_positions}'
                }
            
            return {
                'valid': True,
                'player_count': len(df),
                'positions': list(unique_positions),
                'column_mapping': column_mapping
            }
            
        except pd.errors.EmptyDataError:
            return {'valid': False, 'error': 'File is empty'}
        except pd.errors.ParserError as e:
            return {'valid': False, 'error': f'Invalid CSV format: {str(e)}'}
        except Exception as e:
            return {'valid': False, 'error': f'Validation error: {str(e)}'}
    
    def get_custom_rankings_list(self) -> List[Dict]:
        """Get list of all custom rankings with metadata"""
        rankings_list = []
        
        for file_id, metadata in self.custom_metadata.items():
            file_path = os.path.join(CUSTOM_RANKINGS_DIRECTORY, metadata['filename'])
            
            # Check if file still exists
            exists = os.path.exists(file_path)
            
            # Get file age
            if exists:
                last_modified = self._get_file_age(file_path)
                file_size = os.path.getsize(file_path)
            else:
                last_modified = "File missing"
                file_size = 0
            
            rankings_list.append({
                **metadata,
                'exists': exists,
                'last_modified': last_modified,
                'current_file_size': file_size,
                'upload_time_formatted': self._format_timestamp(metadata['upload_time']),
                # Ensure these fields exist for frontend compatibility
                'name': metadata.get('display_name', 'Unknown'),  # Fallback for 'name' field
                'title': metadata.get('display_name', 'Unknown'), # Alternative name field
                'status': 'active' if exists else 'missing',
                'type': 'custom'
            })
        
        # Sort by upload time (newest first)
        rankings_list.sort(key=lambda x: x['upload_time'], reverse=True)
        
        return rankings_list
    
    def delete_custom_rankings(self, file_id: str) -> Dict:
        """Delete custom rankings file and metadata"""
        try:
            if file_id not in self.custom_metadata:
                return {'success': False, 'error': 'Rankings not found'}
            
            metadata = self.custom_metadata[file_id]
            file_path = os.path.join(CUSTOM_RANKINGS_DIRECTORY, metadata['filename'])
            
            # Delete file if it exists
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Remove from metadata
            del self.custom_metadata[file_id]
            self._save_custom_metadata()
            
            return {
                'success': True,
                'message': f"Deleted custom rankings: {metadata['display_name']}"
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Delete failed: {str(e)}'}
    
    def get_rankings_filename(self, scoring_format: str, league_type: str, custom_id: str = None) -> str:
        """Get the appropriate rankings filename based on format, type, or custom ID"""
        if custom_id:
            # Custom rankings
            if custom_id in self.custom_metadata:
                return os.path.join(CUSTOM_RANKINGS_DIRECTORY, self.custom_metadata[custom_id]['filename'])
            else:
                raise ValueError(f"Custom rankings not found: {custom_id}")
        else:
            # FantasyPros rankings
            return self.available_formats.get(scoring_format, {}).get(league_type, 
                self.available_formats['half_ppr']['superflex'])  # Default fallback
    
    def should_update_rankings(self, max_age_hours: int = 6) -> bool:
        """Check if rankings need to be updated based on age"""
        if self.last_update_time is None:
            return True
        
        age = datetime.now() - self.last_update_time
        return age > timedelta(hours=max_age_hours)
    
    def update_all_rankings(self, background: bool = True) -> bool:
        """
        Update all FantasyPros rankings (standard and superflex for all scoring formats)
        """
        if self.update_in_progress:
            print("⚠️  Rankings update already in progress...")
            return False
        
        if background:
            # Run in background thread
            thread = threading.Thread(target=self._update_rankings_sync)
            thread.daemon = True
            thread.start()
            return True
        else:
            return self._update_rankings_sync()
    
    def _update_rankings_sync(self) -> bool:
        """Synchronous rankings update"""
        self.update_in_progress = True
        success_count = 0
        total_count = 0
        
        try:
            print("🏈 Starting comprehensive FantasyPros rankings update...")
            print("=" * 60)
            
            scoring_formats = ['standard', 'half_ppr', 'ppr']
            
            for scoring_format in scoring_formats:
                total_count += 1
                print(f"\n📊 Updating {scoring_format.upper()} rankings...")
                
                try:
                    # Create scraper instance
                    scraper = FantasyProsSeleniumV3(headless=True)
                    
                    # Scrape superflex rankings (which includes both standard and superflex data)
                    result = scraper.scrape_superflex_rankings(scoring_format)
                    
                    if result is not None:
                        success_count += 1
                        print(f"✅ {scoring_format.upper()} rankings updated successfully")
                        
                        # Also create a standard version by filtering out the superflex advantage
                        self._create_standard_version(scoring_format)
                        
                    else:
                        print(f"❌ Failed to update {scoring_format.upper()} rankings")
                        
                except Exception as e:
                    print(f"❌ Error updating {scoring_format.upper()} rankings: {e}")
                
                # Small delay between requests to be respectful
                time.sleep(2)
            
            # Update timestamp
            self.last_update_time = datetime.now()
            
            print("\n" + "=" * 60)
            print(f"🎉 Rankings update completed: {success_count}/{total_count} successful")
            print(f"📅 Last updated: {self.last_update_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            return success_count > 0
            
        except Exception as e:
            print(f"💥 Critical error during rankings update: {e}")
            return False
        
        finally:
            self.update_in_progress = False
    
    def _create_standard_version(self, scoring_format: str):
        """
        Create a standard (non-superflex) version by reordering rankings
        This is a simplified approach - in reality, standard rankings would be different
        """
        try:
            superflex_file = f"{RANKINGS_OUTPUT_DIRECTORY}FantasyPros_Rankings_{scoring_format}_superflex.csv"
            standard_file = f"{RANKINGS_OUTPUT_DIRECTORY}FantasyPros_Rankings_{scoring_format}_standard.csv"
            
            if os.path.exists(superflex_file):
                df = pd.read_csv(superflex_file)
                
                # Simple reordering: move QBs down in rankings for standard leagues
                # This is a placeholder - ideally we'd scrape actual standard rankings
                qb_penalty = 50  # Move QBs down by this many positions
                
                df_standard = df.copy()
                qb_mask = df_standard['Position'] == 'QB'
                df_standard.loc[qb_mask, 'Overall Rank'] += qb_penalty
                
                # Re-sort and fix rankings
                df_standard = df_standard.sort_values('Overall Rank').reset_index(drop=True)
                df_standard['Overall Rank'] = range(1, len(df_standard) + 1)
                
                # Recalculate position ranks
                position_counters = {}
                for idx, row in df_standard.iterrows():
                    pos = row['Position']
                    if pos not in position_counters:
                        position_counters[pos] = 0
                    position_counters[pos] += 1
                    df_standard.at[idx, 'Position Rank'] = position_counters[pos]
                
                df_standard.to_csv(standard_file, index=False)
                print(f"  📝 Created standard version: {standard_file}")
                
        except Exception as e:
            print(f"  ⚠️  Could not create standard version for {scoring_format}: {e}")
    
    def get_rankings(self, scoring_format: str = 'half_ppr', league_type: str = 'superflex', 
                    force_update: bool = False, custom_id: str = None) -> Optional[pd.DataFrame]:
        """
        Get rankings for specified format, league type, or custom rankings
        """
        # Handle custom rankings
        if custom_id:
            return self._load_custom_rankings(custom_id)
        
        # Check if update is needed for FantasyPros rankings
        if force_update or self.should_update_rankings():
            print("🔄 Rankings are stale, updating...")
            self.update_all_rankings(background=False)
        
        # Get appropriate filename
        filename = self.get_rankings_filename(scoring_format, league_type)
        filepath = f"{RANKINGS_OUTPUT_DIRECTORY}{filename}"
        
        # Load rankings
        try:
            if os.path.exists(filepath):
                df = pd.read_csv(filepath)
                print(f"📊 Loaded {len(df)} players from {filename}")
                return df
            else:
                print(f"❌ Rankings file not found: {filepath}")
                return None
        except Exception as e:
            print(f"❌ Error loading rankings: {e}")
            return None
    
    def _load_custom_rankings(self, custom_id: str) -> Optional[pd.DataFrame]:
        """Load custom rankings by ID"""
        try:
            if custom_id not in self.custom_metadata:
                print(f"❌ Custom rankings not found: {custom_id}")
                return None
            
            metadata = self.custom_metadata[custom_id]
            filepath = os.path.join(CUSTOM_RANKINGS_DIRECTORY, metadata['filename'])
            
            if not os.path.exists(filepath):
                print(f"❌ Custom rankings file missing: {filepath}")
                return None
            
            df = pd.read_csv(filepath)
            print(f"📊 Loaded {len(df)} players from custom rankings: {metadata['display_name']}")
            return df
            
        except Exception as e:
            print(f"❌ Error loading custom rankings: {e}")
            return None
    
    def get_available_formats(self) -> Dict:
        """Get list of available ranking formats including custom rankings"""
        available = {}
        
        # FantasyPros rankings
        for scoring_format in self.available_formats:
            available[scoring_format] = {}
            for league_type in self.available_formats[scoring_format]:
                filename = self.available_formats[scoring_format][league_type]
                filepath = f"{RANKINGS_OUTPUT_DIRECTORY}{filename}"
                available[scoring_format][league_type] = {
                    'type': 'fantasypros',
                    'filename': filename,
                    'exists': os.path.exists(filepath),
                    'last_modified': self._get_file_age(filepath) if os.path.exists(filepath) else None,
                    'timestamp': self._get_file_timestamp(filepath) if os.path.exists(filepath) else None
                }
        
        # Custom rankings
        custom_rankings = self.get_custom_rankings_list()
        if custom_rankings:
            available['custom'] = {}
            for custom in custom_rankings:
                available['custom'][custom['id']] = {
                    'type': 'custom',
                    'display_name': custom['display_name'],
                    'description': custom['description'],
                    'filename': custom['filename'],
                    'exists': custom['exists'],
                    'last_modified': custom['last_modified'],
                    'timestamp': custom['upload_time_formatted'],
                    'player_count': custom['player_count'],
                    'scoring_format': custom['scoring_format'],
                    'league_type': custom['league_type']
                }
        
        return available
    
    def _format_timestamp(self, iso_timestamp: str) -> str:
        """Format ISO timestamp to human-readable format"""
        try:
            dt = datetime.fromisoformat(iso_timestamp.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            return iso_timestamp
    
    def _get_file_timestamp(self, filepath: str) -> str:
        """Get formatted timestamp for file"""
        try:
            mtime = os.path.getmtime(filepath)
            dt = datetime.fromtimestamp(mtime)
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            return "Unknown"
    
    def _get_file_age(self, filepath: str) -> str:
        """Get human-readable file age"""
        try:
            mtime = os.path.getmtime(filepath)
            age = datetime.now() - datetime.fromtimestamp(mtime)
            
            if age.days > 0:
                return f"{age.days} days ago"
            elif age.seconds > 3600:
                hours = age.seconds // 3600
                return f"{hours} hours ago"
            else:
                minutes = age.seconds // 60
                return f"{minutes} minutes ago"
        except:
            return "Unknown"
    
    def get_update_status(self) -> Dict:
        """Get current update status"""
        # Get total players from current rankings
        total_players = 0
        try:
            # Try to get current rankings to count players
            current_rankings = self.get_rankings()
            if current_rankings is not None:
                total_players = len(current_rankings)
        except:
            total_players = 0
        
        return {
            'update_in_progress': self.update_in_progress,
            'last_update_time': self.last_update_time.isoformat() if self.last_update_time else None,
            'needs_update': self.should_update_rankings(),
            'total_players': total_players,
            'available_formats': self.get_available_formats()
        }

# Global instance
rankings_manager = RankingsManager()

def initialize_rankings():
    """Initialize rankings on app startup"""
    print("🚀 Initializing FantasyPros Rankings Manager...")
    
    # Check if we need to update
    if rankings_manager.should_update_rankings():
        print("📥 Starting initial rankings update...")
        rankings_manager.update_all_rankings(background=True)
    else:
        print("✅ Rankings are up to date")
    
    return rankings_manager

if __name__ == "__main__":
    # Test the rankings manager
    manager = initialize_rankings()
    
    # Wait a bit for background update if needed
    time.sleep(5)
    
    # Test getting rankings
    print("\n🧪 Testing rankings retrieval...")
    df = manager.get_rankings('half_ppr', 'superflex')
    
    if df is not None:
        print(f"✅ Successfully loaded {len(df)} players")
        print("\nTop 10 players:")
        print(df.head(10)[['Overall Rank', 'Name', 'Position', 'Team']].to_string(index=False))
    else:
        print("❌ Failed to load rankings")
    
    # Show status
    print("\n📊 Update Status:")
    status = manager.get_update_status()
    for key, value in status.items():
        print(f"  {key}: {value}")
