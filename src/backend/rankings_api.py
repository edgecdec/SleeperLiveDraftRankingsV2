"""
Rankings API for Fantasy Football Draft Assistant V2
Handles CSV ranking files, file uploads, and ranking data serving
"""

import os
import csv
import json
import logging
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename
import pandas as pd

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
rankings_bp = Blueprint('rankings', __name__)

# Configuration
RANKINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
CUSTOM_RANKINGS_DIR = os.path.join(RANKINGS_DIR, 'Custom')
ALLOWED_EXTENSIONS = {'csv'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_ranking_metadata(filepath):
    """Extract metadata from ranking file"""
    try:
        # Read first few rows to get structure
        df = pd.read_csv(filepath, nrows=5)
        
        # Count total players
        total_df = pd.read_csv(filepath)
        total_players = len(total_df)
        
        # Get positions
        if 'Position' in df.columns:
            positions = total_df['Position'].unique().tolist()
        else:
            positions = []
        
        # Get file stats
        file_stats = os.stat(filepath)
        
        return {
            'total_players': total_players,
            'positions': positions,
            'columns': df.columns.tolist(),
            'file_size': file_stats.st_size,
            'modified_date': datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
            'sample_data': df.head(3).to_dict('records')
        }
    except Exception as e:
        logger.error(f"Error reading ranking metadata for {filepath}: {e}")
        return {
            'total_players': 0,
            'positions': [],
            'columns': [],
            'file_size': 0,
            'modified_date': None,
            'sample_data': [],
            'error': str(e)
        }

@rankings_bp.route('/api/rankings/list', methods=['GET'])
def list_rankings():
    """List all available ranking files"""
    try:
        rankings = []
        
        # Get built-in rankings from data directory
        if os.path.exists(RANKINGS_DIR):
            for filename in os.listdir(RANKINGS_DIR):
                if filename.endswith('.csv') and not filename.startswith('.'):
                    filepath = os.path.join(RANKINGS_DIR, filename)
                    
                    # Parse filename for metadata
                    name_parts = filename.replace('.csv', '').split('_')
                    
                    ranking_info = {
                        'id': filename.replace('.csv', ''),
                        'name': filename.replace('.csv', '').replace('_', ' '),
                        'filename': filename,
                        'type': 'built-in',
                        'category': 'FantasyPros' if 'FantasyPros' in filename else 'Other',
                        'scoring': 'Unknown',
                        'format': 'Unknown'
                    }
                    
                    # Extract scoring and format from filename
                    if 'ppr' in filename.lower():
                        ranking_info['scoring'] = 'PPR'
                    elif 'half_ppr' in filename.lower():
                        ranking_info['scoring'] = 'Half PPR'
                    elif 'standard' in filename.lower():
                        ranking_info['scoring'] = 'Standard'
                    
                    if 'superflex' in filename.lower():
                        ranking_info['format'] = 'Superflex'
                    else:
                        ranking_info['format'] = 'Standard'
                    
                    # Get detailed metadata
                    ranking_info['metadata'] = get_ranking_metadata(filepath)
                    
                    rankings.append(ranking_info)
        
        # Get custom rankings from Custom directory
        if os.path.exists(CUSTOM_RANKINGS_DIR):
            for filename in os.listdir(CUSTOM_RANKINGS_DIR):
                if filename.endswith('.csv') and not filename.startswith('.'):
                    filepath = os.path.join(CUSTOM_RANKINGS_DIR, filename)
                    
                    ranking_info = {
                        'id': f"custom_{filename.replace('.csv', '')}",
                        'name': filename.replace('.csv', '').replace('_', ' '),
                        'filename': filename,
                        'type': 'custom',
                        'category': 'Custom Upload',
                        'scoring': 'Custom',
                        'format': 'Custom'
                    }
                    
                    # Get detailed metadata
                    ranking_info['metadata'] = get_ranking_metadata(filepath)
                    
                    rankings.append(ranking_info)
        
        # Sort rankings by type and name
        rankings.sort(key=lambda x: (x['type'], x['name']))
        
        logger.info(f"Found {len(rankings)} ranking files")
        
        return jsonify({
            'status': 'success',
            'rankings': rankings,
            'total_count': len(rankings)
        })
        
    except Exception as e:
        logger.error(f"Error listing rankings: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to list rankings: {str(e)}'
        }), 500

