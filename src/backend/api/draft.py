"""
Draft API routes for Fantasy Football Draft Assistant V2

This module handles draft-related API endpoints including:
- Draft information retrieval
- Draft picks data
- Available players calculation
"""

from flask import Blueprint, jsonify, request
import time
from ..services.sleeper_api import SleeperAPI, SleeperAPIError

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
        # Get current picks with timestamps
        picks = SleeperAPI.get_drafted_players_with_names(draft_id)
        
        # Get last update timestamp (most recent pick time)
        last_update = 0
        if picks:
            pick_times = [pick.get('picked_at', 0) for pick in picks if pick.get('picked_at')]
            if pick_times:
                last_update = max(pick_times)
        
        # Get draft info for additional context
        draft_info = SleeperAPI.get_draft_info(draft_id)
        
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
        return jsonify({
            'error': str(e),
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
