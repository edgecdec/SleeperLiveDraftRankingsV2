"""
Flask application factory for Fantasy Football Draft Assistant V2.

This module creates and configures the Flask application with:
- API route registration
- Static file serving (embedded in executable)
- CORS configuration for local development
- Error handling
"""

import os
import sys
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS

# Import configuration
from .config import init_paths

# Import API blueprints
from .api.user import user_bp
from .api.draft import draft_bp
from .api.custom_rankings import custom_rankings_bp
from .rankings_api_v2 import rankings_bp_new as rankings_bp

# Try to import new rankings system
try:
    from .rankings_api_v2 import rankings_bp_new
    from .services.simple_rankings_fallback import initialize_simple_rankings
    initialize_rankings = initialize_simple_rankings
    ensure_rankings_directory = lambda x: os.makedirs(x, exist_ok=True)
    NEW_RANKINGS_AVAILABLE = True
    print("✅ Rankings system available")
except ImportError as e:
    print(f"⚠️ Rankings system not available, trying fallback: {e}")
    try:
        from .rankings_api_v2 import rankings_bp_new
        from .services.simple_rankings_fallback import initialize_simple_rankings
        initialize_rankings = initialize_simple_rankings
        ensure_rankings_directory = lambda x: os.makedirs(x, exist_ok=True)
        NEW_RANKINGS_AVAILABLE = True
        print("✅ Rankings system available")
    except ImportError as e2:
        print(f"❌ No rankings system available: {e2}")
        rankings_bp_new = None
        initialize_rankings = None
        ensure_rankings_directory = None
        NEW_RANKINGS_AVAILABLE = False

# Try to import rankings (optional)
try:
    from .api.rankings import init_rankings_routes
    RANKINGS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Rankings system not available: {e}")
    RANKINGS_AVAILABLE = False
    init_rankings_routes = None


def get_static_path() -> str:
    """
    Get the path to static files, handling both development and PyInstaller builds.
    
    Returns:
        Absolute path to the frontend static files
    """
    if hasattr(sys, '_MEIPASS'):
        # PyInstaller executable - files are in temporary directory
        return os.path.join(sys._MEIPASS, 'frontend')
    else:
        # Development mode - files are in src/frontend
        return os.path.join(os.path.dirname(__file__), '..', 'frontend')


def get_base_path() -> str:
    """
    Get the base path for the application (for data files).
    
    Returns:
        Absolute path to the application base directory
    """
    if hasattr(sys, '_MEIPASS'):
        # PyInstaller executable - use the directory containing the executable
        return os.path.dirname(sys.executable)
    else:
        # Development mode - use the project root
        return os.path.join(os.path.dirname(__file__), '..', '..')


