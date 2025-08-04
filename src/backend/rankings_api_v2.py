"""
Rankings API v2 - Enhanced rankings system with runtime Fantasy Pros generation
"""

import logging
from flask import Blueprint, jsonify, request
from datetime import datetime

# Import services
try:
    from .services.fantasy_pros_provider import fantasy_pros_provider
    from .services.simple_rankings_fallback import simple_in_memory
    SERVICES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Rankings services not available: {e}")
    fantasy_pros_provider = None
    simple_in_memory = None
    SERVICES_AVAILABLE = False

logger = logging.getLogger(__name__)

# Create blueprint
rankings_bp_v2 = Blueprint('rankings_v2', __name__)

@rankings_bp_v2.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Rankings API v2 is running',
        'services_available': SERVICES_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    })

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
        uploaded_rankings = simple_in_memory.get_available_rankings() if simple_in_memory else []
        
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
                'category': 'FantasyPros',
                'metadata': {
                    'total_players': ranking.get('total_players', 0),
                    'last_updated': ranking.get('last_updated')
                }
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
                'category': 'Custom Upload',
                'metadata': {
                    'total_players': ranking.get('total_players', 0),
                    'upload_time': ranking.get('upload_time')
                }
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
    """Get ranking data for a specific ranking"""
    try:
        logger.info(f"📊 Fetching ranking data for: {ranking_id}")
        
        if not SERVICES_AVAILABLE:
            return jsonify({
                'status': 'error',
                'message': 'Rankings services not available'
            }), 503
        
        # Try Fantasy Pros provider first
        if fantasy_pros_provider:
            data = fantasy_pros_provider.get_ranking_data(ranking_id)
            if data:
                return jsonify({
                    'status': 'success',
                    'ranking_id': ranking_id,
                    'players': data['players'],
                    'total_players': data['total_players'],
                    'last_updated': data.get('last_updated'),
                    'source': 'Fantasy Pros'
                })
        
        # Try uploaded rankings
        if simple_in_memory:
            data = simple_in_memory.get_ranking_data(ranking_id)
            if data:
                return jsonify({
                    'status': 'success',
                    'ranking_id': ranking_id,
                    'players': data['players'],
                    'total_players': data['total_players'],
                    'upload_time': data.get('upload_time'),
                    'source': 'User Upload'
                })
        
        # Not found
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
        
        if not SERVICES_AVAILABLE or not fantasy_pros_provider:
            return jsonify({
                'status': 'error',
                'message': 'Fantasy Pros provider not available'
            }), 503
        
        # Force refresh
        fantasy_pros_provider.force_refresh()
        
        # Get updated count
        rankings = fantasy_pros_provider.get_available_rankings()
        
        return jsonify({
            'status': 'success',
            'message': 'Rankings refreshed successfully',
            'total_rankings': len(rankings),
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
    """Upload a custom ranking file"""
    try:
        logger.info("📤 Processing ranking upload...")
        
        if not SERVICES_AVAILABLE or not simple_in_memory:
            return jsonify({
                'status': 'error',
                'message': 'Upload service not available'
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
        
        # Process upload
        result = simple_in_memory.upload_ranking(
            file.read(),
            file.filename,
            metadata
        )
        
        logger.info(f"✅ Upload successful: {result['name']}")
        
        return jsonify({
            'status': 'success',
            'message': 'Ranking uploaded successfully',
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
        
        if not SERVICES_AVAILABLE or not simple_in_memory:
            return jsonify({
                'status': 'error',
                'message': 'Delete service not available'
            }), 503
        
        # Only allow deletion of custom rankings
        if not ranking_id.startswith('upload_'):
            return jsonify({
                'status': 'error',
                'message': 'Cannot delete built-in rankings'
            }), 400
        
        success = simple_in_memory.delete_ranking(ranking_id)
        
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
        stats = {
            'fantasy_pros_rankings': 0,
            'uploaded_rankings': 0,
            'total_uploaded_players': 0,
            'memory_usage_mb': 0.1
        }
        
        if fantasy_pros_provider:
            fp_stats = fantasy_pros_provider.get_stats()
            stats['fantasy_pros_rankings'] = fp_stats.get('total_rankings', 0)
            stats['memory_usage_mb'] += fp_stats.get('cache_size_mb', 0)
        
        if simple_in_memory:
            mem_stats = simple_in_memory.get_ranking_stats()
            stats['uploaded_rankings'] = mem_stats.get('total_rankings', 0)
            stats['total_uploaded_players'] = mem_stats.get('total_players', 0)
            stats['memory_usage_mb'] += mem_stats.get('memory_usage_mb', 0)
        
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
