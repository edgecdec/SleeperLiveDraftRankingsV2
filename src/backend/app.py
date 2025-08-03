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
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

# Import configuration
from .config import init_paths

# Import API blueprints
from .api.user import user_bp
from .api.draft import draft_bp
from .api.custom_rankings import custom_rankings_bp

# Try to import rankings (optional)
try:
    from .api.rankings import rankings_bp, init_rankings_routes
    RANKINGS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Rankings system not available: {e}")
    RANKINGS_AVAILABLE = False
    rankings_bp = None
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
    
    # Register API blueprints
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(draft_bp, url_prefix='/api')
    app.register_blueprint(custom_rankings_bp, url_prefix='/api')
    
    if RANKINGS_AVAILABLE and rankings_bp:
        app.register_blueprint(rankings_bp, url_prefix='/api')
        print("🏈 Rankings API endpoints registered")
    else:
        print("⚠️ Rankings API endpoints not available")
    
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
    
    # Serve static assets
    @app.route('/<path:filename>')
    def serve_static(filename):
        """Serve static files (CSS, JS, images, etc.)"""
        try:
            return send_from_directory(static_path, filename)
        except FileNotFoundError:
            return jsonify({'error': f'File not found: {filename}'}), 404
    
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
        if RANKINGS_AVAILABLE:
            endpoints.update({
                'available_players': '/api/draft/<draft_id>/available-players',
                'best_available': '/api/draft/<draft_id>/best-available',
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
    
    return app
