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
    Get all leagues for a user with draft information
    
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
        
        # Add draft information to each league
        for league in leagues:
            league_id = league.get('league_id')
            if league_id:
                try:
                    # Get drafts for this league
                    drafts = SleeperAPI.get_league_drafts(league_id)
                    league['drafts'] = drafts
                except Exception as e:
                    print(f"⚠️ Failed to get drafts for league {league_id}: {e}")
                    league['drafts'] = []
            else:
                league['drafts'] = []
        
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

@user_bp.route('/user/<username>/queue', methods=['GET'])
def get_user_queue(username):
    """
    Get user's draft queue
    
    Args:
        username: Sleeper username
    
    Returns:
        JSON response with user's queue or empty queue
    """
    try:
        # For now, return empty queue since we're using localStorage
        # In the future, this could be stored in a database
        return jsonify({
            'username': username,
            'queue': [],
            'queue_size': 0,
            'last_updated': None,
            'status': 'success',
            'note': 'Queue is currently stored locally in browser'
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500


@user_bp.route('/user/<username>/queue', methods=['POST'])
def update_user_queue(username):
    """
    Update user's draft queue
    
    Args:
        username: Sleeper username
    
    Request Body:
        {
            "queue": [
                {
                    "player_id": "player_id",
                    "name": "Player Name",
                    "position": "QB",
                    "team": "LAR",
                    "rank": 15,
                    "tier": 2,
                    "notes": "Optional user notes"
                }
            ]
        }
    
    Returns:
        JSON response confirming queue update
    """
    try:
        data = request.get_json()
        if not data or 'queue' not in data:
            return jsonify({
                'error': 'Queue data is required',
                'code': 'MISSING_QUEUE_DATA'
            }), 400
        
        queue = data['queue']
        
        # Validate queue data
        if not isinstance(queue, list):
            return jsonify({
                'error': 'Queue must be an array',
                'code': 'INVALID_QUEUE_FORMAT'
            }), 400
        
        # Validate each queue item
        for i, item in enumerate(queue):
            if not isinstance(item, dict):
                return jsonify({
                    'error': f'Queue item {i} must be an object',
                    'code': 'INVALID_QUEUE_ITEM'
                }), 400
            
            required_fields = ['player_id', 'name', 'position']
            for field in required_fields:
                if field not in item:
                    return jsonify({
                        'error': f'Queue item {i} missing required field: {field}',
                        'code': 'MISSING_REQUIRED_FIELD'
                    }), 400
        
        # For now, just acknowledge the update since we're using localStorage
        # In the future, this would save to a database
        return jsonify({
            'username': username,
            'queue_size': len(queue),
            'status': 'success',
            'message': 'Queue updated successfully (stored locally)',
            'timestamp': int(time.time())
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500


@user_bp.route('/user/<username>/queue/recommendations', methods=['GET'])
def get_queue_recommendations(username):
    """
    Get recommended players for user's queue based on draft context
    
    Args:
        username: Sleeper username
    
    Query Parameters:
        draft_id: Current draft ID for context
        limit: Number of recommendations (default: 10)
    
    Returns:
        JSON response with recommended players for queue
    """
    try:
        draft_id = request.args.get('draft_id')
        limit = int(request.args.get('limit', 10))
        
        if not draft_id:
            return jsonify({
                'error': 'Draft ID is required for recommendations',
                'code': 'MISSING_DRAFT_ID'
            }), 400
        
        # Get draft context
        from ..services.sleeper_api import SleeperAPI
        draft_info = SleeperAPI.get_draft_info(draft_id)
        if not draft_info:
            return jsonify({
                'error': 'Draft not found',
                'code': 'DRAFT_NOT_FOUND'
            }), 404
        
        # Get league info for format detection
        league_id = draft_info.get('league_id')
        league_format = 'half_ppr_superflex'  # Default
        
        if league_id:
            try:
                league_info = SleeperAPI.get_league_info(league_id)
                if league_info:
                    scoring_format, league_type = SleeperAPI.detect_league_format(league_info)
                    league_format = f"{scoring_format}_{league_type}"
            except:
                pass
        
        # Get unavailable players
        try:
            unavailable_players, is_dynasty = SleeperAPI.get_all_unavailable_players(draft_id, league_id)
        except:
            unavailable_players, is_dynasty = [], False
        
        # Get top available players as recommendations
        # This is a simplified recommendation system
        recommendations = []
        
        try:
            # Import rankings manager (this is a simplified approach)
            from ..rankings.SimpleRankingsManager import SimpleRankingsManager
            rankings_manager = SimpleRankingsManager()
            
            # Get best available players across positions
            positions = ['QB', 'RB', 'WR', 'TE']
            players_per_position = max(1, limit // len(positions))
            
            for position in positions:
                try:
                    position_players = rankings_manager.get_available_players(
                        drafted_players=unavailable_players,
                        league_format=league_format,
                        position_filter=position,
                        limit=players_per_position
                    )
                    
                    for player in position_players:
                        if len(recommendations) < limit:
                            # Add recommendation reason
                            player['recommendation_reason'] = f"Top available {position}"
                            player['recommendation_priority'] = len(recommendations) + 1
                            recommendations.append(player)
                
                except Exception as e:
                    print(f"⚠️ Error getting {position} recommendations: {e}")
                    continue
        
        except Exception as e:
            print(f"⚠️ Error getting recommendations: {e}")
            # Fallback to basic recommendations
            recommendations = [
                {
                    'player_id': 'example_1',
                    'name': 'Top Available Player',
                    'position': 'RB',
                    'team': 'LAR',
                    'rank': 1,
                    'tier': 1,
                    'recommendation_reason': 'Highest ranked available',
                    'recommendation_priority': 1
                }
            ]
        
        return jsonify({
            'username': username,
            'draft_id': draft_id,
            'league_format': league_format,
            'recommendations': recommendations,
            'total_recommendations': len(recommendations),
            'status': 'success'
        })
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'INVALID_INPUT'
        }), 400
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500

@user_bp.route('/user/<username>/leagues/<league_id>/users')
def get_league_users(username, league_id):
    """
    Get all users in a specific league
    
    Args:
        username: Sleeper username (for context/validation)
        league_id: League ID
    
    Returns:
        JSON response with league users data or error
    """
    try:
        # Get league users
        users = SleeperAPI.get_league_users(league_id)
        
        if not users:
            return jsonify({
                'error': 'No users found for league',
                'code': 'NO_USERS_FOUND'
            }), 404
        
        return jsonify({
            'users': users,
            'league_id': league_id,
            'total_users': len(users),
            'status': 'success'
        })
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'INVALID_REQUEST'
        }), 400
        
    except SleeperAPIError as e:
        return jsonify({
            'error': f'Sleeper API error: {str(e)}',
            'code': 'SLEEPER_API_ERROR'
        }), 502
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500
