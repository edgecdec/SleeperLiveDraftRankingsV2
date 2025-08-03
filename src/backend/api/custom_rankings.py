"""
Custom Rankings API for Fantasy Football Draft Assistant V2

This module provides API endpoints for uploading and managing custom rankings files.
Part of Sprint 4: User Experience implementation.
"""

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os

from ..services.custom_rankings_manager import CustomRankingsManager

# Create blueprint
custom_rankings_bp = Blueprint('custom_rankings', __name__)

# Initialize custom rankings manager
custom_rankings_manager = CustomRankingsManager()


@custom_rankings_bp.route('/custom-rankings/upload', methods=['POST'])
def upload_rankings():
    """
    Upload a custom rankings CSV file
    
    Form Data:
        file: CSV file upload
        format: Format type ('auto', 'standard', 'fantasypros', 'espn')
        user_id: User identifier (optional, defaults to 'default')
    
    Returns:
        JSON response with upload results
    """
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'error': 'No file uploaded',
                'code': 'NO_FILE'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'error': 'No file selected',
                'code': 'NO_FILE_SELECTED'
            }), 400
        
        # Validate file type
        if not file.filename.lower().endswith('.csv'):
            return jsonify({
                'error': 'Only CSV files are supported',
                'code': 'INVALID_FILE_TYPE'
            }), 400
        
        # Get parameters
        format_type = request.form.get('format', 'auto')
        user_id = request.form.get('user_id', 'default')
        
        # Read file content
        try:
            file_content = file.read().decode('utf-8')
        except UnicodeDecodeError:
            return jsonify({
                'error': 'File encoding not supported. Please use UTF-8 encoded CSV files.',
                'code': 'ENCODING_ERROR'
            }), 400
        
        # Secure filename
        filename = secure_filename(file.filename)
        
        # Process upload
        result = custom_rankings_manager.upload_rankings_file(
            file_content, filename, format_type, user_id
        )
        
        if result['status'] == 'error':
            return jsonify(result), 400
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': f'Upload failed: {str(e)}',
            'code': 'UPLOAD_ERROR'
        }), 500


@custom_rankings_bp.route('/custom-rankings/list')
def list_user_rankings():
    """
    List all custom rankings files for a user
    
    Query Parameters:
        user_id: User identifier (optional, defaults to 'default')
    
    Returns:
        JSON response with list of rankings files
    """
    try:
        user_id = request.args.get('user_id', 'default')
        
        rankings_list = custom_rankings_manager.get_user_rankings(user_id)
        
        return jsonify({
            'user_id': user_id,
            'rankings': rankings_list,
            'total_files': len(rankings_list),
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to list rankings: {str(e)}',
            'code': 'LIST_ERROR'
        }), 500


@custom_rankings_bp.route('/custom-rankings/<file_id>')
def get_rankings_data(file_id):
    """
    Get data for a specific rankings file
    
    Args:
        file_id: Rankings file ID
    
    Query Parameters:
        user_id: User identifier (optional, defaults to 'default')
        include_players: Include full player data (optional, defaults to false)
    
    Returns:
        JSON response with rankings data
    """
    try:
        user_id = request.args.get('user_id', 'default')
        include_players = request.args.get('include_players', 'false').lower() == 'true'
        
        rankings_data = custom_rankings_manager.get_rankings_data(file_id, user_id)
        
        if not rankings_data:
            return jsonify({
                'error': f'Rankings file "{file_id}" not found',
                'code': 'FILE_NOT_FOUND'
            }), 404
        
        # Optionally exclude player data for lighter response
        if not include_players:
            response_data = {k: v for k, v in rankings_data.items() if k != 'players'}
            response_data['player_count'] = len(rankings_data.get('players', []))
        else:
            response_data = rankings_data
        
        return jsonify({
            'file_id': file_id,
            'data': response_data,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to get rankings data: {str(e)}',
            'code': 'GET_ERROR'
        }), 500


@custom_rankings_bp.route('/custom-rankings/<file_id>', methods=['DELETE'])
def delete_rankings(file_id):
    """
    Delete a custom rankings file
    
    Args:
        file_id: Rankings file ID
    
    Query Parameters:
        user_id: User identifier (optional, defaults to 'default')
    
    Returns:
        JSON response with deletion status
    """
    try:
        user_id = request.args.get('user_id', 'default')
        
        success = custom_rankings_manager.delete_rankings(file_id, user_id)
        
        if success:
            return jsonify({
                'message': f'Rankings file "{file_id}" deleted successfully',
                'status': 'success'
            })
        else:
            return jsonify({
                'error': f'Failed to delete rankings file "{file_id}"',
                'code': 'DELETE_ERROR'
            }), 500
        
    except Exception as e:
        return jsonify({
            'error': f'Delete operation failed: {str(e)}',
            'code': 'DELETE_ERROR'
        }), 500


@custom_rankings_bp.route('/custom-rankings/formats')
def get_supported_formats():
    """
    Get information about supported CSV formats
    
    Returns:
        JSON response with format specifications and examples
    """
    try:
        formats_info = custom_rankings_manager.get_supported_formats()
        
        return jsonify({
            'supported_formats': formats_info,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to get format information: {str(e)}',
            'code': 'FORMAT_ERROR'
        }), 500


@custom_rankings_bp.route('/custom-rankings/validate', methods=['POST'])
def validate_rankings_file():
    """
    Validate a rankings CSV file without uploading it
    
    Form Data:
        file: CSV file upload
        format: Format type ('auto', 'standard', 'fantasypros', 'espn')
    
    Returns:
        JSON response with validation results
    """
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'error': 'No file uploaded',
                'code': 'NO_FILE'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'error': 'No file selected',
                'code': 'NO_FILE_SELECTED'
            }), 400
        
        # Get format parameter
        format_type = request.form.get('format', 'auto')
        
        # Read file content
        try:
            file_content = file.read().decode('utf-8')
        except UnicodeDecodeError:
            return jsonify({
                'error': 'File encoding not supported. Please use UTF-8 encoded CSV files.',
                'code': 'ENCODING_ERROR'
            }), 400
        
        # Parse and validate without saving
        parsed_data = custom_rankings_manager._parse_csv_content(file_content, format_type)
        
        if 'error' in parsed_data:
            return jsonify({
                'valid': False,
                'error': parsed_data['error'],
                'code': 'VALIDATION_ERROR'
            }), 400
        
        # Process player data for validation
        processed_players = custom_rankings_manager._process_player_data(parsed_data['players'])
        
        if 'error' in processed_players:
            return jsonify({
                'valid': False,
                'error': processed_players['error'],
                'errors': processed_players.get('errors', []),
                'code': 'PLAYER_DATA_ERROR'
            }), 400
        
        return jsonify({
            'valid': True,
            'preview': {
                'detected_format': parsed_data['detected_format'],
                'total_columns': len(parsed_data['columns']),
                'columns': parsed_data['columns'],
                'total_rows': parsed_data['total_rows'],
                'total_players': processed_players['total_processed'],
                'position_counts': processed_players['position_counts'],
                'sample_players': processed_players['players'][:5],  # First 5 players
                'errors': processed_players.get('errors', [])
            },
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': f'Validation failed: {str(e)}',
            'code': 'VALIDATION_ERROR'
        }), 500
