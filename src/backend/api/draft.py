"""
Draft API routes for Fantasy Football Draft Assistant V2

This module handles draft-related API endpoints including:
- Draft information retrieval
- Draft picks data
- Available players calculation
"""

from flask import Blueprint, jsonify
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
