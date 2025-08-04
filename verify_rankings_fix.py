#!/usr/bin/env python3
"""
Verify that the Fantasy Pros rankings fix is working correctly
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.backend.rankings.SimpleRankingsManager import SimpleRankingsManager

def verify_rankings_fix():
    """Verify that the rankings are now working correctly"""
    
    print("🔧 Verifying Fantasy Pros Rankings Fix...")
    print("=" * 60)
    
    manager = SimpleRankingsManager()
    
    # Test the key differences we expect to see
    test_cases = [
        {
            'name': 'PPR Standard vs Superflex - Top Players',
            'formats': ['ppr_standard', 'ppr_superflex'],
            'limit': 10,
            'expected_differences': [
                'Josh Allen should be #1 in superflex, ~#32 in standard',
                'Saquon Barkley should be #1 in standard, ~#7 in superflex'
            ]
        },
        {
            'name': 'QB Rankings Comparison',
            'formats': ['ppr_standard', 'ppr_superflex'],
            'position': 'QB',
            'limit': 5,
            'expected_differences': [
                'All QBs should rank much higher in superflex',
                'Josh Allen should be #1 overall in superflex'
            ]
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🎯 {test_case['name']}:")
        print("-" * 50)
        
        results = {}
        
        for format_name in test_case['formats']:
            players = manager.get_available_players(
                drafted_players=[],
                league_format=format_name,
                position_filter=test_case.get('position'),
                limit=test_case['limit']
            )
            results[format_name] = players
        
        # Display side by side
        format1, format2 = test_case['formats']
        players1, players2 = results[format1], results[format2]
        
        print(f"{'Rank':<4} {format1.replace('_', ' ').title():<30} {'|':<2} {format2.replace('_', ' ').title():<30}")
        print("-" * 70)
        
        max_players = max(len(players1), len(players2))
        for i in range(max_players):
            p1 = players1[i] if i < len(players1) else {'name': '', 'rank': '', 'position': ''}
            p2 = players2[i] if i < len(players2) else {'name': '', 'rank': '', 'position': ''}
            
            p1_display = f"{p1['name']} ({p1['position']}) - #{p1['rank']}"
            p2_display = f"{p2['name']} ({p2['position']}) - #{p2['rank']}"
            
            print(f"{i+1:<4} {p1_display:<30} {'|':<2} {p2_display:<30}")
        
        print(f"\nExpected Differences:")
        for diff in test_case['expected_differences']:
            print(f"  ✓ {diff}")
    
    # Verify specific players
    print(f"\n🔍 Specific Player Verification:")
    print("-" * 50)
    
    key_players = [
        {'name': 'Josh Allen', 'position': 'QB'},
        {'name': 'Saquon Barkley', 'position': 'RB'},
        {'name': 'Lamar Jackson', 'position': 'QB'},
        {'name': 'Ja\'Marr Chase', 'position': 'WR'}
    ]
    
    for player_info in key_players:
        print(f"\n{player_info['name']} ({player_info['position']}):")
        
        for format_name in ['ppr_standard', 'ppr_superflex']:
            players = manager.get_available_players(
                drafted_players=[],
                league_format=format_name,
                limit=100  # Get enough to find the player
            )
            
            # Find the player
            found_player = None
            for player in players:
                if player['name'].lower() == player_info['name'].lower():
                    found_player = player
                    break
            
            if found_player:
                print(f"  {format_name.replace('_', ' ').title()}: Rank #{found_player['rank']}")
            else:
                print(f"  {format_name.replace('_', ' ').title()}: Not found in top 100")
    
    print(f"\n✅ Rankings Fix Verification Complete!")
    print(f"If you see different rankings between standard and superflex above, the fix is working! 🎉")

if __name__ == "__main__":
    verify_rankings_fix()
