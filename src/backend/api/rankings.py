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
    Get available players for a specific draft (filters rostered players in dynasty)
    
    Args:
        draft_id: Sleeper draft ID
    
    Query Parameters:
        position: Filter by position (QB, RB, WR, TE, K, DEF)
        limit: Maximum number of players to return (default: 50)
        format: League format override (e.g., 'half_ppr_superflex')
        search: Search by player name (partial match, case-insensitive)
        team: Filter by NFL team
        tier: Filter by tier (1, 2, 3, etc.)
        bye_week: Filter by bye week (1-18)
        min_rank: Minimum rank (inclusive)
        max_rank: Maximum rank (inclusive)
    
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
        search_term = request.args.get('search', '').strip()
        team_filter = request.args.get('team')
        tier_filter = request.args.get('tier')
        bye_week_filter = request.args.get('bye_week')
        min_rank = request.args.get('min_rank')
        max_rank = request.args.get('max_rank')
        
        # Convert numeric filters
        try:
            tier_filter = int(tier_filter) if tier_filter else None
            bye_week_filter = int(bye_week_filter) if bye_week_filter else None
            min_rank = int(min_rank) if min_rank else None
            max_rank = int(max_rank) if max_rank else None
        except ValueError:
            return jsonify({
                'error': 'Invalid numeric filter values',
                'code': 'INVALID_FILTER'
            }), 400
        
        # Get draft info and picks
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if draft_info is None:
            return jsonify({
                'error': f'Draft "{draft_id}" not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
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
        
        # Get all unavailable players (drafted + rostered for dynasty)
        try:
            unavailable_player_ids, is_dynasty = SleeperAPI.get_all_unavailable_players(draft_id, league_id)
            print(f"🚫 Filtering {len(unavailable_player_ids)} unavailable players (dynasty: {is_dynasty})")
        except Exception as e:
            print(f"⚠️ Error getting unavailable players: {e}, using fallback")
            # Fallback to just draft picks
            draft_picks = SleeperAPI.get_draft_picks(draft_id)
            unavailable_player_ids = [pick.get('player_id') for pick in draft_picks if pick.get('player_id')]
            is_dynasty = False
        
        # Get available players from rankings with enhanced filtering
        try:
            available_players = rankings_manager.get_available_players(
                drafted_players=unavailable_player_ids,
                league_format=league_format,
                position_filter=position_filter,
                limit=limit * 2  # Get more to allow for filtering
            )
            
            # Apply additional filters
            filtered_players = _apply_advanced_filters(
                available_players,
                search_term=search_term,
                team_filter=team_filter,
                tier_filter=tier_filter,
                bye_week_filter=bye_week_filter,
                min_rank=min_rank,
                max_rank=max_rank
            )
            
            # Limit results after filtering
            filtered_players = filtered_players[:limit]
            
        except Exception as e:
            # Fallback to basic player list if rankings fail
            print(f"⚠️ Rankings error: {e}, using fallback")
            available_players = _get_fallback_available_players(
                unavailable_player_ids, position_filter, limit * 2
            )
            
            # Apply filters to fallback data
            filtered_players = _apply_advanced_filters(
                available_players,
                search_term=search_term,
                team_filter=team_filter,
                tier_filter=tier_filter,
                bye_week_filter=bye_week_filter,
                min_rank=min_rank,
                max_rank=max_rank
            )[:limit]
        
        return jsonify({
            'draft_id': draft_id,
            'league_format': league_format,
            'is_dynasty_league': is_dynasty,
            'total_unavailable': len(unavailable_player_ids),
            'available_players': filtered_players,
            'filters': {
                'position': position_filter,
                'search': search_term,
                'team': team_filter,
                'tier': tier_filter,
                'bye_week': bye_week_filter,
                'min_rank': min_rank,
                'max_rank': max_rank,
                'limit': limit
            },
            'total_results': len(filtered_players),
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
        
        # Get all unavailable players (drafted + rostered for dynasty)
        try:
            unavailable_player_ids, is_dynasty = SleeperAPI.get_all_unavailable_players(draft_id, league_id)
            print(f"🚫 Filtering {len(unavailable_player_ids)} unavailable players (dynasty: {is_dynasty})")
        except Exception as e:
            print(f"⚠️ Error getting unavailable players: {e}, using fallback")
            # Fallback to just draft picks
            draft_picks = SleeperAPI.get_draft_picks(draft_id)
            unavailable_player_ids = [pick.get('player_id') for pick in draft_picks if pick.get('player_id')]
            is_dynasty = False
        
        # Get best available by position using simplified manager
        try:
            best_by_position = rankings_manager.get_best_available_by_position(
                drafted_players=unavailable_player_ids,
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
                        drafted_players=unavailable_player_ids,
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
            'is_dynasty_league': is_dynasty,
            'best_available': best_by_position,
            'total_unavailable': len(unavailable_player_ids),
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


def _apply_advanced_filters(players, search_term=None, team_filter=None, tier_filter=None, 
                          bye_week_filter=None, min_rank=None, max_rank=None):
    """
    Apply advanced filters to a list of players
    
    Args:
        players: List of player dictionaries
        search_term: Search by player name (case-insensitive partial match)
        team_filter: Filter by NFL team
        tier_filter: Filter by tier
        bye_week_filter: Filter by bye week
        min_rank: Minimum rank (inclusive)
        max_rank: Maximum rank (inclusive)
    
    Returns:
        Filtered list of players
    """
    if not players:
        return []
    
    filtered = players
    
    # Apply search filter
    if search_term:
        search_lower = search_term.lower()
        filtered = [
            player for player in filtered
            if search_lower in player.get('name', '').lower()
        ]
    
    # Apply team filter
    if team_filter:
        team_upper = team_filter.upper()
        filtered = [
            player for player in filtered
            if player.get('team', '').upper() == team_upper
        ]
    
    # Apply tier filter
    if tier_filter is not None:
        filtered = [
            player for player in filtered
            if player.get('tier') == tier_filter
        ]
    
    # Apply bye week filter
    if bye_week_filter is not None:
        filtered = [
            player for player in filtered
            if player.get('bye_week') == bye_week_filter
        ]
    
    # Apply rank range filters
    if min_rank is not None:
        filtered = [
            player for player in filtered
            if player.get('rank', 999) >= min_rank
        ]
    
    if max_rank is not None:
        filtered = [
            player for player in filtered
            if player.get('rank', 0) <= max_rank
        ]
    
    return filtered


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
