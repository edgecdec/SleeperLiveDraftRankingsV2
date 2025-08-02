#!/usr/bin/env python3
"""
Simple Flask server to test tier data from RankingsManager
"""

from flask import Flask, jsonify
from flask_cors import CORS
import sys
import os

# Add path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from RankingsManager import RankingsManager

app = Flask(__name__)
CORS(app)

# Global manager instance
rankings_manager = RankingsManager()

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Simple Flask test server for tier data'
    })

@app.route('/api/rankings')
def get_rankings():
    """Get rankings with tier data"""
    try:
        # Get rankings
        df = rankings_manager.get_rankings('half_ppr', 'superflex', force_update=False)
        
        if df is None:
            return jsonify({
                'success': False,
                'error': 'Failed to load rankings'
            }), 500
        
        # Convert to JSON format
        rankings = []
        for _, row in df.iterrows():
            rankings.append({
                'overall_rank': int(row['Overall Rank']) if 'Overall Rank' in df.columns else 0,
                'name': str(row['Name']) if 'Name' in df.columns else '',
                'position': str(row['Position']) if 'Position' in df.columns else '',
                'team': str(row['Team']) if 'Team' in df.columns else '',
                'bye': str(row['Bye']) if 'Bye' in df.columns else '',
                'position_rank': int(row['Position Rank']) if 'Position Rank' in df.columns else 0,
                'tier': int(row['Tier']) if 'Tier' in df.columns else 1
            })
        
        return jsonify({
            'success': True,
            'rankings': rankings,
            'total_players': len(rankings),
            'scoring_format': 'half_ppr',
            'league_type': 'superflex'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/custom-rankings')
def get_custom_rankings():
    """Get custom rankings list"""
    try:
        custom_rankings = rankings_manager.get_custom_rankings_list()
        return jsonify({
            'success': True,
            'custom_rankings': custom_rankings
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Simple Flask Test Server...")
    print("📊 Testing tier data from RankingsManager")
    print("🌐 Server will run on http://localhost:5000")
    print("📋 Available endpoints:")
    print("  • GET /api/health - Health check")
    print("  • GET /api/rankings - Get rankings with tier data")
    print("  • GET /api/custom-rankings - Get custom rankings")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
