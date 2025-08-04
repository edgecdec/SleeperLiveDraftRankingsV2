"""
Fantasy Pros Rankings Provider
Provides runtime Fantasy Pros rankings generation for the V2 system
"""

import os
import csv
import logging
from datetime import datetime
from .fantasy_pros_scraper import scrape_fantasy_pros_rankings

logger = logging.getLogger(__name__)

class FantasyProseProvider:
    """Fantasy Pros rankings provider with runtime generation"""
    
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.rankings_dir = os.path.join(data_dir, 'rankings')
        os.makedirs(self.rankings_dir, exist_ok=True)
        
        # Cache for scraped data
        self._rankings_cache = {}
        self._last_scrape_time = None
    
    def get_available_rankings(self):
        """Get list of available Fantasy Pros rankings"""
        rankings = []
        
        # Check if we have cached data or need to scrape
        if not self._rankings_cache or self._should_refresh_cache():
            logger.info("🔄 Refreshing Fantasy Pros rankings cache...")
            self._refresh_rankings_cache()
        
        # Generate rankings list from cache
        for filename, data in self._rankings_cache.items():
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
                    'type': 'fantasy_pros',
                    'scoring': scoring,
                    'format': format_type,
                    'source': 'Fantasy Pros (Live)',
                    'total_players': len(data),
                    'last_updated': self._last_scrape_time.isoformat() if self._last_scrape_time else None
                })
        
        logger.info(f"📊 Found {len(rankings)} Fantasy Pros rankings")
        return rankings
    
    def get_ranking_data(self, ranking_id):
        """Get ranking data by ID"""
        filename = f"{ranking_id}.csv"
        
        if filename not in self._rankings_cache:
            logger.warning(f"⚠️ Ranking {ranking_id} not found in cache")
            return None
        
        data = self._rankings_cache[filename]
        if not data:
            logger.warning(f"⚠️ No data for ranking {ranking_id}")
            return None
        
        return {
            'id': ranking_id,
            'players': data,
            'total_players': len(data),
            'last_updated': self._last_scrape_time.isoformat() if self._last_scrape_time else None
        }
    
    def _should_refresh_cache(self):
        """Check if cache should be refreshed"""
        if not self._last_scrape_time:
            return True
        
        # Refresh every 6 hours
        time_since_scrape = datetime.now() - self._last_scrape_time
        return time_since_scrape.total_seconds() > 6 * 3600
    
    def _refresh_rankings_cache(self):
        """Refresh the rankings cache by scraping Fantasy Pros"""
        try:
            logger.info("🕷️ Scraping Fantasy Pros rankings...")
            scraped_data = scrape_fantasy_pros_rankings()
            
            if scraped_data:
                self._rankings_cache = scraped_data
                self._last_scrape_time = datetime.now()
                
                # Optionally save to disk for persistence
                self._save_rankings_to_disk()
                
                logger.info(f"✅ Successfully cached {len(scraped_data)} ranking formats")
            else:
                logger.error("❌ Failed to scrape Fantasy Pros rankings")
                
                # Try to load from disk as fallback
                self._load_rankings_from_disk()
                
        except Exception as e:
            logger.error(f"❌ Error refreshing rankings cache: {e}")
            
            # Try to load from disk as fallback
            self._load_rankings_from_disk()
    
    def _save_rankings_to_disk(self):
        """Save scraped rankings to disk for persistence"""
        try:
            for filename, data in self._rankings_cache.items():
                if not data:
                    continue
                
                filepath = os.path.join(self.rankings_dir, filename)
                
                with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
                    if data:
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
            logger.error(f"❌ Error saving rankings to disk: {e}")
    
    def _load_rankings_from_disk(self):
        """Load rankings from disk as fallback"""
        try:
            logger.info("📁 Loading Fantasy Pros rankings from disk...")
            
            # Look for existing CSV files
            if os.path.exists(self.rankings_dir):
                for filename in os.listdir(self.rankings_dir):
                    if filename.startswith('FantasyPros_Rankings_') and filename.endswith('.csv'):
                        filepath = os.path.join(self.rankings_dir, filename)
                        
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
                                self._rankings_cache[filename] = data
                                logger.info(f"📊 Loaded {len(data)} players from {filename}")
                        
                        except Exception as e:
                            logger.error(f"❌ Error loading {filename}: {e}")
            
            # Also check the parent data directory for existing files
            parent_data_dir = os.path.dirname(self.rankings_dir)
            if os.path.exists(parent_data_dir):
                for filename in os.listdir(parent_data_dir):
                    if filename.startswith('FantasyPros_Rankings_') and filename.endswith('.csv'):
                        filepath = os.path.join(parent_data_dir, filename)
                        
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
                                self._rankings_cache[filename] = data
                                logger.info(f"📊 Loaded {len(data)} players from {filename} (parent dir)")
                        
                        except Exception as e:
                            logger.error(f"❌ Error loading {filename} from parent dir: {e}")
            
            if self._rankings_cache:
                self._last_scrape_time = datetime.now()
                logger.info(f"✅ Loaded {len(self._rankings_cache)} ranking files from disk")
            else:
                logger.warning("⚠️ No Fantasy Pros rankings found on disk")
                
        except Exception as e:
            logger.error(f"❌ Error loading rankings from disk: {e}")
    
    def force_refresh(self):
        """Force refresh of rankings cache"""
        logger.info("🔄 Force refreshing Fantasy Pros rankings...")
        self._last_scrape_time = None
        self._refresh_rankings_cache()
    
    def get_stats(self):
        """Get provider statistics"""
        return {
            'total_rankings': len(self._rankings_cache),
            'total_players': sum(len(data) for data in self._rankings_cache.values() if data),
            'last_updated': self._last_scrape_time.isoformat() if self._last_scrape_time else None,
            'cache_size_mb': 0.1  # Rough estimate
        }

# Global instance
fantasy_pros_provider = None

def initialize_fantasy_pros_provider(data_dir):
    """Initialize the Fantasy Pros provider"""
    global fantasy_pros_provider
    try:
        fantasy_pros_provider = FantasyProseProvider(data_dir)
        logger.info("✅ Fantasy Pros provider initialized")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize Fantasy Pros provider: {e}")
        return False
