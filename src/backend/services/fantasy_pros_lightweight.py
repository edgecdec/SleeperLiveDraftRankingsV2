"""
Lightweight Fantasy Pros scraper using requests only
No Selenium dependency - works in executable distributions
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import logging
from datetime import datetime
import time

logger = logging.getLogger(__name__)

class FantasyProsLightweight:
    """Lightweight Fantasy Pros scraper without Selenium"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
    
    def scrape_rankings(self, scoring_format='half_ppr', league_format='standard'):
        """
        Scrape Fantasy Pros rankings using lightweight HTTP requests
        
        Args:
            scoring_format: 'standard', 'half_ppr', or 'ppr'
            league_format: 'standard' or 'superflex'
        """
        try:
            # Build URL
            if scoring_format == 'standard':
                url = "https://www.fantasypros.com/nfl/rankings/consensus-cheatsheets.php"
            elif scoring_format == 'half_ppr':
                url = "https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php"
            elif scoring_format == 'ppr':
                url = "https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php"
            else:
                url = "https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php"
            
            logger.info(f"🌐 Scraping {scoring_format} {league_format}: {url}")
            
            # Add superflex parameter if needed
            if league_format == 'superflex':
                url += "?format=superflex"
            
            # Make request
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Try multiple extraction methods
            players = self.extract_from_javascript(soup) or self.extract_from_table(soup)
            
            if players:
                logger.info(f"✅ Extracted {len(players)} players")
                return self.process_player_data(players, scoring_format, league_format)
            else:
                logger.error("❌ No player data found")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error scraping {scoring_format} {league_format}: {e}")
            return None
    
    def extract_from_javascript(self, soup):
        """Extract player data from JavaScript variables"""
        try:
            # Look for ecrData in script tags
            for script in soup.find_all('script'):
                if not script.string:
                    continue
                
                script_content = script.string
                
                # Look for ecrData
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
                                    logger.info(f"✅ Found {len(data['players'])} players in ecrData")
                                    return data['players']
                            except json.JSONDecodeError as e:
                                logger.debug(f"JSON decode error: {e}")
                                continue
                
                # Look for other data variables
                for var_name in ['rankings', 'playerData', 'cheatsheet']:
                    if var_name in script_content:
                        pattern = rf'{var_name}\s*=\s*(\[.*?\]|\{{.*?\}});'
                        match = re.search(pattern, script_content, re.DOTALL)
                        if match:
                            try:
                                json_str = match.group(1)
                                data = json.loads(json_str)
                                if isinstance(data, list) and data:
                                    logger.info(f"✅ Found {len(data)} players in {var_name}")
                                    return data
                            except json.JSONDecodeError:
                                continue
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error extracting from JavaScript: {e}")
            return None
    
    def extract_from_table(self, soup):
        """Extract player data from HTML table as fallback"""
        try:
            # Look for the main rankings table
            table = soup.find('table', {'id': 'data'}) or soup.find('table', class_='table')
            
            if not table:
                # Try to find any table with player data
                tables = soup.find_all('table')
                for t in tables:
                    if t.find('th', string=re.compile(r'(player|name|rank)', re.I)):
                        table = t
                        break
            
            if not table:
                logger.warning("⚠️ No data table found")
                return None
            
            players = []
            rows = table.find('tbody').find_all('tr') if table.find('tbody') else table.find_all('tr')[1:]
            
            for i, row in enumerate(rows):
                try:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 4:
                        continue
                    
                    # Extract basic info (this is a simplified extraction)
                    rank = i + 1
                    name_cell = cells[1] if len(cells) > 1 else cells[0]
                    name = name_cell.get_text(strip=True)
                    
                    # Try to extract position and team
                    position = "UNKNOWN"
                    team = "UNKNOWN"
                    
                    for cell in cells[2:5]:
                        text = cell.get_text(strip=True).upper()
                        if text in ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF']:
                            position = 'DST' if text in ['DEF', 'DST'] else text
                        elif len(text) == 2 or len(text) == 3:  # Likely team abbreviation
                            team = text
                    
                    if name and position != "UNKNOWN":
                        players.append({
                            'player_name': name,
                            'rank_ecr': rank,
                            'player_position_id': position,
                            'player_team_id': team,
                            'player_bye_week': 0,
                            'rank_pos': 1,
                            'tier': 1
                        })
                
                except Exception as e:
                    logger.debug(f"Error parsing row {i}: {e}")
                    continue
            
            if players:
                logger.info(f"✅ Extracted {len(players)} players from table")
                return players
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error extracting from table: {e}")
            return None
    
    def process_player_data(self, players_data, scoring_format, league_format):
        """Process raw player data into our standard format"""
        try:
            processed_players = []
            
            for player in players_data:
                # Handle both JavaScript object format and table format
                if isinstance(player, dict):
                    name = player.get('player_name', player.get('name', '')).strip()
                    position = player.get('player_position_id', player.get('position', '')).strip().upper()
                    team = player.get('player_team_id', player.get('team', '')).strip().upper()
                    overall_rank = player.get('rank_ecr', player.get('rank', 999))
                    position_rank = player.get('rank_pos', player.get('pos_rank', 999))
                    bye_week = player.get('player_bye_week', player.get('bye', 0))
                    tier = player.get('tier', 1)
                else:
                    # Handle other formats
                    continue
                
                # Skip invalid entries
                if not name or not position:
                    continue
                
                # Normalize position names
                if position in ['D/ST', 'DEF', 'DEFENSE']:
                    position = 'DST'
                elif position == 'KICKER':
                    position = 'K'
                
                processed_players.append({
                    'player_name': name,
                    'position': position,
                    'team': team,
                    'overall_rank': overall_rank,
                    'position_rank': position_rank,
                    'bye_week': bye_week,
                    'tier': tier
                })
            
            # Sort by overall rank
            processed_players.sort(key=lambda x: x['overall_rank'])
            
            logger.info(f"✅ Processed {len(processed_players)} players")
            return processed_players
            
        except Exception as e:
            logger.error(f"❌ Error processing player data: {e}")
            return None
    
    def scrape_all_formats(self):
        """Scrape all Fantasy Pros ranking formats"""
        formats = [
            ('standard', 'standard'),
            ('standard', 'superflex'),
            ('half_ppr', 'standard'),
            ('half_ppr', 'superflex'),
            ('ppr', 'standard'),
            ('ppr', 'superflex')
        ]
        
        results = {}
        
        for scoring, league in formats:
            try:
                logger.info(f"🏈 Scraping {scoring} {league} rankings...")
                data = self.scrape_rankings(scoring, league)
                
                if data:
                    filename = f"FantasyPros_Rankings_{scoring}_{league}.csv"
                    results[filename] = data
                    logger.info(f"✅ Successfully scraped {len(data)} players for {scoring} {league}")
                else:
                    logger.error(f"❌ Failed to scrape {scoring} {league}")
                
                # Small delay between requests to be respectful
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Error scraping {scoring} {league}: {e}")
                continue
        
        return results

def scrape_fantasy_pros_lightweight():
    """Main function to scrape all Fantasy Pros rankings (lightweight)"""
    logger.info("🏈 Starting lightweight Fantasy Pros rankings scrape...")
    
    scraper = FantasyProsLightweight()
    results = scraper.scrape_all_formats()
    
    if results:
        logger.info(f"🎉 Successfully scraped {len(results)} ranking formats")
        return results
    else:
        logger.error("💥 Failed to scrape any rankings")
        return {}

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Test the lightweight scraper
    results = scrape_fantasy_pros_lightweight()
    
    for filename, data in results.items():
        print(f"📊 {filename}: {len(data)} players")
        if data:
            print(f"   Top 3: {[p['player_name'] for p in data[:3]]}")
