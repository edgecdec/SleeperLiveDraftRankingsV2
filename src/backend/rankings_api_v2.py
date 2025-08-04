"""
Rankings API V2 for Fantasy Football Draft Assistant
Uses in-memory storage for uploads and auto-downloads Fantasy Pros rankings
"""

import os
import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
rankings_bp_v2 = Blueprint('rankings_v2', __name__)

# Configuration
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
ALLOWED_EXTENSIONS = {'csv'}

# Initialize services with error handling
try:
    # Try absolute imports first
    from services.fantasy_pros_downloader import StaticFantasyProsProvider
    from services.in_memory_rankings import in_memory_rankings
    
    fantasy_pros_provider = StaticFantasyProsProvider(DATA_DIR)
    SERVICES_AVAILABLE = True
    logger.info("✅ Full rankings services initialized successfully")
    
except ImportError:
    try:
        # Try relative imports
        from .services.fantasy_pros_downloader import StaticFantasyProsProvider
        from .services.in_memory_rankings import in_memory_rankings
        
        fantasy_pros_provider = StaticFantasyProsProvider(DATA_DIR)
        SERVICES_AVAILABLE = True
        logger.info("✅ Full rankings services initialized successfully")
        
    except ImportError as e:
        logger.warning(f"⚠️ Full rankings services not available, using fallback: {e}")
        try:
            # Try absolute fallback import
            from services.simple_rankings_fallback import simple_fantasy_pros, simple_in_memory, initialize_simple_rankings
            
            initialize_simple_rankings(DATA_DIR)
            fantasy_pros_provider = simple_fantasy_pros
            in_memory_rankings = simple_in_memory
            SERVICES_AVAILABLE = True
            logger.info("✅ Fallback rankings services initialized")
            
        except ImportError:
            try:
                # Try relative fallback import
                from .services.simple_rankings_fallback import simple_fantasy_pros, simple_in_memory, initialize_simple_rankings
                
                initialize_simple_rankings(DATA_DIR)
                fantasy_pros_provider = simple_fantasy_pros
                in_memory_rankings = simple_in_memory
                SERVICES_AVAILABLE = True
                logger.info("✅ Fallback rankings services initialized")
                
            except ImportError as e2:
                logger.error(f"❌ Even fallback rankings services not available: {e2}")
                fantasy_pros_provider = None
                in_memory_rankings = None
                SERVICES_AVAILABLE = False

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@rankings_bp_v2.route('/list', methods=['GET'])
def list_rankings():
    """Get list of all available rankings (Fantasy Pros + uploaded)"""
    try:
        logger.info("📋 Fetching available rankings...")
        
        if not SERVICES_AVAILABLE:
            return jsonify({
                'status': 'error',
                'message': 'Rankings services not available'
            }), 503
        
        # Get Fantasy Pros rankings
        fantasy_pros_rankings = fantasy_pros_provider.get_available_rankings() if fantasy_pros_provider else []
        
        # Get uploaded rankings
        uploaded_rankings = in_memory_rankings.get_available_rankings() if in_memory_rankings else []
        
        # Convert Fantasy Pros rankings to frontend-expected format
        formatted_fantasy_pros = []
        for ranking in fantasy_pros_rankings:
            formatted_fantasy_pros.append({
                'id': ranking['id'],
                'name': ranking['name'],
                'type': 'built-in',  # Frontend expects 'built-in' for Fantasy Pros
                'scoring': ranking['scoring'].upper(),
                'format': ranking['format'].title(),
                'source': ranking['source'],
                'category': 'FantasyPros'
            })
        
        # Convert uploaded rankings to frontend-expected format
        formatted_uploaded = []
        for ranking in uploaded_rankings:
            formatted_uploaded.append({
                'id': ranking['id'],
                'name': ranking['name'],
                'type': 'custom',  # Frontend expects 'custom' for uploads
                'scoring': 'Custom',
                'format': 'Custom',
                'source': ranking['source'],
                'category': 'Custom Upload'
            })
        
        # Combine all rankings
        all_rankings = formatted_fantasy_pros + formatted_uploaded
        
        logger.info(f"✅ Found {len(all_rankings)} total rankings ({len(formatted_fantasy_pros)} Fantasy Pros, {len(formatted_uploaded)} uploaded)")
        
        return jsonify({
            'status': 'success',
            'rankings': all_rankings,
            'total': len(all_rankings),
            'fantasy_pros_count': len(formatted_fantasy_pros),
            'uploaded_count': len(formatted_uploaded)
        })
        
    except Exception as e:
        logger.error(f"❌ Error listing rankings: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/data/<ranking_id>', methods=['GET'])
def get_ranking_data(ranking_id):
    """Get player data for a specific ranking"""
    try:
        logger.info(f"📊 Fetching data for ranking: {ranking_id}")
        
        if not SERVICES_AVAILABLE:
            return jsonify({
                'status': 'error',
                'message': 'Rankings services not available'
            }), 503
        
        # Check if it's an uploaded ranking first
        if in_memory_rankings:
            uploaded_data = in_memory_rankings.get_ranking_data(ranking_id)
            if uploaded_data:
                return jsonify({
                    'status': 'success',
                    'players': uploaded_data['players'],
                    'total_players': uploaded_data['total_players'],
                    'source': uploaded_data['source'],
                    'type': uploaded_data['type']
                })
        
        # Check Fantasy Pros rankings
        if fantasy_pros_provider:
            fantasy_pros_rankings = fantasy_pros_provider.get_available_rankings()
            fantasy_pros_ranking = next((r for r in fantasy_pros_rankings if r['id'] == ranking_id), None)
            
            if fantasy_pros_ranking:
                # Load CSV data
                import pandas as pd
                df = pd.read_csv(fantasy_pros_ranking['filepath'])
                
                # Convert to our standard format
                players = []
                for _, row in df.iterrows():
                    player = {}
                    for col in df.columns:
                        col_lower = col.lower().strip()
                        if col_lower in ['name', 'player', 'player_name']:
                            player['name'] = str(row[col]).strip()
                        elif col_lower in ['position', 'pos']:
                            player['position'] = str(row[col]).strip().upper()
                        elif col_lower in ['team']:
                            player['team'] = str(row[col]).strip().upper()
                        elif col_lower in ['overall_rank', 'overall rank', 'rank', 'overall']:
                            try:
                                player['overall_rank'] = int(float(row[col]))
                            except (ValueError, TypeError):
                                player['overall_rank'] = 999
                        elif col_lower in ['position_rank', 'position rank', 'pos_rank']:
                            try:
                                player['position_rank'] = int(float(row[col]))
                            except (ValueError, TypeError):
                                player['position_rank'] = 999
                        else:
                            player[col] = str(row[col])
                    
                    if 'name' in player and 'position' in player:
                        players.append(player)
                
                return jsonify({
                    'status': 'success',
                    'players': players,
                    'total_players': len(players),
                    'source': 'Fantasy Pros',
                    'type': 'fantasy_pros'
                })
        
        # Ranking not found
        return jsonify({
            'status': 'error',
            'message': f'Ranking not found: {ranking_id}'
        }), 404
        
    except Exception as e:
        logger.error(f"❌ Error fetching ranking data for {ranking_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/upload', methods=['POST'])
def upload_ranking():
    """Upload a custom ranking file (stored in memory)"""
    try:
        logger.info("📤 Processing ranking upload...")
        
        if not SERVICES_AVAILABLE or not in_memory_rankings:
            return jsonify({
                'status': 'error',
                'message': 'Upload service not available'
            }), 503
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'status': 'error',
                'message': 'Invalid file type. Only CSV files are allowed.'
            }), 400
        
        # Get metadata
        metadata = {
            'name': request.form.get('name', file.filename.replace('.csv', '')),
            'scoring': request.form.get('scoring', 'custom'),
            'format': request.form.get('format', 'custom')
        }
        
        # Read file content
        file_content = file.read()
        
        # Process upload using in-memory manager
        result = in_memory_rankings.upload_ranking(file_content, file.filename, metadata)
        
        logger.info(f"✅ Successfully uploaded ranking: {file.filename}")
        
        return jsonify({
            'status': 'success',
            'message': f'Successfully uploaded {file.filename}',
            'ranking': result
        })
        
    except Exception as e:
        logger.error(f"❌ Error uploading ranking: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/delete/<ranking_id>', methods=['DELETE'])
def delete_ranking(ranking_id):
    """Delete a ranking (only uploaded rankings can be deleted)"""
    try:
        logger.info(f"🗑️ Deleting ranking: {ranking_id}")
        
        if not SERVICES_AVAILABLE or not in_memory_rankings:
            return jsonify({
                'status': 'error',
                'message': 'Delete service not available'
            }), 503
        
        # Only allow deletion of uploaded rankings
        if not ranking_id.startswith('upload_'):
            return jsonify({
                'status': 'error',
                'message': 'Cannot delete Fantasy Pros rankings'
            }), 400
        
        success = in_memory_rankings.delete_ranking(ranking_id)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': f'Successfully deleted ranking: {ranking_id}'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'Ranking not found: {ranking_id}'
            }), 404
            
    except Exception as e:
        logger.error(f"❌ Error deleting ranking {ranking_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/stats', methods=['GET'])
def get_rankings_stats():
    """Get statistics about rankings system"""
    try:
        if not SERVICES_AVAILABLE:
            return jsonify({
                'status': 'error',
                'message': 'Stats service not available'
            }), 503
        
        fantasy_pros_rankings = fantasy_pros_provider.get_available_rankings() if fantasy_pros_provider else []
        upload_stats = in_memory_rankings.get_ranking_stats() if in_memory_rankings else {'total_rankings': 0, 'total_players': 0, 'memory_usage_mb': 0}
        
        return jsonify({
            'status': 'success',
            'stats': {
                'fantasy_pros_rankings': len(fantasy_pros_rankings),
                'uploaded_rankings': upload_stats['total_rankings'],
                'total_uploaded_players': upload_stats['total_players'],
                'memory_usage_mb': upload_stats['memory_usage_mb']
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting stats: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Rankings API v2 is running',
        'services_available': SERVICES_AVAILABLE
    })
