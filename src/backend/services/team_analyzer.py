"""
Team Analyzer for Fantasy Football Draft Assistant V2

This module analyzes team rosters and provides insights for draft decisions.
Part of Sprint 3: Enhanced Analytics implementation.
"""

from typing import Dict, List, Optional, Set, Tuple
from collections import defaultdict, Counter
import json


class TeamAnalyzer:
    """Analyzes team rosters and provides draft insights"""
    
    def __init__(self):
        """Initialize the team analyzer"""
        self.position_requirements = {
            'standard': {
                'QB': 1,
                'RB': 2,
                'WR': 2,
                'TE': 1,
                'FLEX': 1,  # RB/WR/TE
                'K': 1,
                'DEF': 1,
                'BENCH': 6
            },
            'superflex': {
                'QB': 1,
                'RB': 2,
                'WR': 2,
                'TE': 1,
                'FLEX': 1,  # RB/WR/TE
                'SUPERFLEX': 1,  # QB/RB/WR/TE
                'K': 1,
                'DEF': 1,
                'BENCH': 5
            }
        }
    
    def analyze_team_rosters(self, draft_picks: List[Dict], draft_info: Dict, all_players: Dict) -> Dict:
        """
        Analyze all team rosters from draft picks
        
        Args:
            draft_picks: List of draft picks with player info
            draft_info: Draft information including settings
            all_players: Dictionary of all player data
            
        Returns:
            Dictionary with team roster analysis
        """
        try:
            # Get draft settings
            total_teams = draft_info.get('settings', {}).get('teams', 12)
            total_rounds = draft_info.get('settings', {}).get('rounds', 16)
            
            # Initialize team rosters
            team_rosters = {}
            for i in range(total_teams):
                team_rosters[i] = {
                    'team_index': i,
                    'picks': [],
                    'positions': defaultdict(list),
                    'position_counts': defaultdict(int),
                    'total_picks': 0,
                    'rounds_completed': 0
                }
            
            # Process each pick
            for pick in draft_picks:
                pick_no = pick.get('pick_no', 0)
                round_num = pick.get('round', 0)
                player_id = pick.get('player_id')
                
                if pick_no > 0 and round_num > 0 and player_id:
                    # Calculate team index from pick number
                    team_index = self._calculate_team_index(pick_no, total_teams, draft_info.get('type', 'snake'))
                    
                    if 0 <= team_index < total_teams:
                        # Get player info
                        player_data = all_players.get(player_id, {})
                        position = player_data.get('position', 'Unknown')
                        
                        # Add to team roster
                        pick_info = {
                            'pick_no': pick_no,
                            'round': round_num,
                            'player_id': player_id,
                            'player_name': pick.get('player_name', f'Player {player_id}'),
                            'position': position,
                            'team': player_data.get('team', 'N/A')
                        }
                        
                        team_rosters[team_index]['picks'].append(pick_info)
                        team_rosters[team_index]['positions'][position].append(pick_info)
                        team_rosters[team_index]['position_counts'][position] += 1
                        team_rosters[team_index]['total_picks'] += 1
                        team_rosters[team_index]['rounds_completed'] = max(
                            team_rosters[team_index]['rounds_completed'], 
                            round_num
                        )
            
            # Analyze each team's needs and strengths
            for team_index, roster in team_rosters.items():
                roster.update(self._analyze_team_needs(roster, total_rounds))
            
            return {
                'team_rosters': team_rosters,
                'total_teams': total_teams,
                'total_rounds': total_rounds,
                'draft_type': draft_info.get('type', 'snake'),
                'analysis_summary': self._generate_analysis_summary(team_rosters)
            }
            
        except Exception as e:
            print(f"❌ Error analyzing team rosters: {e}")
            return {
                'error': str(e),
                'team_rosters': {},
                'total_teams': 0,
                'total_rounds': 0
            }
    
    def _calculate_team_index(self, pick_no: int, total_teams: int, draft_type: str) -> int:
        """Calculate team index from pick number based on draft type"""
        if draft_type == 'snake':
            round_num = ((pick_no - 1) // total_teams) + 1
            if round_num % 2 == 1:  # Odd rounds: 1, 2, 3, ...
                return (pick_no - 1) % total_teams
            else:  # Even rounds: ..., 3, 2, 1
                return total_teams - 1 - ((pick_no - 1) % total_teams)
        else:  # Linear draft
            return (pick_no - 1) % total_teams
    
    def _analyze_team_needs(self, roster: Dict, total_rounds: int) -> Dict:
        """Analyze a team's positional needs and strengths"""
        position_counts = roster['position_counts']
        
        # Calculate needs based on standard lineup requirements
        needs = {
            'critical': [],  # Must-have positions
            'important': [], # Should-have positions
            'depth': [],     # Nice-to-have depth
            'luxury': []     # Luxury picks
        }
        
        # Critical needs (starting lineup positions)
        if position_counts.get('QB', 0) == 0:
            needs['critical'].append('QB')
        if position_counts.get('RB', 0) < 2:
            needs['critical'].append('RB')
        if position_counts.get('WR', 0) < 2:
            needs['critical'].append('WR')
        if position_counts.get('TE', 0) == 0:
            needs['critical'].append('TE')
        
        # Important needs (depth and flex)
        if position_counts.get('RB', 0) < 3:
            needs['important'].append('RB')
        if position_counts.get('WR', 0) < 3:
            needs['important'].append('WR')
        if position_counts.get('QB', 0) < 2:
            needs['important'].append('QB')
        if position_counts.get('TE', 0) < 2:
            needs['important'].append('TE')
        
        # Depth needs
        if position_counts.get('RB', 0) < 4:
            needs['depth'].append('RB')
        if position_counts.get('WR', 0) < 5:
            needs['depth'].append('WR')
        
        # Late round needs
        if position_counts.get('K', 0) == 0 and roster['rounds_completed'] > 12:
            needs['important'].append('K')
        if position_counts.get('DEF', 0) == 0 and roster['rounds_completed'] > 13:
            needs['important'].append('DEF')
        
        # Calculate team strength
        strength_score = self._calculate_team_strength(position_counts)
        
        # Position rankings within team
        position_strength = {}
        for pos, count in position_counts.items():
            if pos in ['QB', 'RB', 'WR', 'TE']:
                position_strength[pos] = self._rate_position_strength(pos, count, roster['rounds_completed'])
        
        return {
            'needs': needs,
            'strength_score': strength_score,
            'position_strength': position_strength,
            'roster_balance': self._calculate_roster_balance(position_counts),
            'draft_strategy': self._identify_draft_strategy(roster['picks'])
        }
    
    def _calculate_team_strength(self, position_counts: Dict) -> float:
        """Calculate overall team strength score (0-100)"""
        score = 0
        max_score = 100
        
        # Starting lineup coverage (60 points max)
        if position_counts.get('QB', 0) >= 1:
            score += 10
        if position_counts.get('RB', 0) >= 2:
            score += 15
        elif position_counts.get('RB', 0) >= 1:
            score += 8
        if position_counts.get('WR', 0) >= 2:
            score += 15
        elif position_counts.get('WR', 0) >= 1:
            score += 8
        if position_counts.get('TE', 0) >= 1:
            score += 10
        if position_counts.get('K', 0) >= 1:
            score += 5
        if position_counts.get('DEF', 0) >= 1:
            score += 5
        
        # Depth scoring (40 points max)
        score += min(position_counts.get('RB', 0) - 2, 2) * 5  # RB depth
        score += min(position_counts.get('WR', 0) - 2, 3) * 5  # WR depth
        score += min(position_counts.get('QB', 0) - 1, 1) * 5  # QB backup
        score += min(position_counts.get('TE', 0) - 1, 1) * 5  # TE backup
        
        return min(score, max_score)
    
    def _rate_position_strength(self, position: str, count: int, rounds_completed: int) -> str:
        """Rate the strength of a position group"""
        if position == 'QB':
            if count >= 2:
                return 'Strong'
            elif count >= 1:
                return 'Adequate'
            else:
                return 'Weak'
        elif position in ['RB', 'WR']:
            if count >= 4:
                return 'Strong'
            elif count >= 3:
                return 'Adequate'
            elif count >= 2:
                return 'Minimal'
            else:
                return 'Weak'
        elif position == 'TE':
            if count >= 2:
                return 'Strong'
            elif count >= 1:
                return 'Adequate'
            else:
                return 'Weak'
        else:
            return 'Unknown'
    
    def _calculate_roster_balance(self, position_counts: Dict) -> Dict:
        """Calculate roster balance metrics"""
        total_skill_positions = (
            position_counts.get('QB', 0) + 
            position_counts.get('RB', 0) + 
            position_counts.get('WR', 0) + 
            position_counts.get('TE', 0)
        )
        
        if total_skill_positions == 0:
            return {'balance_score': 0, 'distribution': {}}
        
        distribution = {
            'QB': position_counts.get('QB', 0) / total_skill_positions,
            'RB': position_counts.get('RB', 0) / total_skill_positions,
            'WR': position_counts.get('WR', 0) / total_skill_positions,
            'TE': position_counts.get('TE', 0) / total_skill_positions
        }
        
        # Calculate balance score (higher is more balanced)
        ideal_distribution = {'QB': 0.15, 'RB': 0.35, 'WR': 0.40, 'TE': 0.10}
        balance_score = 100 - sum(
            abs(distribution[pos] - ideal_distribution[pos]) * 100 
            for pos in ideal_distribution
        )
        
        return {
            'balance_score': max(0, balance_score),
            'distribution': distribution
        }
    
    def _identify_draft_strategy(self, picks: List[Dict]) -> str:
        """Identify the draft strategy based on early picks"""
        if len(picks) < 3:
            return 'Unknown'
        
        early_picks = picks[:3]
        positions = [pick['position'] for pick in early_picks]
        
        # Common strategies
        if positions.count('RB') >= 2:
            return 'RB Heavy'
        elif positions.count('WR') >= 2:
            return 'WR Heavy'
        elif 'QB' in positions[:2]:
            return 'Early QB'
        elif 'TE' in positions[:3] and positions[0] != 'TE':
            return 'Premium TE'
        else:
            return 'Balanced'
    
    def _generate_analysis_summary(self, team_rosters: Dict) -> Dict:
        """Generate overall draft analysis summary"""
        if not team_rosters:
            return {}
        
        total_teams = len(team_rosters)
        
        # Calculate averages
        avg_strength = sum(roster.get('strength_score', 0) for roster in team_rosters.values()) / total_teams
        
        # Find strongest and weakest teams
        strongest_team = max(team_rosters.items(), key=lambda x: x[1].get('strength_score', 0))
        weakest_team = min(team_rosters.items(), key=lambda x: x[1].get('strength_score', 0))
        
        # Position trends
        position_popularity = defaultdict(int)
        for roster in team_rosters.values():
            for pos, count in roster.get('position_counts', {}).items():
                position_popularity[pos] += count
        
        # Strategy distribution
        strategies = [roster.get('draft_strategy', 'Unknown') for roster in team_rosters.values()]
        strategy_counts = Counter(strategies)
        
        return {
            'average_team_strength': round(avg_strength, 1),
            'strongest_team': {
                'team_index': strongest_team[0],
                'strength_score': strongest_team[1].get('strength_score', 0)
            },
            'weakest_team': {
                'team_index': weakest_team[0],
                'strength_score': weakest_team[1].get('strength_score', 0)
            },
            'position_popularity': dict(position_popularity),
            'strategy_distribution': dict(strategy_counts),
            'total_picks_made': sum(roster.get('total_picks', 0) for roster in team_rosters.values())
        }
    
    def get_position_recommendations(self, team_index: int, team_rosters: Dict, available_players: List[Dict]) -> List[Dict]:
        """
        Get position recommendations for a specific team
        
        Args:
            team_index: Index of the team to analyze
            team_rosters: Team roster analysis data
            available_players: List of available players
            
        Returns:
            List of position recommendations with reasoning
        """
        if team_index not in team_rosters:
            return []
        
        team_roster = team_rosters[team_index]
        needs = team_roster.get('needs', {})
        
        recommendations = []
        
        # Critical needs (highest priority)
        for position in needs.get('critical', []):
            available_at_position = [p for p in available_players if p.get('position') == position]
            if available_at_position:
                recommendations.append({
                    'position': position,
                    'priority': 'Critical',
                    'reason': f'No {position} on roster - starting lineup need',
                    'available_count': len(available_at_position),
                    'top_player': available_at_position[0] if available_at_position else None
                })
        
        # Important needs
        for position in needs.get('important', []):
            if position not in needs.get('critical', []):
                available_at_position = [p for p in available_players if p.get('position') == position]
                if available_at_position:
                    recommendations.append({
                        'position': position,
                        'priority': 'Important',
                        'reason': f'Need {position} depth for flex/backup',
                        'available_count': len(available_at_position),
                        'top_player': available_at_position[0] if available_at_position else None
                    })
        
        # Sort by priority
        priority_order = {'Critical': 0, 'Important': 1, 'Depth': 2}
        recommendations.sort(key=lambda x: priority_order.get(x['priority'], 3))
        
        return recommendations[:5]  # Return top 5 recommendations
