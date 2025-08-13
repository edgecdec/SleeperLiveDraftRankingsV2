@draft_bp.route('/league/<league_id>/traded_picks')
def get_league_traded_picks(league_id):
    """
    Get all traded picks for a specific league
    
    Args:
        league_id: Sleeper league ID
    
    Returns:
        JSON response with traded picks data
    """
    try:
        print(f"📡 Fetching traded picks for league: {league_id}")
        
        # Make request to Sleeper API
        url = f"https://api.sleeper.app/v1/league/{league_id}/traded_picks"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            traded_picks = response.json()
            print(f"✅ Successfully fetched {len(traded_picks)} traded picks")
            
            return jsonify({
                'league_id': league_id,
                'traded_picks': traded_picks,
                'total_trades': len(traded_picks),
                'status': 'success',
                'timestamp': int(time.time())
            })
        else:
            print(f"❌ Sleeper API error: {response.status_code}")
            return jsonify({
                'error': f'Sleeper API returned status {response.status_code}',
                'code': 'SLEEPER_API_ERROR'
            }), response.status_code
            
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request timeout - Sleeper API took too long to respond',
            'code': 'TIMEOUT_ERROR'
        }), 504
    except SleeperAPIError as e:
        return jsonify({
            'error': f'Sleeper API error: {str(e)}',
            'code': 'SLEEPER_API_ERROR'
        }), 500
    except Exception as e:
        print(f"❌ Unexpected error in get_league_traded_picks: {e}")
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500

"""
Draft API routes for Fantasy Football Draft Assistant V2

This module handles draft-related API endpoints including:
- Draft information retrieval
- Draft picks data
- Available players calculation
- Player data cache management
"""

from flask import Blueprint, jsonify, request
import time
from ..services.sleeper_api import SleeperAPI, SleeperAPIError
from ..services.ranked_player_cache import get_ranked_player_cache
from ..services.team_analyzer import TeamAnalyzer
from ..services.vbd_calculator import VBDCalculator

draft_bp = Blueprint('draft', __name__)


