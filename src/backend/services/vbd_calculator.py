"""
Value-Based Drafting (VBD) Calculator for Fantasy Football Draft Assistant V2

This module calculates Value-Based Drafting metrics to help users make better draft decisions.
VBD compares a player's projected points to a baseline "replacement level" player at the same position.

Part of Sprint 4: User Experience implementation.
"""

from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import statistics


class VBDCalculator:
    """Calculates Value-Based Drafting metrics for players"""
    
    def __init__(self):
        """Initialize the VBD calculator"""
        # Standard lineup requirements for VBD calculations
        self.lineup_requirements = {
            'standard': {
                'QB': 1,
                'RB': 2,
                'WR': 2,
                'TE': 1,
                'FLEX': 1,  # RB/WR/TE
                'K': 1,
                'DEF': 1
            },
            'superflex': {
                'QB': 1,
                'RB': 2,
                'WR': 2,
                'TE': 1,
                'FLEX': 1,  # RB/WR/TE
                'SUPERFLEX': 1,  # QB/RB/WR/TE
                'K': 1,
                'DEF': 1
            }
        }
        
        # Typical league settings for baseline calculations
        self.default_league_size = 12
        
        # Position scarcity multipliers (higher = more scarce)
        self.scarcity_multipliers = {
            'QB': 1.0,
            'RB': 1.3,
            'WR': 1.1,
            'TE': 1.5,
            'K': 0.8,
            'DEF': 0.8
        }
    
    def calculate_vbd_metrics(self, players: List[Dict], league_format: str = 'standard', 
                            league_size: int = 12) -> Dict:
        """
        Calculate VBD metrics for all players
        
        Args:
            players: List of player dictionaries with rankings/projections
            league_format: League format ('standard' or 'superflex')
            league_size: Number of teams in the league
            
        Returns:
            Dictionary with VBD calculations and baselines
        """
        try:
            # Group players by position
            players_by_position = defaultdict(list)
            for player in players:
                position = player.get('position', 'Unknown')
                if position in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']:
                    players_by_position[position].append(player)
            
            # Calculate baselines for each position
            baselines = self._calculate_baselines(players_by_position, league_format, league_size)
            
            # Calculate VBD for each player
            vbd_players = []
            for player in players:
                vbd_metrics = self._calculate_player_vbd(player, baselines)
                if vbd_metrics:
                    player_with_vbd = {**player, **vbd_metrics}
                    vbd_players.append(player_with_vbd)
            
            # Sort by VBD value (highest first)
            vbd_players.sort(key=lambda x: x.get('vbd_value', 0), reverse=True)
            
            # Add VBD ranks
            for i, player in enumerate(vbd_players):
                player['vbd_rank'] = i + 1
            
            return {
                'players': vbd_players,
                'baselines': baselines,
                'league_format': league_format,
                'league_size': league_size,
                'total_players': len(vbd_players)
            }
            
        except Exception as e:
            print(f"❌ Error calculating VBD metrics: {e}")
            return {
                'players': [],
                'baselines': {},
                'error': str(e)
            }
    
    def _calculate_baselines(self, players_by_position: Dict, league_format: str, 
                           league_size: int) -> Dict:
        """Calculate replacement level baselines for each position"""
        baselines = {}
        requirements = self.lineup_requirements.get(league_format, self.lineup_requirements['standard'])
        
        for position, position_players in players_by_position.items():
            if not position_players:
                baselines[position] = 0
                continue
            
            # Sort players by projected points (highest first)
            sorted_players = sorted(position_players, 
                                  key=lambda x: x.get('projected_points', x.get('tier', 999)), 
                                  reverse=True)
            
            # Calculate how many players of this position will be drafted
            base_starters = requirements.get(position, 0) * league_size
            
            # Add flex considerations
            flex_eligible = position in ['RB', 'WR', 'TE']
            superflex_eligible = position in ['QB', 'RB', 'WR', 'TE'] and league_format == 'superflex'
            
            additional_demand = 0
            if flex_eligible:
                additional_demand += requirements.get('FLEX', 0) * league_size * 0.3  # 30% of flex spots
            if superflex_eligible:
                additional_demand += requirements.get('SUPERFLEX', 0) * league_size * 0.2  # 20% of superflex
            
            # Add bench demand (typically 2-3 players per position)
            bench_multiplier = self._get_bench_multiplier(position)
            bench_demand = base_starters * bench_multiplier
            
            total_demand = int(base_starters + additional_demand + bench_demand)
            
            # Baseline is the projected points of the player at the replacement level
            if len(sorted_players) > total_demand:
                baseline_player = sorted_players[total_demand]
                baselines[position] = baseline_player.get('projected_points', 
                                                        self._estimate_points_from_tier(baseline_player))
            else:
                # If not enough players, use the last available player
                baselines[position] = sorted_players[-1].get('projected_points', 
                                                           self._estimate_points_from_tier(sorted_players[-1]))
        
        return baselines
    
    def _get_bench_multiplier(self, position: str) -> float:
        """Get bench demand multiplier for position"""
        multipliers = {
            'QB': 0.5,   # Most teams carry 1-2 QBs
            'RB': 1.5,   # RBs get injured, high demand
            'WR': 1.2,   # Good depth position
            'TE': 0.8,   # Many teams stream TEs
            'K': 0.1,    # Most stream kickers
            'DEF': 0.2   # Most stream defenses
        }
        return multipliers.get(position, 1.0)
    
    def _calculate_player_vbd(self, player: Dict, baselines: Dict) -> Optional[Dict]:
        """Calculate VBD metrics for a single player"""
        position = player.get('position')
        if position not in baselines:
            return None
        
        # Get player's projected points
        projected_points = player.get('projected_points')
        if projected_points is None:
            projected_points = self._estimate_points_from_tier(player)
        
        if projected_points is None:
            return None
        
        # Calculate raw VBD
        baseline = baselines[position]
        raw_vbd = projected_points - baseline
        
        # Apply position scarcity multiplier
        scarcity_multiplier = self.scarcity_multipliers.get(position, 1.0)
        adjusted_vbd = raw_vbd * scarcity_multiplier
        
        # Calculate positional value (how much better than average at position)
        position_rank = player.get('position_rank', player.get('tier', 999))
        
        return {
            'vbd_value': round(adjusted_vbd, 2),
            'raw_vbd': round(raw_vbd, 2),
            'baseline_points': round(baseline, 2),
            'projected_points': round(projected_points, 2),
            'scarcity_multiplier': scarcity_multiplier,
            'position_scarcity': self._calculate_position_scarcity(position, position_rank)
        }
    
    def _estimate_points_from_tier(self, player: Dict) -> Optional[float]:
        """Estimate projected points from tier/rank information"""
        tier = player.get('tier')
        position = player.get('position')
        
        if tier is None:
            return None
        
        # Rough point estimates by position and tier
        point_estimates = {
            'QB': {1: 320, 2: 300, 3: 280, 4: 260, 5: 240, 6: 220, 7: 200, 8: 180},
            'RB': {1: 280, 2: 250, 3: 220, 4: 200, 5: 180, 6: 160, 7: 140, 8: 120},
            'WR': {1: 260, 2: 230, 3: 200, 4: 180, 5: 160, 6: 140, 7: 120, 8: 100},
            'TE': {1: 180, 2: 150, 3: 130, 4: 110, 5: 95, 6: 85, 7: 75, 8: 65},
            'K': {1: 140, 2: 130, 3: 125, 4: 120, 5: 115, 6: 110, 7: 105, 8: 100},
            'DEF': {1: 150, 2: 140, 3: 130, 4: 125, 5: 120, 6: 115, 7: 110, 8: 105}
        }
        
        position_estimates = point_estimates.get(position, {})
        
        # Use tier directly if available, otherwise extrapolate
        if tier in position_estimates:
            return float(position_estimates[tier])
        elif tier > 8:
            # Extrapolate for lower tiers
            base_points = position_estimates.get(8, 100)
            decline_per_tier = 10
            return max(50, base_points - (tier - 8) * decline_per_tier)
        else:
            return None
    
    def _calculate_position_scarcity(self, position: str, position_rank: int) -> str:
        """Calculate position scarcity rating"""
        scarcity_thresholds = {
            'QB': {'high': 12, 'medium': 20},
            'RB': {'high': 24, 'medium': 36},
            'WR': {'high': 30, 'medium': 48},
            'TE': {'high': 12, 'medium': 20},
            'K': {'high': 15, 'medium': 25},
            'DEF': {'high': 15, 'medium': 25}
        }
        
        thresholds = scarcity_thresholds.get(position, {'high': 20, 'medium': 35})
        
        if position_rank <= thresholds['high']:
            return 'High'
        elif position_rank <= thresholds['medium']:
            return 'Medium'
        else:
            return 'Low'
    
    def get_draft_recommendations(self, available_players: List[Dict], team_needs: Dict, 
                                num_recommendations: int = 5) -> List[Dict]:
        """
        Get VBD-based draft recommendations considering team needs
        
        Args:
            available_players: List of available players with VBD metrics
            team_needs: Team needs from team analyzer
            num_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended players with reasoning
        """
        try:
            recommendations = []
            
            # Get need priorities
            critical_needs = team_needs.get('critical', [])
            important_needs = team_needs.get('important', [])
            
            # Score players based on VBD and team needs
            scored_players = []
            for player in available_players:
                if not player.get('vbd_value'):
                    continue
                
                position = player.get('position')
                vbd_value = player.get('vbd_value', 0)
                
                # Base score is VBD value
                score = vbd_value
                
                # Boost score based on team needs
                if position in critical_needs:
                    score *= 1.5  # 50% boost for critical needs
                elif position in important_needs:
                    score *= 1.2  # 20% boost for important needs
                
                # Consider position scarcity
                scarcity = player.get('position_scarcity', 'Low')
                if scarcity == 'High':
                    score *= 1.1
                elif scarcity == 'Medium':
                    score *= 1.05
                
                scored_players.append({
                    'player': player,
                    'recommendation_score': score,
                    'vbd_value': vbd_value,
                    'need_priority': 'Critical' if position in critical_needs else 
                                   'Important' if position in important_needs else 'Depth'
                })
            
            # Sort by recommendation score
            scored_players.sort(key=lambda x: x['recommendation_score'], reverse=True)
            
            # Build recommendations
            for i, scored_player in enumerate(scored_players[:num_recommendations]):
                player = scored_player['player']
                
                # Generate reasoning
                reasoning = self._generate_recommendation_reasoning(scored_player, team_needs)
                
                recommendations.append({
                    'rank': i + 1,
                    'player': player,
                    'vbd_value': scored_player['vbd_value'],
                    'recommendation_score': round(scored_player['recommendation_score'], 2),
                    'need_priority': scored_player['need_priority'],
                    'reasoning': reasoning
                })
            
            return recommendations
            
        except Exception as e:
            print(f"❌ Error generating VBD recommendations: {e}")
            return []
    
    def _generate_recommendation_reasoning(self, scored_player: Dict, team_needs: Dict) -> str:
        """Generate human-readable reasoning for recommendation"""
        player = scored_player['player']
        position = player.get('position', 'Unknown')
        vbd_value = scored_player['vbd_value']
        need_priority = scored_player['need_priority']
        scarcity = player.get('position_scarcity', 'Low')
        
        reasoning_parts = []
        
        # VBD value reasoning
        if vbd_value > 20:
            reasoning_parts.append(f"Excellent value ({vbd_value:.1f} VBD)")
        elif vbd_value > 10:
            reasoning_parts.append(f"Good value ({vbd_value:.1f} VBD)")
        elif vbd_value > 0:
            reasoning_parts.append(f"Positive value ({vbd_value:.1f} VBD)")
        else:
            reasoning_parts.append(f"Below replacement level ({vbd_value:.1f} VBD)")
        
        # Team need reasoning
        if need_priority == 'Critical':
            reasoning_parts.append(f"Fills critical {position} need")
        elif need_priority == 'Important':
            reasoning_parts.append(f"Addresses important {position} need")
        else:
            reasoning_parts.append(f"Provides {position} depth")
        
        # Scarcity reasoning
        if scarcity == 'High':
            reasoning_parts.append(f"High positional scarcity")
        elif scarcity == 'Medium':
            reasoning_parts.append(f"Moderate positional scarcity")
        
        return "; ".join(reasoning_parts)
