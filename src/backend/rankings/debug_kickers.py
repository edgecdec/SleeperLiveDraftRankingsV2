#!/usr/bin/env python3
"""
Debug script to find out why kickers are not being included in the final rankings
"""

from PopulateFromSites.FantasyProsSeleniumV3 import FantasyProsSeleniumV3
import json

def debug_kicker_processing():
    """Debug the kicker processing issue"""
    print("🔍 Debugging kicker processing...")
    
    scraper = FantasyProsSeleniumV3(headless=True)
    
    if not scraper.setup_driver():
        print("❌ Failed to setup driver")
        return
    
    try:
        # Load the half_ppr superflex page
        url = 'https://www.fantasypros.com/nfl/rankings/superflex-half-point-ppr-cheatsheets.php'
        print(f"Loading: {url}")
        scraper.driver.get(url)
        
        # Wait and get player data
        import time
        time.sleep(5)
        
        # Get raw player data
        players_data = scraper.extract_player_data()
        
        if not players_data:
            print("❌ No player data found")
            return
        
        print(f"📊 Total players in raw data: {len(players_data)}")
        
        # Count positions in raw data
        position_counts = {}
        kicker_players = []
        
        for player in players_data:
            if isinstance(player, dict):
                pos = player.get('player_position_id', '').strip()
                name = player.get('player_name', '').strip()
                
                if pos not in position_counts:
                    position_counts[pos] = 0
                position_counts[pos] += 1
                
                # Collect kicker data
                if pos == 'K':
                    kicker_players.append({
                        'name': name,
                        'team': player.get('player_team_id', ''),
                        'rank': player.get('rank_ecr', 0),
                        'tier': player.get('tier', 1)
                    })
        
        print(f"📈 Raw position counts: {position_counts}")
        print(f"🥅 Kickers in raw data: {len(kicker_players)}")
        
        if kicker_players:
            print("Sample kickers from raw data:")
            for i, kicker in enumerate(kicker_players[:5]):
                print(f"  {i+1}. {kicker['name']} ({kicker['team']}) - Rank {kicker['rank']}, Tier {kicker['tier']}")
        
        # Now test the processing
        print("\n🔄 Testing process_player_data method...")
        
        # Get tier data
        tier_data = scraper.extract_tier_data_enhanced()
        
        # Process the data
        result_df = scraper.process_player_data(players_data, 'half_ppr', True, tier_data)
        
        if result_df is not None:
            print(f"📊 Processed DataFrame has {len(result_df)} players")
            
            # Check for kickers in processed data
            kickers_in_df = result_df[result_df['Position'] == 'K']
            print(f"🥅 Kickers in processed DataFrame: {len(kickers_in_df)}")
            
            # Show position distribution
            pos_dist = result_df['Position'].value_counts()
            print(f"📈 Processed position distribution: {pos_dist.to_dict()}")
            
            if len(kickers_in_df) == 0:
                print("\n❌ PROBLEM: Kickers are being filtered out during processing!")
                print("Let's trace through the processing logic...")
                
                # Manual processing to find the issue
                debug_process_players(players_data, kicker_players)
        
    finally:
        scraper.driver.quit()

def debug_process_players(players_data, kicker_players):
    """Debug the player processing to find where kickers are lost"""
    print("\n🔍 Debugging player processing logic...")
    
    processed_kickers = 0
    skipped_kickers = []
    
    for player in players_data:
        if isinstance(player, dict):
            name = player.get('player_name', '').strip()
            pos = player.get('player_position_id', '').strip()
            
            if pos == 'K':
                # Check each condition that might skip this player
                team = player.get('player_team_id', '').strip()
                bye = player.get('player_bye_week', '0')
                rank = player.get('rank_ecr', 0)
                
                skip_reason = None
                
                # Check if essential data is missing
                if not name or not pos:
                    skip_reason = "Missing name or position"
                
                # Check if DST (this shouldn't affect kickers)
                elif pos == 'DST':
                    skip_reason = "DST filter"
                
                # Check rank
                elif rank == 0 or rank is None:
                    skip_reason = f"Invalid rank: {rank}"
                
                if skip_reason:
                    skipped_kickers.append({
                        'name': name,
                        'team': team,
                        'rank': rank,
                        'reason': skip_reason
                    })
                else:
                    processed_kickers += 1
    
    print(f"✅ Kickers that should be processed: {processed_kickers}")
    print(f"❌ Kickers that were skipped: {len(skipped_kickers)}")
    
    if skipped_kickers:
        print("Skipped kickers:")
        for kicker in skipped_kickers[:5]:
            print(f"  - {kicker['name']} ({kicker['team']}) - Rank {kicker['rank']} - Reason: {kicker['reason']}")

if __name__ == "__main__":
    debug_kicker_processing()
