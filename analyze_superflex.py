#!/usr/bin/env python3
"""
Analyze Fantasy Pros Superflex vs Standard Rankings
Check if we're correctly pulling different ranking formats
"""

import pandas as pd
from pathlib import Path
import requests
import json

def analyze_superflex_differences():
    """Analyze the differences between standard and superflex rankings"""
    
    data_dir = Path('/Users/edeclan/FantasyFootballTest/SleeperLiveDraftRankingsV2/data')
    
    # Load rankings
    std_df = pd.read_csv(data_dir / 'FantasyPros_Rankings_ppr_standard.csv')
    sf_df = pd.read_csv(data_dir / 'FantasyPros_Rankings_ppr_superflex.csv')
    
    print("🏈 Fantasy Pros Standard vs Superflex Analysis")
    print("=" * 60)
    
    print(f"Standard players: {len(std_df)}")
    print(f"Superflex players: {len(sf_df)}")
    
    # Show top 20 in each format
    print(f"\n📊 Top 20 Players - Standard vs Superflex:")
    print("-" * 80)
    print(f"{'Rank':<4} {'Standard':<25} {'Pos':<4} {'|':<2} {'Superflex':<25} {'Pos':<4}")
    print("-" * 80)
    
    for i in range(20):
        std_player = std_df.iloc[i] if i < len(std_df) else {'Name': '', 'Position': ''}
        sf_player = sf_df.iloc[i] if i < len(sf_df) else {'Name': '', 'Position': ''}
        
        print(f"{i+1:<4} {std_player['Name']:<25} {std_player['Position']:<4} {'|':<2} {sf_player['Name']:<25} {sf_player['Position']:<4}")
    
    # Analyze QB rankings specifically
    print(f"\n🎯 QB Rankings Comparison:")
    print("-" * 60)
    
    std_qbs = std_df[std_df['Position'] == 'QB'].head(15)
    sf_qbs = sf_df[sf_df['Position'] == 'QB'].head(15)
    
    print(f"{'Rank':<4} {'Standard QB':<25} {'Overall':<8} {'|':<2} {'Superflex QB':<25} {'Overall':<8}")
    print("-" * 60)
    
    max_qbs = max(len(std_qbs), len(sf_qbs))
    for i in range(max_qbs):
        std_qb = std_qbs.iloc[i] if i < len(std_qbs) else {'Name': '', 'Overall Rank': ''}
        sf_qb = sf_qbs.iloc[i] if i < len(sf_qbs) else {'Name': '', 'Overall Rank': ''}
        
        print(f"{i+1:<4} {std_qb['Name']:<25} {std_qb['Overall Rank']:<8} {'|':<2} {sf_qb['Name']:<25} {sf_qb['Overall Rank']:<8}")
    
    # Find common players and compare their rankings
    print(f"\n🔄 Ranking Changes for Same Players:")
    print("-" * 70)
    
    # Merge on name to compare rankings
    merged = pd.merge(
        std_df[['Name', 'Position', 'Team', 'Overall Rank']], 
        sf_df[['Name', 'Position', 'Team', 'Overall Rank']], 
        on=['Name', 'Position', 'Team'], 
        suffixes=('_std', '_sf'),
        how='inner'
    )
    
    # Calculate differences
    merged['rank_diff'] = merged['Overall Rank_std'] - merged['Overall Rank_sf']
    merged['abs_diff'] = merged['rank_diff'].abs()
    
    print(f"Players in both formats: {len(merged)}")
    print(f"Players with identical ranks: {len(merged[merged['rank_diff'] == 0])}")
    print(f"Players with different ranks: {len(merged[merged['rank_diff'] != 0])}")
    print(f"Average absolute difference: {merged['abs_diff'].mean():.2f}")
    print(f"Max difference: {merged['abs_diff'].max()}")
    
    # Show biggest movers
    biggest_movers = merged.nlargest(20, 'abs_diff')
    
    print(f"\nTop 20 Biggest Movers (Standard → Superflex):")
    print("-" * 80)
    print(f"{'Player':<25} {'Pos':<4} {'Std Rank':<8} {'SF Rank':<8} {'Change':<10}")
    print("-" * 80)
    
    for _, row in biggest_movers.iterrows():
        if row['rank_diff'] > 0:
            change = f"⬇️ -{row['rank_diff']}"  # Moved down in superflex (worse)
        elif row['rank_diff'] < 0:
            change = f"⬆️ +{abs(row['rank_diff'])}"  # Moved up in superflex (better)
        else:
            change = "="
        
        print(f"{row['Name']:<25} {row['Position']:<4} {row['Overall Rank_std']:<8} {row['Overall Rank_sf']:<8} {change:<10}")
    
    # Analyze by position
    print(f"\nPosition-wise Analysis:")
    print("-" * 40)
    for pos in ['QB', 'RB', 'WR', 'TE']:
        pos_data = merged[merged['Position'] == pos]
        if len(pos_data) > 0:
            avg_diff = pos_data['rank_diff'].mean()  # Positive = moved down in SF, Negative = moved up in SF
            different_count = len(pos_data[pos_data['rank_diff'] != 0])
            
            if avg_diff > 0:
                trend = f"⬇️ avg -{avg_diff:.1f}"
            elif avg_diff < 0:
                trend = f"⬆️ avg +{abs(avg_diff):.1f}"
            else:
                trend = "no change"
            
            print(f"{pos}: {different_count}/{len(pos_data)} changed, {trend}")

def test_api_rankings_loading():
    """Test how our API loads and serves the rankings"""
    
    print(f"\n🔧 Testing API Rankings Loading...")
    print("=" * 60)
    
    try:
        # Test the rankings list endpoint
        response = requests.get('http://localhost:5000/api/rankings/list')
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Response: {data['status']}")
            print(f"📊 Found {len(data['rankings'])} ranking files")
            
            # Show available rankings
            print(f"\nAvailable Rankings:")
            for ranking in data['rankings']:
                print(f"  - {ranking['id']}: {ranking['name']} ({ranking['scoring']} - {ranking['format']})")
                print(f"    Players: {ranking['metadata']['total_players']}")
        
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API - make sure the server is running on localhost:5000")
    except Exception as e:
        print(f"❌ Error testing API: {e}")

def test_specific_ranking_data():
    """Test loading specific ranking data through the API"""
    
    print(f"\n🎯 Testing Specific Ranking Data...")
    print("=" * 60)
    
    test_rankings = [
        'FantasyPros_Rankings_ppr_standard',
        'FantasyPros_Rankings_ppr_superflex'
    ]
    
    for ranking_id in test_rankings:
        try:
            response = requests.get(f'http://localhost:5000/api/rankings/data/{ranking_id}')
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {ranking_id}:")
                print(f"   Status: {data['status']}")
                print(f"   Players: {data['total_players']}")
                
                # Show top 5 players
                if 'players' in data and len(data['players']) > 0:
                    print(f"   Top 5 players:")
                    for i, player in enumerate(data['players'][:5]):
                        name = player.get('name', 'Unknown')
                        position = player.get('position', 'Unknown')
                        rank = player.get('overall_rank', 'Unknown')
                        print(f"     {i+1}. {name} ({position}) - Rank {rank}")
                
            else:
                print(f"❌ {ranking_id}: Error {response.status_code}")
                print(f"   Response: {response.text}")
        
        except requests.exceptions.ConnectionError:
            print(f"❌ Could not connect to API for {ranking_id}")
        except Exception as e:
            print(f"❌ Error testing {ranking_id}: {e}")

if __name__ == "__main__":
    analyze_superflex_differences()
    test_api_rankings_loading()
    test_specific_ranking_data()