@rankings_bp.route('/api/rankings/data/<ranking_id>', methods=['GET'])
def get_ranking_data(ranking_id):
    """Get ranking data for a specific ranking file"""
    try:
        # Determine file path based on ranking ID
        if ranking_id.startswith('custom_'):
            filename = ranking_id.replace('custom_', '') + '.csv'
            filepath = os.path.join(CUSTOM_RANKINGS_DIR, filename)
        else:
            filename = ranking_id + '.csv'
            filepath = os.path.join(RANKINGS_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'status': 'error',
                'message': f'Ranking file not found: {ranking_id}'
            }), 404
        
        # Read CSV data
        df = pd.read_csv(filepath)
        
        # Convert to list of dictionaries
        players = df.to_dict('records')
        
        # Add some processing for common column names
        processed_players = []
        for player in players:
            processed_player = {}
            
            # Standardize column names
            for key, value in player.items():
                # Convert common column names to standard format
                if key.lower() in ['overall rank', 'overall_rank', 'rank']:
                    processed_player['overall_rank'] = value
                elif key.lower() in ['name', 'player_name', 'player']:
                    processed_player['name'] = value
                elif key.lower() in ['position', 'pos']:
                    processed_player['position'] = value
                elif key.lower() in ['team']:
                    processed_player['team'] = value
                elif key.lower() in ['position rank', 'position_rank', 'pos_rank']:
                    processed_player['position_rank'] = value
                elif key.lower() in ['tier']:
                    processed_player['tier'] = value
                elif key.lower() in ['bye', 'bye_week']:
                    processed_player['bye_week'] = value
                else:
                    # Keep original column name for any other fields
                    processed_player[key.lower().replace(' ', '_')] = value
            
            processed_players.append(processed_player)
        
        logger.info(f"Loaded {len(processed_players)} players from {ranking_id}")
        
        return jsonify({
            'status': 'success',
            'ranking_id': ranking_id,
            'players': processed_players,
            'total_players': len(processed_players),
            'columns': list(df.columns)
        })
        
    except Exception as e:
        logger.error(f"Error loading ranking data for {ranking_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to load ranking data: {str(e)}'
        }), 500

@rankings_bp.route('/api/rankings/upload', methods=['POST'])
def upload_ranking():
    """Upload a custom ranking CSV file"""
    try:
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
                'message': 'Only CSV files are allowed'
            }), 400
        
        # Get optional metadata from form
        ranking_name = request.form.get('name', '')
        scoring_type = request.form.get('scoring', 'custom')
        format_type = request.form.get('format', 'custom')
        
        # Create secure filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        original_name = secure_filename(file.filename).replace('.csv', '')
        
        if ranking_name:
            safe_name = secure_filename(ranking_name)
            filename = f"custom_{safe_name}_{timestamp}.csv"
        else:
            filename = f"custom_{original_name}_{timestamp}.csv"
        
        # Ensure Custom directory exists
        os.makedirs(CUSTOM_RANKINGS_DIR, exist_ok=True)
        
        # Save file
        filepath = os.path.join(CUSTOM_RANKINGS_DIR, filename)
        file.save(filepath)
        
        # Validate CSV structure
        try:
            df = pd.read_csv(filepath)
            if len(df) == 0:
                os.remove(filepath)
                return jsonify({
                    'status': 'error',
                    'message': 'CSV file is empty'
                }), 400
            
            # Check for required columns (at least name and position)
            required_cols = ['name', 'position']
            available_cols = [col.lower() for col in df.columns]
            
            missing_cols = []
            for req_col in required_cols:
                if not any(req_col in col.lower() for col in available_cols):
                    missing_cols.append(req_col)
            
            if missing_cols:
                os.remove(filepath)
                return jsonify({
                    'status': 'error',
                    'message': f'CSV must contain columns for: {", ".join(missing_cols)}'
                }), 400
                
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({
                'status': 'error',
                'message': f'Invalid CSV format: {str(e)}'
            }), 400
        
        # Get metadata for response
        metadata = get_ranking_metadata(filepath)
        
        logger.info(f"Successfully uploaded custom ranking: {filename}")
        
        return jsonify({
            'status': 'success',
            'message': 'Ranking file uploaded successfully',
            'ranking': {
                'id': f"custom_{filename.replace('.csv', '')}",
                'name': ranking_name or original_name,
                'filename': filename,
                'type': 'custom',
                'scoring': scoring_type,
                'format': format_type,
                'metadata': metadata
            }
        })
        
    except Exception as e:
        logger.error(f"Error uploading ranking file: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to upload file: {str(e)}'
        }), 500

@rankings_bp.route('/api/rankings/delete/<ranking_id>', methods=['DELETE'])
def delete_ranking(ranking_id):
    """Delete a custom ranking file"""
    try:
        # Only allow deletion of custom rankings
        if not ranking_id.startswith('custom_'):
            return jsonify({
                'status': 'error',
                'message': 'Only custom rankings can be deleted'
            }), 400
        
        filename = ranking_id.replace('custom_', '') + '.csv'
        filepath = os.path.join(CUSTOM_RANKINGS_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'status': 'error',
                'message': 'Ranking file not found'
            }), 404
        
        os.remove(filepath)
        
        logger.info(f"Deleted custom ranking: {filename}")
        
        return jsonify({
            'status': 'success',
            'message': 'Ranking file deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"Error deleting ranking file {ranking_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to delete file: {str(e)}'
        }), 500
