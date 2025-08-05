"""
Rankings API - Enhanced rankings system with runtime Fantasy Pros generation
"""

import logging
import os
import csv
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

def load_ranking_from_csv(ranking_id):
    """Load ranking data directly from CSV file as fallback or generate mock data"""
    try:
        # Check if this is a mock ranking
        if ranking_id.startswith('mock_'):
            logger.info(f"🎭 Generating mock data for: {ranking_id}")
            return generate_mock_player_data(ranking_id)
        
        # Get the data directory path
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        data_dir = os.path.join(current_dir, 'data')
        
        # Construct the CSV filename
        csv_filename = f"{ranking_id}.csv"
        csv_filepath = os.path.join(data_dir, csv_filename)
        
        if not os.path.exists(csv_filepath):
            logger.warning(f"⚠️ CSV file not found: {csv_filepath}")
            return None
        
        players = []
        with open(csv_filepath, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                # Map CSV columns to our player format
                player = {
                    'name': row.get('Name', ''),
                    'full_name': row.get('Name', ''),  # Add full_name alias
                    'position': row.get('Position', ''),
                    'team': row.get('Team', ''),
                    'rank': int(row.get('Overall Rank', 999)),
                    'overall_rank': int(row.get('Overall Rank', 999)),  # Add overall_rank alias
                    'position_rank': int(row.get('Position Rank', 999)),
                    'bye_week': int(row.get('Bye', 0)),
                    'tier': int(row.get('Tier', 1))
                }
                players.append(player)
        
        logger.info(f"✅ Loaded {len(players)} players from {csv_filename}")
        
        return {
            'players': players,
            'total_players': len(players)
        }
        
    except Exception as e:
        logger.error(f"❌ Error loading CSV file {ranking_id}: {e}")
        return None


def generate_mock_player_data(ranking_id):
    """Generate mock player data for fresh installations"""
    try:
        # Basic mock player data
        mock_players = [
            {'name': 'Christian McCaffrey', 'full_name': 'Christian McCaffrey', 'position': 'RB', 'team': 'SF', 'rank': 1, 'overall_rank': 1, 'position_rank': 1, 'bye_week': 9, 'tier': 1},
            {'name': 'Josh Allen', 'full_name': 'Josh Allen', 'position': 'QB', 'team': 'BUF', 'rank': 2, 'overall_rank': 2, 'position_rank': 1, 'bye_week': 12, 'tier': 1},
            {'name': 'Tyreek Hill', 'full_name': 'Tyreek Hill', 'position': 'WR', 'team': 'MIA', 'rank': 3, 'overall_rank': 3, 'position_rank': 1, 'bye_week': 6, 'tier': 1},
            {'name': 'Austin Ekeler', 'full_name': 'Austin Ekeler', 'position': 'RB', 'team': 'LAC', 'rank': 4, 'overall_rank': 4, 'position_rank': 2, 'bye_week': 5, 'tier': 1},
            {'name': 'Cooper Kupp', 'full_name': 'Cooper Kupp', 'position': 'WR', 'team': 'LAR', 'rank': 5, 'overall_rank': 5, 'position_rank': 2, 'bye_week': 7, 'tier': 1},
            {'name': 'Derrick Henry', 'full_name': 'Derrick Henry', 'position': 'RB', 'team': 'TEN', 'rank': 6, 'overall_rank': 6, 'position_rank': 3, 'bye_week': 7, 'tier': 1},
            {'name': 'Davante Adams', 'full_name': 'Davante Adams', 'position': 'WR', 'team': 'LV', 'rank': 7, 'overall_rank': 7, 'position_rank': 3, 'bye_week': 6, 'tier': 1},
            {'name': 'Jonathan Taylor', 'full_name': 'Jonathan Taylor', 'position': 'RB', 'team': 'IND', 'rank': 8, 'overall_rank': 8, 'position_rank': 4, 'bye_week': 14, 'tier': 1},
            {'name': 'Stefon Diggs', 'full_name': 'Stefon Diggs', 'position': 'WR', 'team': 'BUF', 'rank': 9, 'overall_rank': 9, 'position_rank': 4, 'bye_week': 12, 'tier': 1},
            {'name': 'Travis Kelce', 'full_name': 'Travis Kelce', 'position': 'TE', 'team': 'KC', 'rank': 10, 'overall_rank': 10, 'position_rank': 1, 'bye_week': 8, 'tier': 1},
            {'name': 'Alvin Kamara', 'full_name': 'Alvin Kamara', 'position': 'RB', 'team': 'NO', 'rank': 11, 'overall_rank': 11, 'position_rank': 5, 'bye_week': 11, 'tier': 2},
            {'name': 'CeeDee Lamb', 'full_name': 'CeeDee Lamb', 'position': 'WR', 'team': 'DAL', 'rank': 12, 'overall_rank': 12, 'position_rank': 5, 'bye_week': 9, 'tier': 2},
            {'name': 'Nick Chubb', 'full_name': 'Nick Chubb', 'position': 'RB', 'team': 'CLE', 'rank': 13, 'overall_rank': 13, 'position_rank': 6, 'bye_week': 5, 'tier': 2},
            {'name': 'Ja\'Marr Chase', 'full_name': 'Ja\'Marr Chase', 'position': 'WR', 'team': 'CIN', 'rank': 14, 'overall_rank': 14, 'position_rank': 6, 'bye_week': 10, 'tier': 2},
            {'name': 'Patrick Mahomes', 'full_name': 'Patrick Mahomes', 'position': 'QB', 'team': 'KC', 'rank': 15, 'overall_rank': 15, 'position_rank': 2, 'bye_week': 8, 'tier': 2},
            {'name': 'Saquon Barkley', 'full_name': 'Saquon Barkley', 'position': 'RB', 'team': 'NYG', 'rank': 16, 'overall_rank': 16, 'position_rank': 7, 'bye_week': 11, 'tier': 2},
            {'name': 'A.J. Brown', 'full_name': 'A.J. Brown', 'position': 'WR', 'team': 'PHI', 'rank': 17, 'overall_rank': 17, 'position_rank': 7, 'bye_week': 7, 'tier': 2},
            {'name': 'Lamar Jackson', 'full_name': 'Lamar Jackson', 'position': 'QB', 'team': 'BAL', 'rank': 18, 'overall_rank': 18, 'position_rank': 3, 'bye_week': 8, 'tier': 2},
            {'name': 'Mark Andrews', 'full_name': 'Mark Andrews', 'position': 'TE', 'team': 'BAL', 'rank': 19, 'overall_rank': 19, 'position_rank': 2, 'bye_week': 8, 'tier': 2},
            {'name': 'Jaylen Waddle', 'full_name': 'Jaylen Waddle', 'position': 'WR', 'team': 'MIA', 'rank': 20, 'overall_rank': 20, 'position_rank': 8, 'bye_week': 6, 'tier': 2}
        ]
        
        # Extend the list to 200 players with generated names
        for i in range(21, 201):
            positions = ['RB', 'WR', 'QB', 'TE']
            teams = ['SF', 'BUF', 'MIA', 'LAC', 'LAR', 'TEN', 'LV', 'IND', 'KC', 'NO', 'DAL', 'CLE', 'CIN', 'NYG', 'PHI', 'BAL']
            
            mock_players.append({
                'name': f'Player {i}',
                'full_name': f'Player {i}',
                'position': positions[i % len(positions)],
                'team': teams[i % len(teams)],
                'rank': i,
                'overall_rank': i,
                'position_rank': (i // 4) + 1,
                'bye_week': (i % 14) + 4,
                'tier': min((i // 20) + 1, 10)
            })
        
        logger.info(f"🎭 Generated {len(mock_players)} mock players for {ranking_id}")
        
        return {
            'players': mock_players,
            'total_players': len(mock_players)
        }
        
    except Exception as e:
        logger.error(f"❌ Error generating mock data: {e}")
        return None


def create_fallback_rankings():
    """Create fallback rankings from existing CSV files or generate basic mock rankings"""
    rankings = []
    
    try:
        # Look for existing Fantasy Pros files in the data directory
        # Get the data directory path
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        data_dir = os.path.join(current_dir, 'data')
        
        if os.path.exists(data_dir):
            for filename in os.listdir(data_dir):
                if filename.startswith('FantasyPros_Rankings_') and filename.endswith('.csv'):
                    filepath = os.path.join(data_dir, filename)
                    
                    # Parse filename to get metadata
                    base_name = filename.replace('FantasyPros_Rankings_', '').replace('.csv', '')
                    
                    # Handle different filename patterns
                    if base_name.startswith('half_ppr_'):
                        scoring = 'half_ppr'
                        format_type = base_name.replace('half_ppr_', '')
                    else:
                        parts = base_name.split('_')
                        if len(parts) >= 2:
                            scoring = parts[0]
                            format_type = parts[1]
                        else:
                            continue  # Skip malformed filenames
                    
                    # Improve display names
                    scoring_display = {
                        'standard': 'STD',
                        'half_ppr': 'HALF',
                        'ppr': 'FULL'
                    }.get(scoring.lower(), scoring.upper())
                    
                    format_display = {
                        'standard': '1QB',
                        'superflex': '2QB'
                    }.get(format_type.lower(), format_type.upper())
                    
                    display_name = f"Fantasy Pros {scoring_display} {format_display}"
                    
                    # Count players in the file
                    player_count = 0
                    try:
                        with open(filepath, 'r', encoding='utf-8') as csvfile:
                            reader = csv.reader(csvfile)
                            next(reader, None)  # Skip header
                            player_count = sum(1 for row in reader)
                    except Exception as e:
                        logger.warning(f"⚠️ Error counting players in {filename}: {e}")
                        player_count = 0
                    
                    rankings.append({
                        'id': filename.replace('.csv', ''),
                        'name': display_name,
                        'type': 'built-in',
                        'scoring': scoring_display,
                        'format': format_display,
                        'source': 'Fantasy Pros (Fallback)',
                        'category': 'FantasyPros',
                        'metadata': {
                            'total_players': player_count,
                            'last_updated': None,
                            'filepath': filepath
                        }
                    })
        
        # If no existing files found, create basic mock rankings for fresh installations
        if not rankings:
            logger.info("🆕 Fresh installation detected - creating basic mock rankings")
            rankings = create_mock_rankings()
        
        logger.info(f"📊 Created {len(rankings)} fallback rankings")
        
    except Exception as e:
        logger.error(f"❌ Error creating fallback rankings: {e}")
        # Even if there's an error, provide basic mock rankings
        rankings = create_mock_rankings()
    
    return rankings


def create_mock_rankings():
    """Create basic mock rankings for fresh installations"""
    mock_rankings = [
        {
            'id': 'mock_ppr_standard',
            'name': 'Fantasy Pros FULL 1QB (Sample)',
            'type': 'built-in',
            'scoring': 'FULL',
            'format': '1QB',
            'source': 'Sample Data',
            'category': 'FantasyPros',
            'metadata': {
                'total_players': 200,
                'last_updated': None,
                'is_mock': True
            }
        },
        {
            'id': 'mock_half_ppr_standard',
            'name': 'Fantasy Pros HALF 1QB (Sample)',
            'type': 'built-in',
            'scoring': 'HALF',
            'format': '1QB',
            'source': 'Sample Data',
            'category': 'FantasyPros',
            'metadata': {
                'total_players': 200,
                'last_updated': None,
                'is_mock': True
            }
        },
        {
            'id': 'mock_standard_standard',
            'name': 'Fantasy Pros STD 1QB (Sample)',
            'type': 'built-in',
            'scoring': 'STD',
            'format': '1QB',
            'source': 'Sample Data',
            'category': 'FantasyPros',
            'metadata': {
                'total_players': 200,
                'last_updated': None,
                'is_mock': True
            }
        }
    ]
    
    logger.info(f"🎭 Created {len(mock_rankings)} mock rankings for fresh installation")
    return mock_rankings

# Create blueprint
rankings_bp_new = Blueprint('rankings_new', __name__)

@rankings_bp_new.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Rankings API is running',
        'services_available': SERVICES_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    })

@rankings_bp_new.route('/list', methods=['GET'])
def list_rankings():
    """Get list of all available rankings (Fantasy Pros + uploaded)"""
    try:
        logger.info("📋 Fetching available rankings...")
        
        all_rankings = []
        
        # Get Fantasy Pros rankings if provider is available
        if fantasy_pros_provider:
            try:
                fantasy_pros_rankings = fantasy_pros_provider.get_available_rankings()
                logger.info(f"📊 Found {len(fantasy_pros_rankings)} Fantasy Pros rankings")
                
                # Convert Fantasy Pros rankings to frontend-expected format
                for ranking in fantasy_pros_rankings:
                    all_rankings.append({
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
            except Exception as e:
                logger.warning(f"⚠️ Error getting Fantasy Pros rankings: {e}")
        else:
            logger.info("⚠️ Fantasy Pros provider not available")
        
        # Get uploaded rankings if available
        if simple_in_memory:
            try:
                uploaded_rankings = simple_in_memory.get_available_rankings()
                logger.info(f"📊 Found {len(uploaded_rankings)} uploaded rankings")
                
                # Convert uploaded rankings to frontend-expected format
                for ranking in uploaded_rankings:
                    all_rankings.append({
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
            except Exception as e:
                logger.warning(f"⚠️ Error getting uploaded rankings: {e}")
        else:
            logger.info("⚠️ Simple in-memory provider not available")
        
        # If no rankings are available from providers, try to create fallback rankings
        if not all_rankings:
            logger.info("🔍 No rankings found from providers, trying to load fallback rankings...")
            all_rankings = create_fallback_rankings()
        
        logger.info(f"✅ Total rankings available: {len(all_rankings)}")
        
        return jsonify({
            'status': 'success',
            'rankings': all_rankings,
            'total': len(all_rankings),
            'fantasy_pros_count': len([r for r in all_rankings if r['category'] == 'FantasyPros']),
            'uploaded_count': len([r for r in all_rankings if r['category'] == 'Custom Upload'])
        })
        
    except Exception as e:
        logger.error(f"❌ Error listing rankings: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@rankings_bp_new.route('/data/<ranking_id>', methods=['GET'])
def get_ranking_data(ranking_id):
    """Get ranking data for a specific ranking"""
    try:
        logger.info(f"📊 Fetching ranking data for: {ranking_id}")
        
        # Try Fantasy Pros provider first
        if fantasy_pros_provider:
            try:
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
            except Exception as e:
                logger.warning(f"⚠️ Error getting Fantasy Pros data: {e}")
        
        # Try uploaded rankings
        if simple_in_memory:
            try:
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
            except Exception as e:
                logger.warning(f"⚠️ Error getting uploaded data: {e}")
        
        # Fallback: try to load from CSV file directly
        logger.info(f"🔍 Trying fallback CSV loading for: {ranking_id}")
        fallback_data = load_ranking_from_csv(ranking_id)
        if fallback_data:
            return jsonify({
                'status': 'success',
                'ranking_id': ranking_id,
                'players': fallback_data['players'],
                'total_players': fallback_data['total_players'],
                'source': 'Fantasy Pros (Fallback)'
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

@rankings_bp_new.route('/refresh', methods=['POST'])
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

@rankings_bp_new.route('/upload', methods=['POST'])
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

@rankings_bp_new.route('/delete/<ranking_id>', methods=['DELETE'])
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

@rankings_bp_new.route('/stats', methods=['GET'])
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