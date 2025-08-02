"""
Rankings API routes for Fantasy Football Draft Assistant V2

This module handles rankings-related API endpoints including:
- Available players for a draft
- Player rankings by position
- Best available players
- Custom rankings management
"""

from flask import Blueprint, jsonify, request
from ..services.sleeper_api import SleeperAPI, SleeperAPIError
from ..rankings.SimpleRankingsManager import SimpleRankingsManager

rankings_bp = Blueprint('rankings', __name__)

# Initialize rankings manager (will be set by app.py)
rankings_manager = None

def init_rankings_routes(rm_instance):
    """Initialize rankings routes with SimpleRankingsManager instance"""
    global rankings_manager
    rankings_manager = rm_instance


@rankings_bp.route('/draft/<draft_id>/available-players')
def get_available_players(draft_id):
    """
    Get available players for a specific draft
    
    Args:
        draft_id: Sleeper draft ID
    
    Query Parameters:
        position: Filter by position (QB, RB, WR, TE, K, DEF)
        limit: Maximum number of players to return (default: 50)
        format: League format override (e.g., 'half_ppr_superflex')
    
    Returns:
        JSON response with available players and their rankings
    """
    try:
        if not rankings_manager:
            return jsonify({
                'error': 'Rankings system not initialized',
                'code': 'RANKINGS_NOT_INITIALIZED'
            }), 500
        
        # Get query parameters
        position_filter = request.args.get('position')
        limit = int(request.args.get('limit', 50))
        format_override = request.args.get('format')
        
        # Get draft info and picks
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if draft_info is None:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        draft_picks = SleeperAPI.get_draft_picks(draft_id)
        
        # Get league info for format detection
        league_id = draft_info.get('league_id')
        league_format = None
        if league_id and not format_override:
            try:
                league_info = SleeperAPI.get_league_info(league_id)
                if league_info:
                    scoring_format, league_type = SleeperAPI.detect_league_format(league_info)
                    league_format = f"{scoring_format}_{league_type}"
            except SleeperAPIError:
                pass  # Use default format
        
        # Use format override if provided
        if format_override:
            league_format = format_override
        
        # Get drafted player IDs
        drafted_player_ids = set()
        for pick in draft_picks:
            if pick.get('player_id'):
                drafted_player_ids.add(pick['player_id'])
        
        # Get available players from rankings
        try:
            available_players = rankings_manager.get_available_players(
                drafted_players=list(drafted_player_ids),
                league_format=league_format,
                position_filter=position_filter,
                limit=limit
            )
        except Exception as e:
            # Fallback to basic player list if rankings fail
            print(f"⚠️ Rankings error: {e}, using fallback")
            available_players = _get_fallback_available_players(
                drafted_player_ids, position_filter, limit
            )
        
        return jsonify({
            'draft_id': draft_id,
            'league_format': league_format,
            'total_drafted': len(drafted_player_ids),
            'available_players': available_players,
            'filters': {
                'position': position_filter,
                'limit': limit
            },
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


@rankings_bp.route('/draft/<draft_id>/best-available')
def get_best_available(draft_id):
    """
    Get best available players by position for a draft
    
    Args:
        draft_id: Sleeper draft ID
    
    Query Parameters:
        positions: Comma-separated positions (default: QB,RB,WR,TE)
        count: Number of players per position (default: 5)
        format: League format override
    
    Returns:
        JSON response with best available players by position
    """
    try:
        if not rankings_manager:
            return jsonify({
                'error': 'Rankings system not initialized',
                'code': 'RANKINGS_NOT_INITIALIZED'
            }), 500
        
        # Get query parameters
        positions = request.args.get('positions', 'QB,RB,WR,TE').split(',')
        count = int(request.args.get('count', 5))
        format_override = request.args.get('format')
        
        # Get draft info and picks
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if draft_info is None:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        draft_picks = SleeperAPI.get_draft_picks(draft_id)
        
        # Get league format
        league_id = draft_info.get('league_id')
        league_format = None
        if league_id and not format_override:
            try:
                league_info = SleeperAPI.get_league_info(league_id)
                if league_info:
                    scoring_format, league_type = SleeperAPI.detect_league_format(league_info)
                    league_format = f"{scoring_format}_{league_type}"
            except SleeperAPIError:
                pass
        
        if format_override:
            league_format = format_override
        
        # Get drafted player IDs
        drafted_player_ids = set()
        for pick in draft_picks:
            if pick.get('player_id'):
                drafted_player_ids.add(pick['player_id'])
        
        # Get best available by position using simplified manager
        try:
            best_by_position = rankings_manager.get_best_available_by_position(
                drafted_players=list(drafted_player_ids),
                league_format=league_format,
                positions=[pos.strip().upper() for pos in positions],
                count=count
            )
        except Exception as e:
            print(f"⚠️ Error getting best available: {e}")
            # Fallback to individual position queries
            best_by_position = {}
            for position in positions:
                position = position.strip().upper()
                try:
                    best_players = rankings_manager.get_available_players(
                        drafted_players=list(drafted_player_ids),
                        league_format=league_format,
                        position_filter=position,
                        limit=count
                    )
                    best_by_position[position] = best_players
                except Exception as e2:
                    print(f"⚠️ Error getting best {position}: {e2}")
                    best_by_position[position] = []
        
        return jsonify({
            'draft_id': draft_id,
            'league_format': league_format,
            'best_available': best_by_position,
            'total_drafted': len(drafted_player_ids),
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


@rankings_bp.route('/rankings/formats')
def get_available_formats():
    """
    Get available ranking formats
    
    Returns:
        JSON response with available ranking formats
    """
    try:
        if not rankings_manager:
            return jsonify({
                'error': 'Rankings system not initialized',
                'code': 'RANKINGS_NOT_INITIALIZED'
            }), 500
        
        # Get available formats from rankings manager
        try:
            formats = rankings_manager.get_available_formats()
        except Exception as e:
            print(f"⚠️ Error getting formats: {e}")
            # Fallback to common formats
            formats = [
                'half_ppr_superflex',
                'half_ppr_standard', 
                'ppr_superflex',
                'ppr_standard',
                'standard_superflex',
                'standard_standard'
            ]
        
        return jsonify({
            'formats': formats,
            'default': 'half_ppr_superflex',
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500


@rankings_bp.route('/rankings/status')
def get_rankings_status():
    """
    Get rankings system status and information
    
    Returns:
        JSON response with rankings system status
    """
    try:
        if not rankings_manager:
            return jsonify({
                'error': 'Rankings system not initialized',
                'code': 'RANKINGS_NOT_INITIALIZED'
            }), 500
        
        # Get rankings status using simplified manager
        try:
            status_info = rankings_manager.get_status()
        except Exception as e:
            print(f"⚠️ Error getting rankings status: {e}")
            status_info = {
                'initialized': True,
                'available_formats': [],
                'last_updated': None,
                'total_players': 0,
                'error': str(e)
            }
        
        return jsonify({
            'rankings_status': status_info,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500


def _get_fallback_available_players(drafted_player_ids, position_filter=None, limit=50):
    """
    Fallback method to get available players when rankings system fails
    
    Args:
        drafted_player_ids: Set of drafted player IDs
        position_filter: Position to filter by
        limit: Maximum number of players
    
    Returns:
        List of available players (basic format)
    """
    try:
        # Get all players from Sleeper API
        all_players = SleeperAPI.get_all_players()
        
        available_players = []
        for player_id, player_data in all_players.items():
            # Skip drafted players
            if player_id in drafted_player_ids:
                continue
            
            # Skip inactive players
            if player_data.get('status') not in ['Active', None]:
                continue
            
            # Filter by position if specified
            if position_filter and player_data.get('position') != position_filter:
                continue
            
            # Create basic player info
            player_info = {
                'player_id': player_id,
                'name': f"{player_data.get('first_name', '')} {player_data.get('last_name', '')}".strip(),
                'position': player_data.get('position'),
                'team': player_data.get('team'),
                'rank': len(available_players) + 1,  # Simple ranking by order
                'tier': 1,  # Default tier
                'value': 0,  # No value calculation
                'bye_week': player_data.get('bye_week')
            }
            
            available_players.append(player_info)
            
            # Stop when we reach the limit
            if len(available_players) >= limit:
                break
        
        return available_players
        
    except Exception as e:
        print(f"⚠️ Fallback player retrieval failed: {e}")
        return []
