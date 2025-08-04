"""
Rankings API v2 - Unified rankings system with Fantasy Pros scraping and persistent uploads
"""

import logging
from flask import Blueprint, jsonify, request
from datetime import datetime

# Import unified rankings manager
try:
    from .services.rankings_manager import rankings_manager
    RANKINGS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Rankings manager not available: {e}")
    rankings_manager = None
    RANKINGS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Create blueprint
rankings_bp_v2 = Blueprint('rankings_v2', __name__)

@rankings_bp_v2.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Rankings API v2 is running',
        'rankings_available': RANKINGS_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    })

@rankings_bp_v2.route('/list', methods=['GET'])
def list_rankings():
    """Get list of all available rankings (Fantasy Pros + uploaded)"""
    try:
        logger.info("📋 Fetching available rankings...")
        
        if not RANKINGS_AVAILABLE or not rankings_manager:
            return jsonify({
                'status': 'error',
                'message': 'Rankings manager not available'
            }), 503
        
        # Get all rankings from unified manager
        all_rankings = rankings_manager.get_all_rankings()
        
        # Count by type
        fantasy_pros_count = len([r for r in all_rankings if r['type'] == 'built-in'])
        uploaded_count = len([r for r in all_rankings if r['type'] == 'custom'])
        
        logger.info(f"✅ Found {len(all_rankings)} total rankings ({fantasy_pros_count} Fantasy Pros, {uploaded_count} uploaded)")
        
        return jsonify({
            'status': 'success',
            'rankings': all_rankings,
            'total': len(all_rankings),
            'fantasy_pros_count': fantasy_pros_count,
            'uploaded_count': uploaded_count
        })
        
    except Exception as e:
        logger.error(f"❌ Error listing rankings: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/data/<ranking_id>', methods=['GET'])
def get_ranking_data(ranking_id):
    """Get ranking data for a specific ranking"""
    try:
        logger.info(f"📊 Fetching ranking data for: {ranking_id}")
        
        if not RANKINGS_AVAILABLE or not rankings_manager:
            return jsonify({
                'status': 'error',
                'message': 'Rankings manager not available'
            }), 503
        
        # Get ranking data from unified manager
        data = rankings_manager.get_ranking_data(ranking_id)
        
        if data:
            return jsonify({
                'status': 'success',
                'ranking_id': ranking_id,
                'players': data['players'],
                'total_players': data['total_players'],
                'last_updated': data.get('last_updated'),
                'upload_time': data.get('upload_time'),
                'source': data.get('source', 'Unknown')
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'Ranking {ranking_id} not found'
            }), 404
        
    except Exception as e:
        logger.error(f"❌ Error getting ranking data: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/refresh', methods=['POST'])
def refresh_rankings():
    """Force refresh Fantasy Pros rankings"""
    try:
        logger.info("🔄 Force refreshing Fantasy Pros rankings...")
        
        if not RANKINGS_AVAILABLE or not rankings_manager:
            return jsonify({
                'status': 'error',
                'message': 'Rankings manager not available'
            }), 503
        
        # Force refresh Fantasy Pros
        rankings_manager.force_refresh_fantasy_pros()
        
        # Get updated rankings
        all_rankings = rankings_manager.get_all_rankings()
        fantasy_pros_count = len([r for r in all_rankings if r['type'] == 'built-in'])
        
        return jsonify({
            'status': 'success',
            'message': 'Fantasy Pros rankings refreshed successfully',
            'fantasy_pros_count': fantasy_pros_count,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Error refreshing rankings: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/upload', methods=['POST'])
def upload_ranking():
    """Upload a custom ranking file with persistence"""
    try:
        logger.info("📤 Processing ranking upload...")
        
        if not RANKINGS_AVAILABLE or not rankings_manager:
            return jsonify({
                'status': 'error',
                'message': 'Rankings manager not available'
            }), 503
        
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400
        
        # Get metadata
        metadata = {
            'name': request.form.get('name', file.filename),
            'scoring': request.form.get('scoring', 'Custom'),
            'format': request.form.get('format', 'Custom')
        }
        
        # Process upload with persistence
        result = rankings_manager.upload_custom_ranking(
            file.read(),
            file.filename,
            metadata
        )
        
        logger.info(f"✅ Upload successful: {result['name']}")
        
        return jsonify({
            'status': 'success',
            'message': 'Ranking uploaded and saved successfully',
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
    """Delete a custom ranking"""
    try:
        logger.info(f"🗑️ Deleting ranking: {ranking_id}")
        
        if not RANKINGS_AVAILABLE or not rankings_manager:
            return jsonify({
                'status': 'error',
                'message': 'Rankings manager not available'
            }), 503
        
        # Only allow deletion of custom rankings
        if not ranking_id.startswith('upload_'):
            return jsonify({
                'status': 'error',
                'message': 'Cannot delete built-in rankings'
            }), 400
        
        success = rankings_manager.delete_custom_ranking(ranking_id)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Ranking deleted successfully'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Ranking not found'
            }), 404
        
    except Exception as e:
        logger.error(f"❌ Error deleting ranking: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_v2.route('/stats', methods=['GET'])
def get_stats():
    """Get rankings system statistics"""
    try:
        if not RANKINGS_AVAILABLE or not rankings_manager:
            return jsonify({
                'status': 'error',
                'message': 'Rankings manager not available'
            }), 503
        
        stats = rankings_manager.get_stats()
        
        return jsonify({
            'status': 'success',
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting stats: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
