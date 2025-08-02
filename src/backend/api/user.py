"""
User API routes for Fantasy Football Draft Assistant V2

This module handles user-related API endpoints including:
- User lookup by username
- User leagues retrieval
- User validation
"""

from flask import Blueprint, jsonify, request
from ..services.sleeper_api import SleeperAPI, SleeperAPIError

user_bp = Blueprint('user', __name__)


@user_bp.route('/user/<username>')
def get_user(username):
    """
    Get user information by username
    
    Args:
        username: Sleeper username
    
    Returns:
        JSON response with user data or error
    """
    try:
        user_data = SleeperAPI.get_user(username)
        
        if user_data is None:
            return jsonify({
                'error': f'User "{username}" not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        return jsonify({
            'user': user_data,
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


@user_bp.route('/user/<username>/leagues')
def get_user_leagues(username):
    """
    Get all leagues for a user
    
    Args:
        username: Sleeper username
    
    Query Parameters:
        season: Season year (default: 2025)
    
    Returns:
        JSON response with leagues data or error
    """
    try:
        # Get season from query parameters
        season = request.args.get('season', '2025')
        
        # First get user info to get user_id
        user_data = SleeperAPI.get_user(username)
        
        if user_data is None:
            return jsonify({
                'error': f'User "{username}" not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        user_id = user_data.get('user_id')
        if not user_id:
            return jsonify({
                'error': 'User ID not found in user data',
                'code': 'INVALID_USER_DATA'
            }), 500
        
        # Get leagues for the user
        leagues = SleeperAPI.get_user_leagues(user_id, season)
        
        return jsonify({
            'user': {
                'user_id': user_id,
                'username': username,
                'display_name': user_data.get('display_name', username)
            },
            'leagues': leagues,
            'season': season,
            'total_leagues': len(leagues),
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


@user_bp.route('/user/<username>/leagues/<league_id>/drafts')
def get_league_drafts(username, league_id):
    """
    Get all drafts for a specific league
    
    Args:
        username: Sleeper username (for validation)
        league_id: League ID
    
    Returns:
        JSON response with drafts data or error
    """
    try:
        # Validate user exists
        user_data = SleeperAPI.get_user(username)
        if user_data is None:
            return jsonify({
                'error': f'User "{username}" not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        # Get league info
        league_info = SleeperAPI.get_league_info(league_id)
        if league_info is None:
            return jsonify({
                'error': f'League "{league_id}" not found',
                'code': 'LEAGUE_NOT_FOUND'
            }), 404
        
        # Get drafts for the league
        drafts = SleeperAPI.get_league_drafts(league_id)
        
        return jsonify({
            'user': {
                'user_id': user_data.get('user_id'),
                'username': username
            },
            'league': {
                'league_id': league_id,
                'name': league_info.get('name', 'Unknown League')
            },
            'drafts': drafts,
            'total_drafts': len(drafts),
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
