#!/usr/bin/env python3
"""
Debug script for Fantasy Pros rankings analysis
Analyzes name matching and differences between standard and PPR rankings
"""

import pandas as pd
import os
from pathlib import Path

def analyze_fantasy_pros_rankings():
    """Analyze Fantasy Pros rankings for differences and name matching issues"""
    
    data_dir = Path('/Users/edeclan/FantasyFootballTest/SleeperLiveDraftRankingsV2/data')
    
    # Load the different ranking files
    rankings_files = {
        'standard_standard': data_dir / 'FantasyPros_Rankings_standard_standard.csv',
        'ppr_standard': data_dir / 'FantasyPros_Rankings_ppr_standard.csv',
        'half_ppr_standard': data_dir / 'FantasyPros_Rankings_half_ppr_standard.csv',
        'standard_superflex': data_dir / 'FantasyPros_Rankings_standard_superflex.csv',
        'ppr_superflex': data_dir / 'FantasyPros_Rankings_ppr_superflex.csv',
        'half_ppr_superflex': data_dir / 'FantasyPros_Rankings_half_ppr_superflex.csv'
    }
    
    rankings_data = {}
    
    print("🏈 Loading Fantasy Pros Rankings Files...")
    print("=" * 60)
    
    # Load all files
    for format_name, file_path in rankings_files.items():
        if file_path.exists():
            df = pd.read_csv(file_path)
            rankings_data[format_name] = df
            print(f"✅ {format_name}: {len(df)} players")
        else:
            print(f"❌ {format_name}: File not found")
    
    print("\n📊 Analyzing Differences Between Standard and PPR...")
    print("=" * 60)
    
    # Compare standard vs PPR
    if 'standard_standard' in rankings_data and 'ppr_standard' in rankings_data:
        std_df = rankings_data['standard_standard']
        ppr_df = rankings_data['ppr_standard']
        
        print(f"Standard players: {len(std_df)}")
        print(f"PPR players: {len(ppr_df)}")
        
        # Check if they have the same players
        std_names = set(std_df['Name'].str.upper())
        ppr_names = set(ppr_df['Name'].str.upper())
        
        print(f"Unique names in Standard: {len(std_names)}")
        print(f"Unique names in PPR: {len(ppr_names)}")
        print(f"Names in both: {len(std_names & ppr_names)}")
        print(f"Only in Standard: {len(std_names - ppr_names)}")
        print(f"Only in PPR: {len(ppr_names - std_names)}")
        
        if std_names - ppr_names:
            print(f"Players only in Standard: {list(std_names - ppr_names)[:10]}")
        if ppr_names - std_names:
            print(f"Players only in PPR: {list(ppr_names - std_names)[:10]}")
        
        # Compare rankings for same players
        print("\n🔄 Ranking Differences (Standard vs PPR):")
        print("-" * 40)
        
        # Merge on name to compare rankings
        std_ranks = std_df.set_index('Name')['Overall Rank'].to_dict()
        ppr_ranks = ppr_df.set_index('Name')['Overall Rank'].to_dict()
        
        differences = []
        for name in std_names & ppr_names:
            std_rank = std_ranks.get(name)
            ppr_rank = ppr_ranks.get(name)
            if std_rank != ppr_rank:
                diff = std_rank - ppr_rank
                differences.append({
                    'name': name,
                    'std_rank': std_rank,
                    'ppr_rank': ppr_rank,
                    'difference': diff
                })
        
        # Sort by biggest differences
        differences.sort(key=lambda x: abs(x['difference']), reverse=True)
        
        print(f"Total players with different rankings: {len(differences)}")
        print(f"Players with same rankings: {len(std_names & ppr_names) - len(differences)}")
        
        print("\nTop 20 Biggest Ranking Differences:")
        for i, diff in enumerate(differences[:20]):
            direction = "⬆️" if diff['difference'] > 0 else "⬇️"
            print(f"{i+1:2d}. {diff['name']:<25} | Std: {diff['std_rank']:3d} | PPR: {diff['ppr_rank']:3d} | {direction} {abs(diff['difference']):2d}")
    
    print("\n🔍 Analyzing Name Variations and Potential Issues...")
    print("=" * 60)
    
    # Analyze name patterns that might cause matching issues
    if 'ppr_standard' in rankings_data:
        df = rankings_data['ppr_standard']
        
        # Find players with special characters, periods, apostrophes
        special_names = []
        for name in df['Name']:
            if any(char in name for char in ['.', "'", '-', 'Jr', 'Sr', 'III', 'IV']):
                special_names.append(name)
        
        print(f"Players with special characters: {len(special_names)}")
        print("Examples:")
        for name in special_names[:15]:
            print(f"  - {name}")
        
        # Find players with common first names that might have variations
        common_variations = {
            'David': ['Dave', 'D.J.', 'DJ'],
            'Michael': ['Mike'],
            'Christopher': ['Chris'],
            'Matthew': ['Matt'],
            'Daniel': ['Dan', 'Danny'],
            'Thomas': ['Tom', 'T.J.', 'TJ'],
            'Anthony': ['Tony'],
            'Cameron': ['Cam'],
            'Alexander': ['Alex'],
            'Benjamin': ['Ben']
        }
        
        print(f"\n👥 Players with Common Name Variations:")
        for full_name, variations in common_variations.items():
            matching_players = []
            for name in df['Name']:
                if any(var in name for var in [full_name] + variations):
                    matching_players.append(name)
            
            if matching_players:
                print(f"{full_name} variations: {matching_players}")
        
        # Look for duplicate-like names (same last name, similar first name)
        print(f"\n🔄 Potential Name Conflicts:")
        last_names = {}
        for _, row in df.iterrows():
            name = row['Name']
            parts = name.split()
            if len(parts) >= 2:
                last_name = parts[-1]
                if last_name not in last_names:
                    last_names[last_name] = []
                last_names[last_name].append({
                    'name': name,
                    'position': row['Position'],
                    'team': row['Team'],
                    'rank': row['Overall Rank']
                })
        
        # Find last names with multiple players
        conflicts = {ln: players for ln, players in last_names.items() if len(players) > 1}
        
        print(f"Last names with multiple players: {len(conflicts)}")
        for last_name, players in list(conflicts.items())[:10]:
            print(f"\n{last_name}:")
            for player in players:
                print(f"  - {player['name']} ({player['position']}, {player['team']}) - Rank {player['rank']}")
    
    print("\n📈 Position Distribution Analysis:")
    print("=" * 60)
    
    if 'ppr_standard' in rankings_data:
        df = rankings_data['ppr_standard']
        position_counts = df['Position'].value_counts()
        
        print("Position distribution:")
        for pos, count in position_counts.items():
            print(f"  {pos}: {count} players")
        
        # Show top players by position
        print(f"\nTop 5 players by position:")
        for pos in ['QB', 'RB', 'WR', 'TE']:
            pos_players = df[df['Position'] == pos].head(5)
            print(f"\n{pos}:")
            for _, player in pos_players.iterrows():
                print(f"  {player['Overall Rank']:3d}. {player['Name']} ({player['Team']})")

