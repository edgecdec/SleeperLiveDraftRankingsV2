"""
Unified Rankings Manager
Handles both Fantasy Pros scraping and custom CSV uploads with persistence
"""

import os
import csv
import json
import logging
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import time

logger = logging.getLogger(__name__)

class RankingsManager:
    """Unified manager for all rankings (Fantasy Pros + Custom uploads)"""
    
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.rankings_dir = os.path.join(data_dir, 'rankings')
        self.uploads_dir = os.path.join(data_dir, 'uploads')
        self.cache_file = os.path.join(data_dir, 'rankings_cache.json')
        
        # Create directories
        os.makedirs(self.rankings_dir, exist_ok=True)
        os.makedirs(self.uploads_dir, exist_ok=True)
        
        # In-memory cache
        self._fantasy_pros_cache = {}
        self._custom_uploads = {}
        self._last_scrape_time = None
        
        # Load existing data
        self._load_cache()
        self._load_custom_uploads()
    
    def get_all_rankings(self) -> List[Dict[str, Any]]:
        """Get all available rankings (Fantasy Pros + Custom)"""
        rankings = []
        
        # Get Fantasy Pros rankings
        fantasy_pros = self._get_fantasy_pros_rankings()
        for fp_ranking in fantasy_pros:
            rankings.append({
                'id': fp_ranking['id'],
                'name': fp_ranking['name'],
                'type': 'built-in',
                'scoring': fp_ranking['scoring'].upper(),
                'format': fp_ranking['format'].title(),
                'source': 'Fantasy Pros (Live)',
                'category': 'FantasyPros',
                'metadata': {
                    'total_players': fp_ranking.get('total_players', 0),
                    'last_updated': fp_ranking.get('last_updated')
                }
            })
        
        # Get custom uploads
        for upload_id, upload_data in self._custom_uploads.items():
            rankings.append({
                'id': upload_id,
                'name': upload_data['name'],
                'type': 'custom',
                'scoring': 'Custom',
                'format': 'Custom',
                'source': 'User Upload',
                'category': 'Custom Upload',
                'metadata': {
                    'total_players': len(upload_data.get('players', [])),
                    'upload_time': upload_data.get('upload_time')
                }
            })
        
        logger.info(f"📊 Total rankings available: {len(rankings)} ({len(fantasy_pros)} Fantasy Pros, {len(self._custom_uploads)} custom)")
        return rankings
    
    def get_ranking_data(self, ranking_id: str) -> Optional[Dict[str, Any]]:
        """Get specific ranking data"""
        # Check Fantasy Pros rankings
        fantasy_pros = self._get_fantasy_pros_rankings()
        for fp_ranking in fantasy_pros:
            if fp_ranking['id'] == ranking_id:
                return {
                    'id': ranking_id,
                    'players': fp_ranking['players'],
                    'total_players': len(fp_ranking['players']),
                    'last_updated': fp_ranking.get('last_updated'),
                    'source': 'Fantasy Pros'
                }
        
        # Check custom uploads
        if ranking_id in self._custom_uploads:
            upload_data = self._custom_uploads[ranking_id]
            return {
                'id': ranking_id,
                'players': upload_data['players'],
                'total_players': len(upload_data['players']),
                'upload_time': upload_data.get('upload_time'),
                'source': 'User Upload'
            }
        
        return None
    
    def _get_fantasy_pros_rankings(self) -> List[Dict[str, Any]]:
        """Get Fantasy Pros rankings with caching"""
        # Check if we need to refresh cache
        if self._should_refresh_fantasy_pros():
            self._refresh_fantasy_pros_cache()
        
        # Convert cache to rankings list
        rankings = []
        for filename, data in self._fantasy_pros_cache.items():
            if not data:
                continue
            
            # Parse filename to get metadata
            parts = filename.replace('FantasyPros_Rankings_', '').replace('.csv', '').split('_')
            if len(parts) >= 2:
                scoring = parts[0]
                format_type = parts[1]
                
                rankings.append({
                    'id': filename.replace('.csv', ''),
                    'name': f"Fantasy Pros {scoring.upper()} {format_type.title()}",
                    'scoring': scoring,
                    'format': format_type,
                    'players': data,
                    'total_players': len(data),
                    'last_updated': self._last_scrape_time.isoformat() if self._last_scrape_time else None
                })
        
        return rankings
    
    def _should_refresh_fantasy_pros(self) -> bool:
        """Check if Fantasy Pros cache should be refreshed"""
        if not self._last_scrape_time:
            return True
        
        # Refresh every 6 hours
        time_since_scrape = datetime.now() - self._last_scrape_time
        return time_since_scrape.total_seconds() > 6 * 3600
    
    def _refresh_fantasy_pros_cache(self):
        """Refresh Fantasy Pros rankings cache"""
        try:
            logger.info("🔄 Refreshing Fantasy Pros rankings...")
            
            # Scrape all formats
            scraped_data = self._scrape_all_fantasy_pros_formats()
            
            if scraped_data:
                self._fantasy_pros_cache = scraped_data
                self._last_scrape_time = datetime.now()
                
                # Save to disk
                self._save_fantasy_pros_to_disk()
                self._save_cache()
                
                logger.info(f"✅ Successfully refreshed {len(scraped_data)} Fantasy Pros formats")
            else:
                logger.warning("⚠️ Failed to scrape Fantasy Pros, trying to load from disk...")
                self._load_fantasy_pros_from_disk()
                
        except Exception as e:
            logger.error(f"❌ Error refreshing Fantasy Pros cache: {e}")
            self._load_fantasy_pros_from_disk()
    
    def _scrape_all_fantasy_pros_formats(self) -> Dict[str, List[Dict]]:
        """Scrape all Fantasy Pros formats using lightweight scraper"""
        formats = [
            ('standard', 'standard'),
            ('standard', 'superflex'),
            ('half_ppr', 'standard'),
            ('half_ppr', 'superflex'),
            ('ppr', 'standard'),
            ('ppr', 'superflex')
        ]
        
        results = {}
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        for scoring, league_format in formats:
            try:
                logger.info(f"🏈 Scraping {scoring} {league_format}...")
                
                # Build URL
                if scoring == 'standard':
                    url = "https://www.fantasypros.com/nfl/rankings/consensus-cheatsheets.php"
                elif scoring == 'half_ppr':
                    url = "https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php"
                elif scoring == 'ppr':
                    url = "https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php"
                else:
                    continue
                
                # Add superflex parameter if needed
                if league_format == 'superflex':
                    url += "?format=superflex"
                
                # Make request
                response = session.get(url, timeout=30)
                response.raise_for_status()
                
                # Parse HTML
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Extract player data from JavaScript
                players = self._extract_players_from_js(soup)
                
                if players:
                    filename = f"FantasyPros_Rankings_{scoring}_{league_format}.csv"
                    results[filename] = players
                    logger.info(f"✅ Scraped {len(players)} players for {scoring} {league_format}")
                else:
                    logger.warning(f"⚠️ No players found for {scoring} {league_format}")
                
                # Small delay between requests
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Error scraping {scoring} {league_format}: {e}")
                continue
        
        return results
    
    def _extract_players_from_js(self, soup) -> List[Dict]:
        """Extract player data from JavaScript variables"""
        try:
            # Look for ecrData in script tags
            for script in soup.find_all('script'):
                if not script.string:
                    continue
                
                script_content = script.string
                
                if 'ecrData' in script_content:
                    # Try to extract JSON data
                    patterns = [
                        r'ecrData\s*=\s*({.*?});',
                        r'ecrData\s*=\s*(\{.*?\})\s*;',
                        r'var\s+ecrData\s*=\s*({.*?});'
                    ]
                    
                    for pattern in patterns:
                        match = re.search(pattern, script_content, re.DOTALL)
                        if match:
                            try:
                                json_str = match.group(1)
                                data = json.loads(json_str)
                                
                                if 'players' in data and data['players']:
                                    return self._process_fantasy_pros_players(data['players'])
                            except json.JSONDecodeError:
                                continue
            
            return []
            
        except Exception as e:
            logger.error(f"❌ Error extracting players from JS: {e}")
            return []
    
    def _process_fantasy_pros_players(self, raw_players: List[Dict]) -> List[Dict]:
        """Process raw Fantasy Pros player data"""
        processed = []
        
        for player in raw_players:
            try:
                name = player.get('player_name', '').strip()
                position = player.get('player_position_id', '').strip().upper()
                team = player.get('player_team_id', '').strip().upper()
                overall_rank = player.get('rank_ecr', 999)
                position_rank = player.get('rank_pos', 999)
                bye_week = player.get('player_bye_week', 0)
                tier = player.get('tier', 1)
                
                if not name or not position:
                    continue
                
                # Normalize position names
                if position in ['D/ST', 'DEF', 'DEFENSE']:
                    position = 'DST'
                elif position == 'KICKER':
                    position = 'K'
                
                processed.append({
                    'player_name': name,
                    'position': position,
                    'team': team,
                    'overall_rank': overall_rank,
                    'position_rank': position_rank,
                    'bye_week': bye_week,
                    'tier': tier
                })
                
            except Exception as e:
                logger.debug(f"Error processing player: {e}")
                continue
        
        # Sort by overall rank
        processed.sort(key=lambda x: x['overall_rank'])
        return processed
    
    def _save_fantasy_pros_to_disk(self):
        """Save Fantasy Pros rankings to disk"""
        try:
            for filename, data in self._fantasy_pros_cache.items():
                if not data:
                    continue
                
                filepath = os.path.join(self.rankings_dir, filename)
                
                with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
                    fieldnames = ['Overall Rank', 'Name', 'Position', 'Team', 'Bye', 'Position Rank', 'Tier']
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    
                    for player in data:
                        writer.writerow({
                            'Overall Rank': player.get('overall_rank', 999),
                            'Name': player.get('player_name', ''),
                            'Position': player.get('position', ''),
                            'Team': player.get('team', ''),
                            'Bye': player.get('bye_week', 0),
                            'Position Rank': player.get('position_rank', 999),
                            'Tier': player.get('tier', 1)
                        })
                
                logger.debug(f"💾 Saved {filename} to disk")
                
        except Exception as e:
            logger.error(f"❌ Error saving Fantasy Pros to disk: {e}")
    
    def _load_fantasy_pros_from_disk(self):
        """Load Fantasy Pros rankings from disk"""
        try:
            logger.info("📁 Loading Fantasy Pros rankings from disk...")
            
            # Check rankings directory
            if os.path.exists(self.rankings_dir):
                for filename in os.listdir(self.rankings_dir):
                    if filename.startswith('FantasyPros_Rankings_') and filename.endswith('.csv'):
                        filepath = os.path.join(self.rankings_dir, filename)
                        self._load_fantasy_pros_csv(filepath, filename)
            
            # Check parent data directory
            parent_data_dir = os.path.dirname(self.rankings_dir)
            if os.path.exists(parent_data_dir):
                for filename in os.listdir(parent_data_dir):
                    if filename.startswith('FantasyPros_Rankings_') and filename.endswith('.csv'):
                        filepath = os.path.join(parent_data_dir, filename)
                        self._load_fantasy_pros_csv(filepath, filename)
            
            if self._fantasy_pros_cache:
                self._last_scrape_time = datetime.now()
                logger.info(f"✅ Loaded {len(self._fantasy_pros_cache)} Fantasy Pros files from disk")
            
        except Exception as e:
            logger.error(f"❌ Error loading Fantasy Pros from disk: {e}")
    
    def _load_fantasy_pros_csv(self, filepath: str, filename: str):
        """Load a single Fantasy Pros CSV file"""
        try:
            data = []
            with open(filepath, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    data.append({
                        'player_name': row.get('Name', ''),
                        'position': row.get('Position', ''),
                        'team': row.get('Team', ''),
                        'overall_rank': int(row.get('Overall Rank', 999)),
                        'position_rank': int(row.get('Position Rank', 999)),
                        'bye_week': int(row.get('Bye', 0)),
                        'tier': int(row.get('Tier', 1))
                    })
            
            if data:
                self._fantasy_pros_cache[filename] = data
                logger.info(f"📊 Loaded {len(data)} players from {filename}")
        
        except Exception as e:
            logger.error(f"❌ Error loading {filename}: {e}")
    
    def upload_custom_ranking(self, file_content: bytes, filename: str, metadata: Dict[str, str]) -> Dict[str, Any]:
        """Upload and persist a custom ranking"""
        try:
            # Generate unique ID
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            upload_id = f"upload_{timestamp}_{filename.replace('.csv', '').replace(' ', '_')}"
            
            # Parse CSV content
            content_str = file_content.decode('utf-8')
            lines = content_str.strip().split('\n')
            
            if not lines:
                raise ValueError("Empty file")
            
            # Parse CSV
            reader = csv.DictReader(lines)
            players = []
            
            for i, row in enumerate(reader):
                try:
                    # Try to extract player data with flexible column mapping
                    player_data = self._parse_custom_player_row(row, i + 1)
                    if player_data:
                        players.append(player_data)
                except Exception as e:
                    logger.debug(f"Error parsing row {i + 1}: {e}")
                    continue
            
            if not players:
                raise ValueError("No valid player data found in CSV")
            
            # Create upload record
            upload_data = {
                'id': upload_id,
                'name': metadata.get('name', filename),
                'filename': filename,
                'players': players,
                'upload_time': datetime.now().isoformat(),
                'metadata': metadata
            }
            
            # Save to memory
            self._custom_uploads[upload_id] = upload_data
            
            # Save to disk for persistence
            self._save_custom_upload_to_disk(upload_id, upload_data)
            
            logger.info(f"✅ Uploaded custom ranking: {upload_data['name']} ({len(players)} players)")
            
            return {
                'id': upload_id,
                'name': upload_data['name'],
                'total_players': len(players),
                'upload_time': upload_data['upload_time']
            }
            
        except Exception as e:
            logger.error(f"❌ Error uploading custom ranking: {e}")
            raise
    
    def _parse_custom_player_row(self, row: Dict[str, str], rank: int) -> Optional[Dict[str, Any]]:
        """Parse a single player row from custom CSV with flexible column mapping"""
        # Common column name mappings (case-insensitive)
        name_cols = ['name', 'player', 'player_name', 'full_name']
        position_cols = ['position', 'pos', 'positions']
        team_cols = ['team', 'tm', 'nfl_team']
        rank_cols = ['rank', 'overall_rank', 'overall rank', 'ranking', 'rk']
        
        # Find values using flexible mapping
        name = None
        position = None
        team = None
        overall_rank = rank
        
        # Convert row keys to lowercase for matching
        row_lower = {k.lower().strip(): v for k, v in row.items()}
        
        # Find name
        for col in name_cols:
            if col in row_lower and row_lower[col].strip():
                name = row_lower[col].strip()
                break
        
        # Find position
        for col in position_cols:
            if col in row_lower and row_lower[col].strip():
                position = row_lower[col].strip().upper()
                break
        
        # Find team
        for col in team_cols:
            if col in row_lower and row_lower[col].strip():
                team = row_lower[col].strip().upper()
                break
        
        # Find rank
        for col in rank_cols:
            if col in row_lower and row_lower[col].strip():
                try:
                    overall_rank = int(float(row_lower[col].strip()))
                    break
                except (ValueError, TypeError):
                    continue
        
        # Validate required fields
        if not name:
            return None
        
        # Set defaults
        if not position:
            position = 'UNKNOWN'
        if not team:
            team = 'FA'
        
        # Normalize position
        if position in ['D/ST', 'DEF', 'DEFENSE']:
            position = 'DST'
        elif position == 'KICKER':
            position = 'K'
        
        return {
            'player_name': name,
            'position': position,
            'team': team,
            'overall_rank': overall_rank,
            'position_rank': 999,  # Will be calculated if needed
            'bye_week': 0,
            'tier': 1
        }
    
    def _save_custom_upload_to_disk(self, upload_id: str, upload_data: Dict[str, Any]):
        """Save custom upload to disk for persistence"""
        try:
            # Save as JSON for metadata
            json_filepath = os.path.join(self.uploads_dir, f"{upload_id}.json")
            with open(json_filepath, 'w', encoding='utf-8') as f:
                json.dump(upload_data, f, indent=2)
            
            # Save as CSV for compatibility
            csv_filepath = os.path.join(self.uploads_dir, f"{upload_id}.csv")
            with open(csv_filepath, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['Overall Rank', 'Name', 'Position', 'Team', 'Bye', 'Position Rank', 'Tier']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for player in upload_data['players']:
                    writer.writerow({
                        'Overall Rank': player.get('overall_rank', 999),
                        'Name': player.get('player_name', ''),
                        'Position': player.get('position', ''),
                        'Team': player.get('team', ''),
                        'Bye': player.get('bye_week', 0),
                        'Position Rank': player.get('position_rank', 999),
                        'Tier': player.get('tier', 1)
                    })
            
            logger.debug(f"💾 Saved custom upload {upload_id} to disk")
            
        except Exception as e:
            logger.error(f"❌ Error saving custom upload to disk: {e}")
    
    def _load_custom_uploads(self):
        """Load custom uploads from disk"""
        try:
            if not os.path.exists(self.uploads_dir):
                return
            
            for filename in os.listdir(self.uploads_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.uploads_dir, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            upload_data = json.load(f)
                        
                        upload_id = upload_data.get('id')
                        if upload_id:
                            self._custom_uploads[upload_id] = upload_data
                            logger.debug(f"📁 Loaded custom upload: {upload_data.get('name', upload_id)}")
                    
                    except Exception as e:
                        logger.error(f"❌ Error loading {filename}: {e}")
            
            if self._custom_uploads:
                logger.info(f"✅ Loaded {len(self._custom_uploads)} custom uploads from disk")
            
        except Exception as e:
            logger.error(f"❌ Error loading custom uploads: {e}")
    
    def delete_custom_ranking(self, ranking_id: str) -> bool:
        """Delete a custom ranking"""
        try:
            if ranking_id not in self._custom_uploads:
                return False
            
            # Remove from memory
            del self._custom_uploads[ranking_id]
            
            # Remove from disk
            json_filepath = os.path.join(self.uploads_dir, f"{ranking_id}.json")
            csv_filepath = os.path.join(self.uploads_dir, f"{ranking_id}.csv")
            
            for filepath in [json_filepath, csv_filepath]:
                if os.path.exists(filepath):
                    os.remove(filepath)
            
            logger.info(f"✅ Deleted custom ranking: {ranking_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error deleting custom ranking: {e}")
            return False
    
    def force_refresh_fantasy_pros(self):
        """Force refresh Fantasy Pros rankings"""
        logger.info("🔄 Force refreshing Fantasy Pros rankings...")
        self._last_scrape_time = None
        self._refresh_fantasy_pros_cache()
    
    def _save_cache(self):
        """Save cache metadata to disk"""
        try:
            cache_data = {
                'last_scrape_time': self._last_scrape_time.isoformat() if self._last_scrape_time else None,
                'fantasy_pros_count': len(self._fantasy_pros_cache),
                'custom_uploads_count': len(self._custom_uploads)
            }
            
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2)
                
        except Exception as e:
            logger.error(f"❌ Error saving cache: {e}")
    
    def _load_cache(self):
        """Load cache metadata from disk"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                
                if cache_data.get('last_scrape_time'):
                    self._last_scrape_time = datetime.fromisoformat(cache_data['last_scrape_time'])
                
                logger.debug("📁 Loaded cache metadata")
                
        except Exception as e:
            logger.error(f"❌ Error loading cache: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get system statistics"""
        return {
            'fantasy_pros_rankings': len(self._fantasy_pros_cache),
            'custom_uploads': len(self._custom_uploads),
            'total_fantasy_pros_players': sum(len(data) for data in self._fantasy_pros_cache.values()),
            'total_custom_players': sum(len(upload['players']) for upload in self._custom_uploads.values()),
            'last_scrape_time': self._last_scrape_time.isoformat() if self._last_scrape_time else None,
            'memory_usage_mb': 0.5  # Rough estimate
        }

# Global instance
rankings_manager = None

def initialize_rankings_manager(data_dir: str):
    """Initialize the unified rankings manager"""
    global rankings_manager
    try:
        rankings_manager = RankingsManager(data_dir)
        logger.info("✅ Unified rankings manager initialized")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize rankings manager: {e}")
        return False
