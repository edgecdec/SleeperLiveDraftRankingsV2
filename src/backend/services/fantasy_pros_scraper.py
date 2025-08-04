#!/usr/bin/env python3
"""
Fantasy Pros Scraper for V2 Rankings System
Adapted from the original SleeperLiveDraftRankings project
"""

import time
import pandas as pd
import json
import re
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class FantasyProsScraper:
    """
    Fantasy Pros scraper for runtime rankings generation
    """
    
    def __init__(self, headless=True):
        self.headless = headless
        self.driver = None
        self.wait = None
    
    def setup_driver(self):
        """Set up the Chrome WebDriver"""
        chrome_options = Options()
        
        if self.headless:
            chrome_options.add_argument("--headless")
        
        # Additional options for better compatibility
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        
        # Disable images and CSS for faster loading
        prefs = {
            "profile.managed_default_content_settings.images": 2,
            "profile.default_content_setting_values.notifications": 2
        }
        chrome_options.add_experimental_option("prefs", prefs)
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, 30)
            logger.info("✓ Chrome WebDriver initialized successfully")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to initialize Chrome WebDriver: {e}")
            return False
    
    def extract_player_data(self):
        """Extract player data from the page"""
        try:
            # Try to extract data from JavaScript variables
            js_script = """
            if (typeof ecrData !== 'undefined' && ecrData.players) {
                return ecrData.players.map(function(player) {
                    return {
                        player_name: player.player_name,
                        rank_ecr: player.rank_ecr,
                        player_position_id: player.player_position_id,
                        player_team_id: player.player_team_id,
                        player_bye_week: player.player_bye_week,
                        rank_pos: player.rank_pos,
                        tier: player.tier || 1
                    };
                });
            }
            return null;
            """
            
            result = self.driver.execute_script(js_script)
            if result:
                logger.info(f"✓ Extracted {len(result)} players from JavaScript data")
                return result
            
            logger.warning("⚠️ Could not extract data from JavaScript variables")
            return None
            
        except Exception as e:
            logger.error(f"✗ Error extracting player data: {e}")
            return None
    
    def scrape_rankings(self, scoring_format='half_ppr', league_format='standard'):
        """
        Scrape Fantasy Pros rankings
        
        Args:
            scoring_format: 'standard', 'half_ppr', or 'ppr'
            league_format: 'standard' or 'superflex'
        """
        try:
            if not self.setup_driver():
                return None
            
            # Build URL based on format
            base_url = "https://www.fantasypros.com/nfl/rankings"
            
            if scoring_format == 'standard':
                url = f"{base_url}/consensus-cheatsheets.php"
            elif scoring_format == 'half_ppr':
                url = f"{base_url}/half-point-ppr-cheatsheets.php"
            elif scoring_format == 'ppr':
                url = f"{base_url}/ppr-cheatsheets.php"
            else:
                url = f"{base_url}/half-point-ppr-cheatsheets.php"  # Default
            
            logger.info(f"🌐 Loading Fantasy Pros URL: {url}")
            self.driver.get(url)
            
            # Wait for page to load
            time.sleep(5)
            
            # Extract initial data
            initial_data = self.extract_player_data()
            if not initial_data:
                logger.error("✗ Could not extract initial player data")
                return None
            
            # If superflex format, try to click superflex tab
            if league_format == 'superflex':
                logger.info("🎯 Attempting to switch to superflex format...")
                if self.click_superflex_tab():
                    time.sleep(3)  # Wait for data to update
                    superflex_data = self.extract_player_data()
                    if superflex_data:
                        initial_data = superflex_data
                        logger.info("✓ Successfully switched to superflex data")
                    else:
                        logger.warning("⚠️ Could not extract superflex data, using standard")
                else:
                    logger.warning("⚠️ Could not click superflex tab, using standard data")
            
            # Process the data
            return self.process_player_data(initial_data, scoring_format, league_format)
            
        except Exception as e:
            logger.error(f"✗ Error during scraping: {e}")
            return None
        finally:
            if self.driver:
                self.driver.quit()
                logger.info("✓ WebDriver closed")
    
    def click_superflex_tab(self):
        """Try to click the superflex tab"""
        selectors = [
            "//button[contains(text(), 'Superflex')]",
            "//a[contains(text(), 'Superflex')]",
            "//li[contains(text(), 'Superflex')]",
            "//div[contains(text(), 'Superflex')]",
            "//span[contains(text(), 'Superflex')]",
            "[data-value='superflex']",
            "[data-format='superflex']"
        ]
        
        for selector in selectors:
            try:
                if selector.startswith("//"):
                    element = self.driver.find_element(By.XPATH, selector)
                else:
                    element = self.driver.find_element(By.CSS_SELECTOR, selector)
                
                if element and element.is_displayed():
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                    time.sleep(1)
                    
                    try:
                        element.click()
                        return True
                    except:
                        self.driver.execute_script("arguments[0].click();", element)
                        return True
            except:
                continue
        
        return False
    
    def process_player_data(self, players_data, scoring_format, league_format):
        """Process raw player data into our standard format"""
        try:
            processed_players = []
            
            for player in players_data:
                # Extract player information
                name = player.get('player_name', '').strip()
                position = player.get('player_position_id', '').strip().upper()
                team = player.get('player_team_id', '').strip().upper()
                overall_rank = player.get('rank_ecr', 999)
                position_rank = player.get('rank_pos', 999)
                bye_week = player.get('player_bye_week', 0)
                tier = player.get('tier', 1)
                
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
            logger.error(f"✗ Error processing player data: {e}")
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
                    # Generate filename
                    filename = f"FantasyPros_Rankings_{scoring}_{league}.csv"
                    results[filename] = data
                    logger.info(f"✅ Successfully scraped {len(data)} players for {scoring} {league}")
                else:
                    logger.error(f"❌ Failed to scrape {scoring} {league}")
                
                # Small delay between requests
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"❌ Error scraping {scoring} {league}: {e}")
                continue
        
        return results

def scrape_fantasy_pros_rankings():
    """Main function to scrape all Fantasy Pros rankings"""
    logger.info("🏈 Starting Fantasy Pros rankings scrape...")
    
    scraper = FantasyProsScraper(headless=True)
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
    
    # Test the scraper
    results = scrape_fantasy_pros_rankings()
    
    for filename, data in results.items():
        print(f"📊 {filename}: {len(data)} players")
        if data:
            print(f"   Top 3: {[p['player_name'] for p in data[:3]]}")