@draft_bp.route('/draft/<draft_id>')
def get_draft_info(draft_id):
    """
    Get draft information by draft ID
    
    Args:
        draft_id: Sleeper draft ID
    
    Returns:
        JSON response with draft data or error
    """
    try:
        # Get draft info
        draft_info = SleeperAPI.get_draft_info(draft_id)
        
        if draft_info is None:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Get league info if available
        league_id = draft_info.get('league_id')
        league_info = None
        if league_id:
            try:
                league_info = SleeperAPI.get_league_info(league_id)
            except SleeperAPIError:
                pass  # League info is optional
        
        # Detect league format if we have league info
        league_format = None
        if league_info:
            try:
                scoring_format, league_type = SleeperAPI.detect_league_format(league_info)
                league_format = {
                    'scoring_format': scoring_format,
                    'league_type': league_type,
                    'format_string': f"{scoring_format}_{league_type}"
                }
            except Exception:
                pass  # Format detection is optional
        
        return jsonify({
            'draft_id': draft_id,
            'draft_info': draft_info,
            'league_info': league_info,
            'league_format': league_format,
            'status': 'success'
        })
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'INVALID_INPUT'
        }), 400
        
    except SleeperAPIError as e:
        return jsonify({
            'error': str(e),
            'code': 'API_ERROR'
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/draft/<draft_id>/picks')
def get_draft_picks(draft_id):
    """
    Get all picks for a draft with player names resolved
    
    Args:
        draft_id: Sleeper draft ID
    
    Returns:
        JSON response with picks data including player names
    """
    try:
        # Get draft info for context
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if draft_info is None:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Get draft picks with names resolved
        try:
            drafted_players = SleeperAPI.get_drafted_players_with_names(draft_id)
            
            # Also get raw picks for backward compatibility
            raw_picks = SleeperAPI.get_draft_picks(draft_id)
            
            return jsonify({
                'draft_id': draft_id,
                'picks': drafted_players,  # Enhanced picks with names
                'raw_picks': raw_picks,    # Original format for compatibility
                'total_picks': len(drafted_players),
                'draft_status': draft_info.get('status'),
                'status': 'success'
            })
            
        except Exception as e:
            print(f"⚠️ Error getting enhanced picks, falling back to raw picks: {e}")
            
            # Fallback to raw picks if enhanced version fails
            raw_picks = SleeperAPI.get_draft_picks(draft_id)
            
            processed_picks = []
            for pick in raw_picks:
                processed_pick = {
                    'pick_no': pick.get('pick_no'),
                    'round': pick.get('round'),
                    'draft_slot': pick.get('draft_slot'),
                    'player_id': pick.get('player_id'),
                    'name': f"Player {pick.get('player_id', 'Unknown')}",  # Fallback name
                    'position': 'Unknown',
                    'team': 'N/A',
                    'picked_by': pick.get('picked_by'),
                    'roster_id': pick.get('roster_id'),
                    'is_keeper': pick.get('is_keeper', False),
                    'picked_at': pick.get('picked_at'),
                    'metadata': pick.get('metadata', {})
                }
                processed_picks.append(processed_pick)
            
            return jsonify({
                'draft_id': draft_id,
                'picks': processed_picks,
                'raw_picks': raw_picks,
                'total_picks': len(processed_picks),
                'draft_status': draft_info.get('status'),
                'status': 'success',
                'fallback_mode': True
            })
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'INVALID_INPUT'
        }), 400
        
    except SleeperAPIError as e:
        return jsonify({
            'error': str(e),
            'code': 'API_ERROR'
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/league/<league_id>')
def get_league_info(league_id):
    """
    Get league information by league ID
    
    Args:
        league_id: Sleeper league ID
    
    Returns:
        JSON response with league data or error
    """
    try:
        # Get league info
        league_info = SleeperAPI.get_league_info(league_id)
        
        if league_info is None:
            return jsonify({
                'error': f'League "{league_id}" not found',
                'code': 'LEAGUE_NOT_FOUND'
            }), 404
        
        # Detect league format
        league_format = None
        try:
            scoring_format, league_type = SleeperAPI.detect_league_format(league_info)
            league_format = {
                'scoring_format': scoring_format,
                'league_type': league_type,
                'format_string': f"{scoring_format}_{league_type}"
            }
        except Exception as e:
            print(f"⚠️ Error detecting league format: {e}")
        
        # Check if dynasty/keeper
        is_dynasty_keeper = False
        try:
            is_dynasty_keeper = SleeperAPI.is_dynasty_or_keeper_league(league_info)
        except Exception as e:
            print(f"⚠️ Error checking dynasty/keeper status: {e}")
        
        return jsonify({
            'league_id': league_id,
            'league_info': league_info,
            'league_format': league_format,
            'is_dynasty_keeper': is_dynasty_keeper,
            'status': 'success'
        })
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'INVALID_INPUT'
        }), 400
        
    except SleeperAPIError as e:
        return jsonify({
            'error': str(e),
            'code': 'API_ERROR'
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/draft/<draft_id>/updates')
def get_draft_updates(draft_id):
    """
    Get latest draft updates with timestamp for auto-refresh functionality
    
    Args:
        draft_id: Sleeper draft ID
    
    Returns:
        JSON response with draft updates and timestamp
    """
    try:
        # Get draft info first to validate draft exists
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if not draft_info:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Get current picks with error handling
        try:
            picks = SleeperAPI.get_drafted_players_with_names(draft_id)
        except Exception as e:
            print(f"⚠️ Error getting drafted players with names: {e}")
            # Fallback to raw picks
            try:
                raw_picks = SleeperAPI.get_draft_picks(draft_id)
                picks = []
                for pick in raw_picks:
                    picks.append({
                        'player_id': pick.get('player_id'),
                        'player_name': f"Player {pick.get('player_id', 'Unknown')}",
                        'position': 'Unknown',
                        'team': 'N/A',
                        'pick_no': pick.get('pick_no'),
                        'round': pick.get('round'),
                        'draft_slot': pick.get('draft_slot'),
                        'picked_by': pick.get('picked_by'),
                        'picked_at': pick.get('picked_at')
                    })
            except Exception as e2:
                print(f"❌ Error getting raw picks: {e2}")
                return jsonify({
                    'error': f'Failed to get draft picks: {str(e2)}',
                    'code': 'PICKS_ERROR'
                }), 500
        
        # Get last update timestamp (most recent pick time)
        last_update = 0
        if picks:
            pick_times = [pick.get('picked_at', 0) for pick in picks if pick.get('picked_at')]
            if pick_times:
                last_update = max(pick_times)
        
        return jsonify({
            'draft_id': draft_id,
            'picks': picks,
            'last_update': last_update,
            'total_picks': len(picks),
            'draft_status': draft_info.get('status', 'unknown') if draft_info else 'unknown',
            'current_pick': draft_info.get('draft_order', {}).get('current_pick', 0) if draft_info else 0,
            'status': 'success',
            'timestamp': int(time.time())
        })
        
    except SleeperAPIError as e:
        return jsonify({
            'error': f'Sleeper API error: {str(e)}',
            'code': 'SLEEPER_API_ERROR'
        }), 500
    except Exception as e:
        print(f"❌ Unexpected error in get_draft_updates: {e}")
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/draft/<draft_id>/refresh', methods=['POST'])
def refresh_draft_data(draft_id):
    """
    Force refresh draft data and return updated information
    
    Args:
        draft_id: Sleeper draft ID
    
    Returns:
        JSON response with refreshed draft data
    """
    try:
        # Get fresh draft data
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if not draft_info:
            return jsonify({
                'error': 'Draft not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Get league info
        league_id = draft_info.get('league_id')
        league_info = SleeperAPI.get_league_info(league_id) if league_id else None
        
        # Get fresh picks
        picks = SleeperAPI.get_drafted_players_with_names(draft_id)
        
        # Get available players with current draft state
        rankings_manager = get_rankings_manager()
        league_format = determine_league_format(league_info) if league_info else 'standard_standard'
        
        # Get unavailable players (drafted + rostered for dynasty)
        unavailable_players, is_dynasty_league = SleeperAPI.get_all_unavailable_players(draft_id, league_id)
        
        # Get available players
        available_players = rankings_manager.get_available_players(
            drafted_players=unavailable_players,
            league_format=league_format,
            limit=50
        )
        
        return jsonify({
            'draft_id': draft_id,
            'league_id': league_id,
            'draft_info': draft_info,
            'league_info': league_info,
            'league_format': {
                'format_string': league_format,
                'is_dynasty': is_dynasty_league
            },
            'picks': picks,
            'available_players': available_players,
            'total_unavailable': len(unavailable_players),
            'is_dynasty_league': is_dynasty_league,
            'status': 'success',
            'last_updated': int(time.time())
        })
        
    except SleeperAPIError as e:
        return jsonify({
            'error': f'Sleeper API error: {str(e)}',
            'code': 'SLEEPER_API_ERROR'
        }), 500
    except Exception as e:
        return jsonify({
            'error': str(e),
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/draft/<draft_id>/board')
def get_draft_board(draft_id):
    """
    Get draft board data organized by team and round for visual draft board
    
    Args:
        draft_id: Sleeper draft ID
    
    Returns:
        JSON response with draft board data organized by teams and rounds
    """
    try:
        # Get draft info for team and round structure
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if not draft_info:
            return jsonify({
                'error': 'Draft not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Get league info for team names
        league_id = draft_info.get('league_id')
        league_info = SleeperAPI.get_league_info(league_id) if league_id else None
        
        # Get all draft picks
        picks = SleeperAPI.get_drafted_players_with_names(draft_id)
        
        # Get draft settings
        total_teams = draft_info.get('settings', {}).get('teams', 12)
        total_rounds = draft_info.get('settings', {}).get('rounds', 16)
        draft_type = draft_info.get('type', 'snake')  # snake or linear
        
        # Create team mapping from league info
        team_names = {}
        if league_info and 'users' in league_info:
            for user in league_info['users']:
                user_id = user.get('user_id')
                display_name = user.get('display_name', user.get('username', f'Team {user_id}'))
                team_names[user_id] = display_name
        
        # Initialize draft board structure
        draft_board = {
            'teams': [],
            'rounds': total_rounds,
            'total_teams': total_teams,
            'draft_type': draft_type,
            'picks_made': len(picks),
            'total_picks': total_teams * total_rounds
        }
        
        # Create team structure
        for team_index in range(total_teams):
            team_id = f"team_{team_index + 1}"
            team_data = {
                'team_id': team_id,
                'team_index': team_index,
                'team_name': f'Team {team_index + 1}',
                'picks': []
            }
            
            # Initialize empty picks for all rounds
            for round_num in range(1, total_rounds + 1):
                team_data['picks'].append({
                    'round': round_num,
                    'pick_number': None,
                    'player': None,
                    'picked_at': None
                })
            
            draft_board['teams'].append(team_data)
        
        # Fill in actual picks
        for pick in picks:
            pick_number = pick.get('pick_no', 0)
            round_number = pick.get('round', 0)
            
            if pick_number > 0 and round_number > 0:
                # Calculate team index based on draft type and pick number
                if draft_type == 'snake':
                    # Snake draft: alternating direction each round
                    if round_number % 2 == 1:  # Odd rounds: 1, 2, 3, ...
                        team_index = (pick_number - 1) % total_teams
                    else:  # Even rounds: ..., 3, 2, 1
                        team_index = total_teams - 1 - ((pick_number - 1) % total_teams)
                else:  # Linear draft
                    team_index = (pick_number - 1) % total_teams
                
                # Ensure team_index is valid
                if 0 <= team_index < len(draft_board['teams']):
                    # Update team name if we have user info
                    drafted_by = pick.get('drafted_by')
                    if drafted_by and drafted_by in team_names:
                        draft_board['teams'][team_index]['team_name'] = team_names[drafted_by]
                        draft_board['teams'][team_index]['user_id'] = drafted_by
                    
                    # Add pick to the appropriate round
                    if 1 <= round_number <= total_rounds:
                        draft_board['teams'][team_index]['picks'][round_number - 1] = {
                            'round': round_number,
                            'pick_number': pick_number,
                            'player': {
                                'player_id': pick.get('player_id'),
                                'name': pick.get('player_name', 'Unknown Player'),
                                'position': pick.get('position', 'N/A'),
                                'team': pick.get('team', 'N/A')
                            },
                            'picked_at': pick.get('picked_at')
                        }
        
        # Calculate current pick information
        current_pick_info = {
            'current_pick': len(picks) + 1,
            'current_round': ((len(picks)) // total_teams) + 1,
            'current_drafter': None,
            'current_drafter_name': None,
            'picks_remaining': (total_teams * total_rounds) - len(picks),
            'draft_complete': len(picks) >= (total_teams * total_rounds)
        }
        
        # Calculate who's turn it is based on draft type
        if not current_pick_info['draft_complete']:
            current_pick_num = current_pick_info['current_pick']
            current_round = current_pick_info['current_round']
            
            if draft_type == 'snake':
                # Snake draft logic
                if current_round % 2 == 1:  # Odd rounds: 1, 2, 3, ...
                    current_team_index = (current_pick_num - 1) % total_teams
                else:  # Even rounds: ..., 3, 2, 1
                    current_team_index = total_teams - 1 - ((current_pick_num - 1) % total_teams)
            else:  # Linear draft
                current_team_index = (current_pick_num - 1) % total_teams
            
            # Get current drafter info
            if 0 <= current_team_index < len(draft_board['teams']):
                current_team = draft_board['teams'][current_team_index]
                current_pick_info['current_drafter'] = current_team.get('user_id')
                current_pick_info['current_drafter_name'] = current_team['team_name']
        
        # Add current pick info to draft board
        draft_board['current_pick_info'] = current_pick_info
        
        return jsonify({
            'draft_id': draft_id,
            'league_id': league_id,
            'draft_board': draft_board,
            'status': 'success'
        })
        
    except SleeperAPIError as e:
        return jsonify({
            'error': f'Sleeper API error: {str(e)}',
            'code': 'SLEEPER_API_ERROR'
        }), 500
    except Exception as e:
        return jsonify({
            'error': str(e),
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/cache/info')
def get_cache_info():
    """
    Get information about the ranked player data cache
    
    Returns:
        JSON response with cache information
    """
    try:
        ranked_cache = get_ranked_player_cache()
        cache_info = ranked_cache.get_cache_info()
        
        return jsonify({
            'cache_info': cache_info,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/cache/refresh', methods=['POST'])
def refresh_player_cache():
    """
    Force refresh the ranked player data cache
    
    Returns:
        JSON response with refresh status
    """
    try:
        ranked_cache = get_ranked_player_cache()
        
        # Clear existing cache
        ranked_cache.clear_cache()
        
        # Force fetch fresh data
        print("🔄 Force refreshing ranked player cache...")
        all_players_data = SleeperAPI._make_request("/players/nfl", timeout=30)
        
        if not all_players_data:
            return jsonify({
                'error': 'Failed to fetch player data from Sleeper API',
                'code': 'API_ERROR'
            }), 500
        
        # Get ranked player IDs
        ranked_player_ids = ranked_cache.get_ranked_player_ids_from_rankings()
        
        # Save to cache
        success = ranked_cache.save_ranked_players_to_cache(all_players_data, ranked_player_ids)
        
        if success:
            cache_info = ranked_cache.get_cache_info()
            return jsonify({
                'message': 'Ranked player cache refreshed successfully',
                'cache_info': cache_info,
                'total_players_fetched': len(all_players_data),
                'ranked_players_cached': len(ranked_player_ids),
                'status': 'success'
            })
        else:
            return jsonify({
                'error': 'Failed to save refreshed data to cache',
                'code': 'CACHE_ERROR'
            }), 500
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/cache/clear', methods=['POST'])
def clear_player_cache():
    """
    Clear the ranked player data cache
    
    Returns:
        JSON response with clear status
    """
    try:
        ranked_cache = get_ranked_player_cache()
        success = ranked_cache.clear_cache()
        
        if success:
            return jsonify({
                'message': 'Ranked player cache cleared successfully',
                'status': 'success'
            })
        else:
            return jsonify({
                'error': 'Failed to clear cache',
                'code': 'CACHE_ERROR'
            }), 500
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'code': 'INTERNAL_ERROR'
        }), 500

@draft_bp.route('/draft/<draft_id>/team-analysis')
def get_team_analysis(draft_id):
    """
    Get comprehensive team roster analysis for all teams in the draft
    
    Args:
        draft_id: Sleeper draft ID
    
    Returns:
        JSON response with team roster analysis
    """
    try:
        # Get draft info
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if not draft_info:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Get all draft picks with names
        try:
            picks = SleeperAPI.get_drafted_players_with_names(draft_id)
        except Exception as e:
            print(f"⚠️ Error getting drafted players: {e}")
            return jsonify({
                'error': f'Failed to get draft picks: {str(e)}',
                'code': 'PICKS_ERROR'
            }), 500
        
        # Get all players data for position info
        try:
            all_players = SleeperAPI.get_all_players()
        except Exception as e:
            print(f"⚠️ Error getting player data: {e}")
            return jsonify({
                'error': f'Failed to get player data: {str(e)}',
                'code': 'PLAYER_DATA_ERROR'
            }), 500
        
        # Analyze team rosters
        team_analyzer = TeamAnalyzer()
        analysis = team_analyzer.analyze_team_rosters(picks, draft_info, all_players)
        
        if 'error' in analysis:
            return jsonify({
                'error': f'Analysis failed: {analysis["error"]}',
                'code': 'ANALYSIS_ERROR'
            }), 500
        
        return jsonify({
            'draft_id': draft_id,
            'team_analysis': analysis,
            'status': 'success'
        })
        
    except SleeperAPIError as e:
        return jsonify({
            'error': f'Sleeper API error: {str(e)}',
            'code': 'SLEEPER_API_ERROR'
        }), 500
    except Exception as e:
        print(f"❌ Unexpected error in get_team_analysis: {e}")
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/draft/<draft_id>/team/<int:team_index>/recommendations')
def get_team_recommendations(draft_id, team_index):
    """
    Get position recommendations for a specific team
    
    Args:
        draft_id: Sleeper draft ID
        team_index: Team index (0-based)
    
    Returns:
        JSON response with position recommendations for the team
    """
    try:
        # Get team analysis first
        team_analyzer = TeamAnalyzer()
        
        # Get draft info and picks
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if not draft_info:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        picks = SleeperAPI.get_drafted_players_with_names(draft_id)
        all_players = SleeperAPI.get_all_players()
        
        # Get team analysis
        analysis = team_analyzer.analyze_team_rosters(picks, draft_info, all_players)
        
        if 'error' in analysis:
            return jsonify({
                'error': f'Analysis failed: {analysis["error"]}',
                'code': 'ANALYSIS_ERROR'
            }), 500
        
        # Get available players (this would need to be implemented with rankings)
        # For now, return basic recommendations based on roster analysis
        team_rosters = analysis.get('team_rosters', {})
        
        if team_index not in team_rosters:
            return jsonify({
                'error': f'Team index {team_index} not found',
                'code': 'TEAM_NOT_FOUND'
            }), 404
        
        # Get basic recommendations without available players for now
        team_roster = team_rosters[team_index]
        needs = team_roster.get('needs', {})
        
        recommendations = []
        for priority in ['critical', 'important', 'depth']:
            for position in needs.get(priority, []):
                recommendations.append({
                    'position': position,
                    'priority': priority.title(),
                    'reason': f'{priority.title()} need for {position}',
                    'current_count': team_roster.get('position_counts', {}).get(position, 0)
                })
        
        return jsonify({
            'draft_id': draft_id,
            'team_index': team_index,
            'team_roster': team_roster,
            'recommendations': recommendations[:5],  # Top 5
            'status': 'success'
        })
        
    except Exception as e:
        print(f"❌ Error getting team recommendations: {e}")
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'code': 'INTERNAL_ERROR'
        }), 500

@draft_bp.route('/draft/<draft_id>/vbd-analysis')
def get_vbd_analysis(draft_id):
    """
    Get Value-Based Drafting analysis for available players
    
    Args:
        draft_id: Sleeper draft ID
    
    Returns:
        JSON response with VBD analysis
    """
    try:
        # Get league format from query params
        league_format = request.args.get('format', 'standard')
        league_size = int(request.args.get('league_size', 12))
        
        # Get draft info for context
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if not draft_info:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Try to get available players from rankings system
        try:
            from ..rankings.SimpleRankingsManager import SimpleRankingsManager
            rankings_manager = SimpleRankingsManager()
            
            # Get drafted players to exclude
            drafted_players = SleeperAPI.get_drafted_players_with_names(draft_id)
            drafted_ids = {p.get('player_id') for p in drafted_players if p.get('player_id')}
            
            # Get available players
            available_players = rankings_manager.get_available_players(
                drafted_players=drafted_ids,
                league_format=league_format,
                limit=200  # Get more players for VBD analysis
            )
            
        except Exception as e:
            print(f"⚠️ Error getting available players for VBD: {e}")
            return jsonify({
                'error': f'Failed to get available players: {str(e)}',
                'code': 'RANKINGS_ERROR'
            }), 500
        
        # Calculate VBD metrics
        vbd_calculator = VBDCalculator()
        vbd_analysis = vbd_calculator.calculate_vbd_metrics(
            available_players, 
            league_format, 
            league_size
        )
        
        if 'error' in vbd_analysis:
            return jsonify({
                'error': f'VBD calculation failed: {vbd_analysis["error"]}',
                'code': 'VBD_ERROR'
            }), 500
        
        return jsonify({
            'draft_id': draft_id,
            'vbd_analysis': vbd_analysis,
            'league_format': league_format,
            'league_size': league_size,
            'status': 'success'
        })
        
    except ValueError as e:
        return jsonify({
            'error': f'Invalid parameters: {str(e)}',
            'code': 'INVALID_PARAMS'
        }), 400
    except Exception as e:
        print(f"❌ Error in VBD analysis: {e}")
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'code': 'INTERNAL_ERROR'
        }), 500


@draft_bp.route('/draft/<draft_id>/vbd-recommendations')
def get_vbd_recommendations(draft_id):
    """
    Get VBD-based draft recommendations for a specific team
    
    Args:
        draft_id: Sleeper draft ID
    
    Query Parameters:
        team_index: Team index to get recommendations for
        format: League format (default: standard)
        league_size: League size (default: 12)
        limit: Number of recommendations (default: 5)
    
    Returns:
        JSON response with VBD recommendations
    """
    try:
        # Get parameters
        team_index = request.args.get('team_index', type=int)
        league_format = request.args.get('format', 'standard')
        league_size = int(request.args.get('league_size', 12))
        limit = int(request.args.get('limit', 5))
        
        if team_index is None:
            return jsonify({
                'error': 'team_index parameter is required',
                'code': 'MISSING_PARAM'
            }), 400
        
        # Get draft info and team analysis
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if not draft_info:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Get team analysis for needs
        team_analyzer = TeamAnalyzer()
        picks = SleeperAPI.get_drafted_players_with_names(draft_id)
        all_players = SleeperAPI.get_all_players()
        
        analysis = team_analyzer.analyze_team_rosters(picks, draft_info, all_players)
        team_rosters = analysis.get('team_rosters', {})
        
        if team_index not in team_rosters:
            return jsonify({
                'error': f'Team index {team_index} not found',
                'code': 'TEAM_NOT_FOUND'
            }), 404
        
        team_needs = team_rosters[team_index].get('needs', {})
        
        # Get VBD analysis
        try:
            from ..rankings.SimpleRankingsManager import SimpleRankingsManager
            rankings_manager = SimpleRankingsManager()
            
            # Get available players
            drafted_ids = {p.get('player_id') for p in picks if p.get('player_id')}
            available_players = rankings_manager.get_available_players(
                drafted_players=drafted_ids,
                league_format=league_format,
                limit=100
            )
            
            # Calculate VBD for available players
            vbd_calculator = VBDCalculator()
            vbd_analysis = vbd_calculator.calculate_vbd_metrics(
                available_players, 
                league_format, 
                league_size
            )
            
            if 'error' in vbd_analysis:
                raise Exception(vbd_analysis['error'])
            
            # Get recommendations
            recommendations = vbd_calculator.get_draft_recommendations(
                vbd_analysis['players'],
                team_needs,
                limit
            )
            
            return jsonify({
                'draft_id': draft_id,
                'team_index': team_index,
                'recommendations': recommendations,
                'team_needs': team_needs,
                'vbd_baselines': vbd_analysis.get('baselines', {}),
                'league_format': league_format,
                'league_size': league_size,
                'status': 'success'
            })
            
        except Exception as e:
            print(f"⚠️ Error getting VBD recommendations: {e}")
            return jsonify({
                'error': f'Failed to generate recommendations: {str(e)}',
                'code': 'RECOMMENDATION_ERROR'
            }), 500
        
    except ValueError as e:
        return jsonify({
            'error': f'Invalid parameters: {str(e)}',
            'code': 'INVALID_PARAMS'
        }), 400
    except Exception as e:
        print(f"❌ Error in VBD recommendations: {e}")
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'code': 'INTERNAL_ERROR'
        }), 500