def create_app(debug: bool = False) -> Flask:
    """
    Create and configure the Flask application.
    
    Args:
        debug: Whether to run in debug mode
    
    Returns:
        Configured Flask application
    """
    global RANKINGS_AVAILABLE
    
    app = Flask(__name__)
    
    # Configuration
    app.config['DEBUG'] = debug
    app.config['SECRET_KEY'] = 'dev-key-change-in-production'  # Not critical for local app
    
    # Initialize paths for data files
    base_path = get_base_path()
    init_paths(base_path)
    
    # Initialize rankings manager (optional)
    if RANKINGS_AVAILABLE:
        try:
            from .rankings.SimpleRankingsManager import SimpleRankingsManager
            rankings_manager = SimpleRankingsManager()
            init_rankings_routes(rankings_manager)
            print("🏈 Rankings system initialized successfully")
        except Exception as e:
            print(f"⚠️ Rankings system initialization failed: {e}")
            print("   Draft assistant will work with limited functionality")
            RANKINGS_AVAILABLE = False
    else:
        print("⚠️ Rankings system not available - running with basic functionality")
    
    # Enable CORS for local development
    CORS(app, origins=['http://localhost:*', 'http://127.0.0.1:*'])
    
    # Get static file path
    static_path = get_static_path()
    
    # Initialize Fantasy Pros provider for runtime rankings generation
    if NEW_RANKINGS_AVAILABLE:
        try:
            from .services.fantasy_pros_provider import initialize_fantasy_pros_provider
            data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
            initialize_fantasy_pros_provider(data_dir)
            print("🏈 Fantasy Pros provider initialized for runtime rankings")
        except Exception as e:
            print(f"⚠️ Failed to initialize Fantasy Pros provider: {e}")
    
    # Register API blueprints
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(draft_bp, url_prefix='/api')
    app.register_blueprint(custom_rankings_bp, url_prefix='/api')
    
    # Register new rankings API (primary system)
    if NEW_RANKINGS_AVAILABLE and rankings_bp_new:
        app.register_blueprint(rankings_bp_new, url_prefix='/api/rankings')
        print("🏈 New rankings API registered at /api/rankings/*")
    
    # Legacy rankings API is now the same as new rankings API, so no need to register twice
    
    if RANKINGS_AVAILABLE and init_rankings_routes:
        init_rankings_routes(app)
        print("🏈 Additional rankings API endpoints registered")
    
    print("🏈 Rankings CSV API endpoints registered")
    
    # Serve main HTML file
    @app.route('/')
    def serve_index():
        """Serve the main HTML file"""
        try:
            return send_from_directory(static_path, 'index.html')
        except FileNotFoundError:
            return jsonify({
                'error': 'Frontend files not found',
                'path': static_path,
                'help': 'Make sure frontend files are built and in the correct location'
            }), 404
    
    # SPA route for user-based pages
    @app.route('/sleeper/user/<username>')
    def serve_sleeper_user_page(username):
        """Serve the main HTML file for user-based pages"""
        print(f"👤 User page requested for: {username}")
        try:
            return send_from_directory(static_path, 'index.html')
        except Exception as e:
            print(f"❌ Error serving user page: {e}")
            return f"Error loading user page: {e}", 500
    
    # SPA route for user leagues page
    @app.route('/sleeper/user/<username>/leagues')
    def serve_user_leagues_page(username):
        """Serve the main HTML file for user leagues pages"""
        print(f"🏈 User leagues page requested for: {username}")
        try:
            return send_from_directory(static_path, 'index.html')
        except Exception as e:
            print(f"❌ Error serving user leagues page: {e}")
            return f"Error loading leagues page: {e}", 500
    
    # SPA route for user-based draft pages
    @app.route('/sleeper/user/<username>/league/<league_id>/draft/<draft_id>')
    def serve_user_draft_page(username, league_id, draft_id):
        """Serve the main HTML file for user-based draft pages"""
        print(f"🎯 User draft page requested for user: {username}, league: {league_id}, draft: {draft_id}")
        try:
            return send_from_directory(static_path, 'index.html')
        except Exception as e:
            print(f"❌ Error serving user draft page: {e}")
            return f"Error loading draft page: {e}", 500
    
    # SPA route for user-based mock draft pages
    @app.route('/sleeper/user/<username>/league/<league_id>/draft/<draft_id>/mock/<mock_draft_id>')
    def serve_user_mock_draft_page(username, league_id, draft_id, mock_draft_id):
        """Serve the main HTML file for user-based mock draft pages"""
        print(f"🎭 User mock draft page requested for user: {username}, league: {league_id}, draft: {draft_id}, mock: {mock_draft_id}")
        try:
            return send_from_directory(static_path, 'index.html')
        except Exception as e:
            print(f"❌ Error serving user mock draft page: {e}")
            return f"Error loading mock draft page: {e}", 500
    
    # Mock draft route
    @app.route('/sleeper/mock/<draft_id>')
    def serve_mock_draft_page(draft_id):
        """Serve the main HTML file for mock draft pages"""
        print(f"🎭 Mock draft page requested for draft: {draft_id}")
        try:
            return send_from_directory(static_path, 'index.html')
        except Exception as e:
            print(f"❌ Error serving mock draft page: {e}")
            return f"Error loading mock draft page: {e}", 500
    
    
    # Legacy route for backward compatibility (will be migrated by frontend)
    @app.route('/sleeper/league/<league_id>/draft/<draft_id>')
    def serve_draft_page(league_id, draft_id):
        """Serve the main HTML file for draft pages (legacy route)"""
        print(f"⚠️ Legacy draft page requested for league: {league_id}, draft: {draft_id}")
        print(f"🔄 This should be migrated to /sleeper/user/USERNAME/league/{league_id}/draft/{draft_id}")
        try:
            return send_from_directory(static_path, 'index.html')
        except FileNotFoundError:
            return jsonify({
                'error': 'Frontend files not found',
                'path': static_path,
                'help': 'Make sure frontend files are built and in the correct location'
            }), 404
    
    # Serve static assets
    @app.route('/js/<path:filename>')
    def serve_js(filename):
        """Serve JavaScript files"""
        try:
            return send_from_directory(os.path.join(static_path, 'js'), filename)
        except FileNotFoundError:
            return jsonify({'error': f'JS file not found: {filename}'}), 404
    
    @app.route('/css/<path:filename>')
    def serve_css(filename):
        """Serve CSS files"""
        try:
            return send_from_directory(os.path.join(static_path, 'css'), filename)
        except FileNotFoundError:
            return jsonify({'error': f'CSS file not found: {filename}'}), 404
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        """Health check endpoint for testing"""
        return jsonify({
            'status': 'healthy',
            'version': '2.0.0',
            'debug': debug,
            'static_path': static_path,
            'base_path': base_path
        })
    
    # Debug endpoint to see registered routes
    @app.route('/api/debug/routes')
    def debug_routes():
        """Debug endpoint to see all registered routes"""
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'rule': str(rule)
            })
        return jsonify({'routes': routes})
    
    # Test route to debug SPA routing
    @app.route('/test-user/<username>')
    def test_user_route(username):
        """Test route to debug SPA routing"""
        return jsonify({'message': f'Test route works for user: {username}'})
    
    # Basic API info endpoint
    @app.route('/api/info')
    def api_info():
        """API information endpoint"""
        endpoints = {
            'health': '/api/health',
            'info': '/api/info',
            'user': '/api/user/<username>',
            'user_leagues': '/api/user/<username>/leagues',
            'league_drafts': '/api/user/<username>/leagues/<league_id>/drafts',
            'draft_info': '/api/draft/<draft_id>',
            'draft_picks': '/api/draft/<draft_id>/picks',
            'league_info': '/api/league/<league_id>'
        }
        
        # Add rankings endpoints if available
        if NEW_RANKINGS_AVAILABLE:
            endpoints.update({
                'rankings_list': '/api/rankings/list',
                'rankings_data': '/api/rankings/data/<ranking_id>',
                'rankings_upload': '/api/rankings/upload',
                'rankings_health': '/api/rankings/health'
            })
        
        if RANKINGS_AVAILABLE:
            endpoints.update({
                'rankings_formats': '/api/rankings/formats',
                'rankings_status': '/api/rankings/status'
            })
        
        return jsonify({
            'name': 'Fantasy Football Draft Assistant API',
            'version': '2.0.0',
            'rankings_enabled': RANKINGS_AVAILABLE,
            'endpoints': endpoints
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        if debug:
            return jsonify({'error': str(error)}), 500
        return jsonify({'error': 'Internal server error'}), 500
    
    # Test dynasty detection endpoint
    @app.route('/api/test/dynasty/<draft_id>')
    def test_dynasty_detection(draft_id):
        """Test dynasty detection for debugging"""
        try:
            from .services.sleeper_api import SleeperAPI
            
            # Get draft info
            draft_info = SleeperAPI.get_draft_info(draft_id)
            league_id = draft_info.get('league_id') if draft_info else None
            
            if not league_id:
                return jsonify({'error': 'Could not get league ID from draft'})
            
            # Get league info
            league_info = SleeperAPI.get_league_info(league_id)
            
            if not league_info:
                return jsonify({'error': 'Could not get league info'})
            
            # Test dynasty detection
            is_dynasty = SleeperAPI.is_dynasty_or_keeper_league(league_info)
            
            return jsonify({
                'draft_id': draft_id,
                'league_id': league_id,
                'is_dynasty': is_dynasty,
                'league_settings': league_info.get('settings', {}),
                'previous_league_id': league_info.get('previous_league_id'),
                'status': 'success'
            })
            
        except Exception as e:
            return jsonify({
                'error': str(e),
                'status': 'error'
            })

    # Simple test endpoint to verify SleeperAPI method
    @app.route('/api/test/method')
    def test_method():
        """Test if the method exists"""
        try:
            from .services.sleeper_api import SleeperAPI
            
            # Check if method exists
            has_method = hasattr(SleeperAPI, 'is_dynasty_or_keeper_league')
            
            # Get all methods
            methods = [method for method in dir(SleeperAPI) if not method.startswith('_')]
            
            return jsonify({
                'has_method': has_method,
                'all_methods': methods,
                'status': 'success'
            })
            
        except Exception as e:
            return jsonify({
                'error': str(e),
                'status': 'error'
            })

    return app