def analyze_sleeper_name_mapping():
    """Test name mapping with Sleeper API data"""
    print("\n🌐 Testing Sleeper API Name Mapping...")
    print("=" * 60)
    
    try:
        import requests
        
        # Get Sleeper players
        response = requests.get('https://api.sleeper.app/v1/players/nfl')
        if response.status_code == 200:
            sleeper_players = response.json()
            print(f"✅ Loaded {len(sleeper_players)} Sleeper players")
            
            # Test problematic names
            test_names = [
                'Lamar Jackson',
                'D.J. Moore', 
                'David Moore',
                'David Montgomery',
                'A.J. Brown',
                'T.J. Hockenson',
                'C.J. Stroud'
            ]
            
            print(f"\n🔍 Testing Name Variations:")
            for test_name in test_names:
                print(f"\nSearching for: {test_name}")
                matches = []
                
                for player_id, player_data in sleeper_players.items():
                    if not player_data:
                        continue
                    
                    first_name = player_data.get('first_name', '')
                    last_name = player_data.get('last_name', '')
                    full_name = f"{first_name} {last_name}".strip()
                    
                    # Check for matches
                    if test_name.upper() in full_name.upper() or full_name.upper() in test_name.upper():
                        matches.append({
                            'id': player_id,
                            'name': full_name,
                            'position': player_data.get('position'),
                            'team': player_data.get('team'),
                            'status': player_data.get('status')
                        })
                
                print(f"  Found {len(matches)} matches:")
                for match in matches[:5]:  # Show top 5 matches
                    print(f"    - {match['name']} ({match['position']}, {match['team']}) [ID: {match['id']}] - {match['status']}")
        
        else:
            print(f"❌ Failed to load Sleeper players: {response.status_code}")
    
    except Exception as e:
        print(f"❌ Error testing Sleeper API: {e}")

if __name__ == "__main__":
    print("🏈 Fantasy Pros Rankings Debug Analysis")
    print("=" * 60)
    
    analyze_fantasy_pros_rankings()
    analyze_sleeper_name_mapping()
    
    print(f"\n✅ Analysis Complete!")
