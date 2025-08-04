#!/usr/bin/env python3
"""
Rankings Comparison Tool
Compare different Fantasy Pros rankings to see actual differences
"""

import pandas as pd
from pathlib import Path

def compare_rankings():
    """Compare different ranking formats to show actual differences"""
    
    data_dir = Path('/Users/edeclan/FantasyFootballTest/SleeperLiveDraftRankingsV2/data')
    
    # Load rankings
    std_df = pd.read_csv(data_dir / 'FantasyPros_Rankings_standard_standard.csv')
    ppr_df = pd.read_csv(data_dir / 'FantasyPros_Rankings_ppr_standard.csv')
    
    print("🏈 Fantasy Pros Rankings Comparison")
    print("=" * 50)
    
    # Focus on skill positions where PPR should matter
    skill_positions = ['QB', 'RB', 'WR', 'TE']
    
    std_skill = std_df[std_df['Position'].isin(skill_positions)].copy()
    ppr_skill = ppr_df[ppr_df['Position'].isin(skill_positions)].copy()
    
    print(f"Standard skill position players: {len(std_skill)}")
    print(f"PPR skill position players: {len(ppr_skill)}")
    
    # Merge on name to compare
    merged = pd.merge(
        std_skill[['Name', 'Position', 'Team', 'Overall Rank']], 
        ppr_skill[['Name', 'Position', 'Team', 'Overall Rank']], 
        on=['Name', 'Position', 'Team'], 
        suffixes=('_std', '_ppr'),
        how='inner'
    )
    
    print(f"Players in both rankings: {len(merged)}")
    
    # Calculate differences
    merged['rank_diff'] = merged['Overall Rank_std'] - merged['Overall Rank_ppr']
    merged['abs_diff'] = merged['rank_diff'].abs()
    
    # Show statistics
    print(f"\nRanking Differences:")
    print(f"Players with identical ranks: {len(merged[merged['rank_diff'] == 0])}")
    print(f"Players with different ranks: {len(merged[merged['rank_diff'] != 0])}")
    print(f"Average absolute difference: {merged['abs_diff'].mean():.2f}")
    print(f"Max difference: {merged['abs_diff'].max()}")
    
    # Show biggest differences
    biggest_diffs = merged.nlargest(20, 'abs_diff')
    
    print(f"\nTop 20 Biggest Differences (Standard vs PPR):")
    print("-" * 80)
    print(f"{'Player':<25} {'Pos':<4} {'Team':<4} {'Std Rank':<8} {'PPR Rank':<8} {'Diff':<6}")
    print("-" * 80)
    
    for _, row in biggest_diffs.iterrows():
        direction = "⬆️" if row['rank_diff'] > 0 else "⬇️" if row['rank_diff'] < 0 else "="
        print(f"{row['Name']:<25} {row['Position']:<4} {row['Team']:<4} {row['Overall Rank_std']:<8} {row['Overall Rank_ppr']:<8} {direction}{abs(row['rank_diff']):<5}")
    
    # Analyze by position
    print(f"\nDifferences by Position:")
    print("-" * 40)
    for pos in skill_positions:
        pos_data = merged[merged['Position'] == pos]
        if len(pos_data) > 0:
            avg_diff = pos_data['abs_diff'].mean()
            max_diff = pos_data['abs_diff'].max()
            different_count = len(pos_data[pos_data['rank_diff'] != 0])
            print(f"{pos}: {different_count}/{len(pos_data)} different, avg diff: {avg_diff:.2f}, max: {max_diff}")

if __name__ == "__main__":
    compare_rankings()
