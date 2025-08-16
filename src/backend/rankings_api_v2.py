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

def find_column_match(headers, target_names):
    """Find the best matching column name from a list of possible names"""
    headers_lower = [h.lower().strip() for h in headers]
    
    for target in target_names:
        target_lower = target.lower().strip()
        
        # Exact match first
        if target_lower in headers_lower:
            return headers[headers_lower.index(target_lower)]
        
        # Partial match
        for header in headers:
            if target_lower in header.lower() or header.lower() in target_lower:
                return header
    
    return None

def get_data_directory():
    """Get data directory path for both development and PyInstaller builds"""
    import sys
    if hasattr(sys, '_MEIPASS'):
        # PyInstaller executable
        return os.path.join(sys._MEIPASS, 'data')
    else:
        # Development mode
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        return os.path.join(current_dir, 'data')

def load_ranking_from_csv(ranking_id):
    """Load ranking data directly from CSV file as fallback or generate mock data"""
    try:
        # Check if this is a mock ranking
        if ranking_id.startswith('mock_'):
            logger.info(f"🎭 Generating mock data for: {ranking_id}")
            return generate_mock_player_data(ranking_id)
        
        # Get the data directory path
        data_dir = get_data_directory()
        
        # Construct the CSV filename
        csv_filename = f"{ranking_id}.csv"
        csv_filepath = os.path.join(data_dir, csv_filename)
        
        if not os.path.exists(csv_filepath):
            logger.warning(f"⚠️ CSV file not found: {csv_filepath}")
            return None
        
        players = []
        with open(csv_filepath, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            headers = reader.fieldnames
            
            # Define column mappings with multiple possible names
            column_mappings = {
                'name': ['Name', 'Player', 'Player Name', 'Full Name'],
                'position': ['Position', 'Pos', 'Fantasy Position', 'POS'],
                'team': ['Team', 'TM', 'NFL Team'],
                'rank': ['Rank', 'Overall Rank', 'Overall', 'Rk'],
                'position_rank': ['Position Rank', 'Pos Rank', 'POS RK'],
                'bye_week': ['Bye', 'Bye Week', 'BYE'],
                'tier': ['Tier', 'TIR'],
                'value': ['Value', '3D Value', 'Proj Value', 'Fantasy Value', 'Val']
            }
            
            # Find actual column names
            actual_columns = {}
            for field, possible_names in column_mappings.items():
                match = find_column_match(headers, possible_names)
                if match:
                    actual_columns[field] = match
                    logger.info(f"📊 Mapped '{field}' to column '{match}'")
                else:
                    logger.warning(f"⚠️ No match found for '{field}' in columns: {headers}")
            
            for row in reader:
                # Map CSV columns to our player format using found mappings
                player = {
                    'name': row.get(actual_columns.get('name', ''), ''),
                    'full_name': row.get(actual_columns.get('name', ''), ''),
                    'position': row.get(actual_columns.get('position', ''), ''),
                    'team': row.get(actual_columns.get('team', ''), ''),
                    'rank': int(row.get(actual_columns.get('rank', ''), 999)) if row.get(actual_columns.get('rank', '')) else 999,
                    'overall_rank': int(row.get(actual_columns.get('rank', ''), 999)) if row.get(actual_columns.get('rank', '')) else 999,
                    'position_rank': int(row.get(actual_columns.get('position_rank', ''), 999)) if row.get(actual_columns.get('position_rank', '')) else 999,
                    'bye_week': int(row.get(actual_columns.get('bye_week', ''), 0)) if row.get(actual_columns.get('bye_week', '')) else 0,
                    'tier': int(row.get(actual_columns.get('tier', ''), 1)) if row.get(actual_columns.get('tier', '')) else 1,
                    'value': float(row.get(actual_columns.get('value', ''), 0)) if row.get(actual_columns.get('value', '')) else 0
                }
                
                # If no value column found, use inverted rank as value (higher rank = lower value)
                if not actual_columns.get('value') and player['rank'] < 999:
                    player['value'] = max(0, 300 - player['rank'])  # Top player gets ~300, rank 300 gets 0
                
                # Debug first 3 players
                if len(players) < 3:
                    logger.info(f"📊 Player {player['name']}: Value column = '{row.get('Value')}', parsed value = {player['value']}")
                
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
        # Use current Fantasy Pros half PPR data
        mock_players = [
            {'name': 'Saquon Barkley', 'full_name': 'Saquon Barkley', 'position': 'RB', 'team': 'PHI', 'rank': 1, 'overall_rank': 1, 'position_rank': 1, 'bye_week': 9, 'tier': 2},
            {'name': 'Ja\'Marr Chase', 'full_name': 'Ja\'Marr Chase', 'position': 'WR', 'team': 'CIN', 'rank': 2, 'overall_rank': 2, 'position_rank': 1, 'bye_week': 10, 'tier': 2},
            {'name': 'Bijan Robinson', 'full_name': 'Bijan Robinson', 'position': 'RB', 'team': 'ATL', 'rank': 3, 'overall_rank': 3, 'position_rank': 2, 'bye_week': 5, 'tier': 2},
            {'name': 'Justin Jefferson', 'full_name': 'Justin Jefferson', 'position': 'WR', 'team': 'MIN', 'rank': 4, 'overall_rank': 4, 'position_rank': 2, 'bye_week': 6, 'tier': 3},
            {'name': 'CeeDee Lamb', 'full_name': 'CeeDee Lamb', 'position': 'WR', 'team': 'DAL', 'rank': 5, 'overall_rank': 5, 'position_rank': 3, 'bye_week': 10, 'tier': 3},
            {'name': 'Jahmyr Gibbs', 'full_name': 'Jahmyr Gibbs', 'position': 'RB', 'team': 'DET', 'rank': 6, 'overall_rank': 6, 'position_rank': 3, 'bye_week': 8, 'tier': 3},
            {'name': 'Puka Nacua', 'full_name': 'Puka Nacua', 'position': 'WR', 'team': 'LAR', 'rank': 7, 'overall_rank': 7, 'position_rank': 4, 'bye_week': 8, 'tier': 3},
            {'name': 'Derrick Henry', 'full_name': 'Derrick Henry', 'position': 'RB', 'team': 'BAL', 'rank': 8, 'overall_rank': 8, 'position_rank': 4, 'bye_week': 7, 'tier': 3},
            {'name': 'Nico Collins', 'full_name': 'Nico Collins', 'position': 'WR', 'team': 'HOU', 'rank': 9, 'overall_rank': 9, 'position_rank': 5, 'bye_week': 6, 'tier': 4},
            {'name': 'Malik Nabers', 'full_name': 'Malik Nabers', 'position': 'WR', 'team': 'NYG', 'rank': 10, 'overall_rank': 10, 'position_rank': 6, 'bye_week': 14, 'tier': 4},
            {'name': 'Brian Thomas Jr.', 'full_name': 'Brian Thomas Jr.', 'position': 'WR', 'team': 'JAC', 'rank': 11, 'overall_rank': 11, 'position_rank': 7, 'bye_week': 8, 'tier': 4},
            {'name': 'Ashton Jeanty', 'full_name': 'Ashton Jeanty', 'position': 'RB', 'team': 'LV', 'rank': 12, 'overall_rank': 12, 'position_rank': 5, 'bye_week': 8, 'tier': 4},
            {'name': 'Amon-Ra St. Brown', 'full_name': 'Amon-Ra St. Brown', 'position': 'WR', 'team': 'DET', 'rank': 13, 'overall_rank': 13, 'position_rank': 8, 'bye_week': 8, 'tier': 4},
            {'name': 'Christian McCaffrey', 'full_name': 'Christian McCaffrey', 'position': 'RB', 'team': 'SF', 'rank': 14, 'overall_rank': 14, 'position_rank': 6, 'bye_week': 14, 'tier': 4},
            {'name': 'Jonathan Taylor', 'full_name': 'Jonathan Taylor', 'position': 'RB', 'team': 'IND', 'rank': 15, 'overall_rank': 15, 'position_rank': 7, 'bye_week': 11, 'tier': 4},
            {'name': 'A.J. Brown', 'full_name': 'A.J. Brown', 'position': 'WR', 'team': 'PHI', 'rank': 16, 'overall_rank': 16, 'position_rank': 9, 'bye_week': 9, 'tier': 5},
            {'name': 'De\'Von Achane', 'full_name': 'De\'Von Achane', 'position': 'RB', 'team': 'MIA', 'rank': 17, 'overall_rank': 17, 'position_rank': 8, 'bye_week': 12, 'tier': 5},
            {'name': 'Josh Jacobs', 'full_name': 'Josh Jacobs', 'position': 'RB', 'team': 'GB', 'rank': 18, 'overall_rank': 18, 'position_rank': 9, 'bye_week': 5, 'tier': 5},
            {'name': 'George Kittle', 'full_name': 'George Kittle', 'position': 'TE', 'team': 'SF', 'rank': 19, 'overall_rank': 19, 'position_rank': 1, 'bye_week': 14, 'tier': 5},
            {'name': 'Drake London', 'full_name': 'Drake London', 'position': 'WR', 'team': 'ATL', 'rank': 20, 'overall_rank': 20, 'position_rank': 10, 'bye_week': 5, 'tier': 5},
            {'name': 'Brock Bowers', 'full_name': 'Brock Bowers', 'position': 'TE', 'team': 'LV', 'rank': 21, 'overall_rank': 21, 'position_rank': 2, 'bye_week': 8, 'tier': 5},
            {'name': 'Ladd McConkey', 'full_name': 'Ladd McConkey', 'position': 'WR', 'team': 'LAC', 'rank': 22, 'overall_rank': 22, 'position_rank': 11, 'bye_week': 12, 'tier': 5},
            {'name': 'Bucky Irving', 'full_name': 'Bucky Irving', 'position': 'RB', 'team': 'TB', 'rank': 23, 'overall_rank': 23, 'position_rank': 10, 'bye_week': 9, 'tier': 5},
            {'name': 'Kyren Williams', 'full_name': 'Kyren Williams', 'position': 'RB', 'team': 'LAR', 'rank': 24, 'overall_rank': 24, 'position_rank': 11, 'bye_week': 8, 'tier': 5},
            {'name': 'Tee Higgins', 'full_name': 'Tee Higgins', 'position': 'WR', 'team': 'CIN', 'rank': 25, 'overall_rank': 25, 'position_rank': 12, 'bye_week': 10, 'tier': 6},
            {'name': 'Mike Evans', 'full_name': 'Mike Evans', 'position': 'WR', 'team': 'TB', 'rank': 26, 'overall_rank': 26, 'position_rank': 13, 'bye_week': 9, 'tier': 6},
            {'name': 'Chase Brown', 'full_name': 'Chase Brown', 'position': 'RB', 'team': 'CIN', 'rank': 27, 'overall_rank': 27, 'position_rank': 12, 'bye_week': 10, 'tier': 6},
            {'name': 'James Cook', 'full_name': 'James Cook', 'position': 'RB', 'team': 'BUF', 'rank': 28, 'overall_rank': 28, 'position_rank': 13, 'bye_week': 7, 'tier': 6},
            {'name': 'Tyreek Hill', 'full_name': 'Tyreek Hill', 'position': 'WR', 'team': 'MIA', 'rank': 29, 'overall_rank': 29, 'position_rank': 14, 'bye_week': 12, 'tier': 6},
            {'name': 'Davante Adams', 'full_name': 'Davante Adams', 'position': 'WR', 'team': 'LAR', 'rank': 30, 'overall_rank': 30, 'position_rank': 15, 'bye_week': 8, 'tier': 6},
            {'name': 'Trey McBride', 'full_name': 'Trey McBride', 'position': 'TE', 'team': 'ARI', 'rank': 31, 'overall_rank': 31, 'position_rank': 3, 'bye_week': 8, 'tier': 6},
            {'name': 'Josh Allen', 'full_name': 'Josh Allen', 'position': 'QB', 'team': 'BUF', 'rank': 32, 'overall_rank': 32, 'position_rank': 1, 'bye_week': 7, 'tier': 1},
            {'name': 'Lamar Jackson', 'full_name': 'Lamar Jackson', 'position': 'QB', 'team': 'BAL', 'rank': 33, 'overall_rank': 33, 'position_rank': 2, 'bye_week': 7, 'tier': 1},
            {'name': 'Jaxon Smith-Njigba', 'full_name': 'Jaxon Smith-Njigba', 'position': 'WR', 'team': 'SEA', 'rank': 34, 'overall_rank': 34, 'position_rank': 16, 'bye_week': 8, 'tier': 6},
            {'name': 'Jayden Daniels', 'full_name': 'Jayden Daniels', 'position': 'QB', 'team': 'WAS', 'rank': 35, 'overall_rank': 35, 'position_rank': 3, 'bye_week': 12, 'tier': 1},
            {'name': 'Terry McLaurin', 'full_name': 'Terry McLaurin', 'position': 'WR', 'team': 'WAS', 'rank': 36, 'overall_rank': 36, 'position_rank': 17, 'bye_week': 12, 'tier': 6},
            {'name': 'Breece Hall', 'full_name': 'Breece Hall', 'position': 'RB', 'team': 'NYJ', 'rank': 37, 'overall_rank': 37, 'position_rank': 14, 'bye_week': 9, 'tier': 6},
            {'name': 'Jalen Hurts', 'full_name': 'Jalen Hurts', 'position': 'QB', 'team': 'PHI', 'rank': 38, 'overall_rank': 38, 'position_rank': 4, 'bye_week': 9, 'tier': 1},
            {'name': 'Garrett Wilson', 'full_name': 'Garrett Wilson', 'position': 'WR', 'team': 'NYJ', 'rank': 39, 'overall_rank': 39, 'position_rank': 18, 'bye_week': 9, 'tier': 6},
            {'name': 'Joe Burrow', 'full_name': 'Joe Burrow', 'position': 'QB', 'team': 'CIN', 'rank': 40, 'overall_rank': 40, 'position_rank': 5, 'bye_week': 10, 'tier': 1}
        ]
        
        # Extend with more realistic players to reach 200
        additional_players = [
            {'name': 'Patrick Mahomes II', 'position': 'QB', 'team': 'KC', 'bye_week': 10, 'tier': 2},
            {'name': 'Marvin Harrison Jr.', 'position': 'WR', 'team': 'ARI', 'bye_week': 8, 'tier': 6},
            {'name': 'Kenneth Walker III', 'position': 'RB', 'team': 'SEA', 'bye_week': 8, 'tier': 6},
            {'name': 'Chuba Hubbard', 'position': 'RB', 'team': 'CAR', 'bye_week': 14, 'tier': 7},
            {'name': 'Baker Mayfield', 'position': 'QB', 'team': 'TB', 'bye_week': 9, 'tier': 2},
            {'name': 'Bo Nix', 'position': 'QB', 'team': 'DEN', 'bye_week': 12, 'tier': 3},
            {'name': 'DK Metcalf', 'position': 'WR', 'team': 'PIT', 'bye_week': 5, 'tier': 7},
            {'name': 'James Conner', 'position': 'RB', 'team': 'ARI', 'bye_week': 8, 'tier': 7},
            {'name': 'Alvin Kamara', 'position': 'RB', 'team': 'NO', 'bye_week': 11, 'tier': 7}
        ]
        
        # Add additional players with calculated ranks
        for i, player in enumerate(additional_players, start=41):
            player.update({
                'full_name': player['name'],
                'rank': i,
                'overall_rank': i,
                'position_rank': (i // 4) + 1
            })
            mock_players.append(player)
        
        # Fill remaining slots to 200
        for i in range(50, 201):
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
        
        logger.info(f"🎭 Generated {len(mock_players)} mock players with current Fantasy Pros data")
        
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
        data_dir = get_data_directory()
        
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
        }
    ]
    
    logger.info(f"🎭 Created {len(mock_rankings)} mock ranking for fresh installation")
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