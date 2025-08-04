"""
Simple Rankings Fallback
Minimal rankings system that works without external dependencies
"""

import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class SimpleRankingsFallback:
    """Simple fallback rankings provider that looks for existing Fantasy Pros files"""
    
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.rankings_dir = os.path.join(data_dir, 'rankings')
        os.makedirs(self.rankings_dir, exist_ok=True)
    
    def get_available_rankings(self):
        """Get list of available ranking files"""
        rankings = []
        
        # First, look for existing Fantasy Pros files in the root data directory
        fantasy_pros_files = []
        if os.path.exists(self.data_dir):
            for filename in os.listdir(self.data_dir):
                if filename.startswith('FantasyPros_Rankings_') and filename.endswith('.csv'):
                    fantasy_pros_files.append(filename)
        
        # Convert existing Fantasy Pros files to new format
        for filename in fantasy_pros_files:
            filepath = os.path.join(self.data_dir, filename)
            
            # Parse filename to get metadata
            parts = filename.replace('FantasyPros_Rankings_', '').replace('.csv', '').split('_')
            if len(parts) >= 2:
                scoring = parts[0]
                format_type = parts[1]
                
                rankings.append({
                    'id': filename.replace('.csv', ''),
                    'name': f"Fantasy Pros {scoring.upper()} {format_type.title()}",
                    'type': 'fantasy_pros',
                    'scoring': scoring,
                    'format': format_type,
                    'filepath': filepath,
                    'source': 'Fantasy Pros'
                })
        
        # Also look for CSV files in rankings subdirectory
        if os.path.exists(self.rankings_dir):
            for filename in os.listdir(self.rankings_dir):
                if filename.endswith('.csv'):
                    filepath = os.path.join(self.rankings_dir, filename)
                    
                    rankings.append({
                        'id': filename.replace('.csv', ''),
                        'name': filename.replace('.csv', '').replace('_', ' ').title(),
                        'type': 'csv_file',
                        'scoring': 'unknown',
                        'format': 'unknown',
                        'filepath': filepath,
                        'source': 'Local File'
                    })
        
        # If no files found, create a minimal sample
        if not rankings:
            self.create_minimal_sample()
            rankings = self.get_available_rankings()
        
        return rankings
    
    def create_minimal_sample(self):
        """Create a minimal sample ranking file"""
        try:
            sample_csv = """Name,Position,Team,Overall Rank,Position Rank
Christian McCaffrey,RB,SF,1,1
Josh Allen,QB,BUF,2,1
Tyreek Hill,WR,MIA,3,1
Travis Kelce,TE,KC,4,1
Austin Ekeler,RB,LAC,5,2
Stefon Diggs,WR,BUF,6,2
Derrick Henry,RB,TEN,7,3
Cooper Kupp,WR,LAR,8,3
Davante Adams,WR,LV,9,4
Nick Chubb,RB,CLE,10,4"""
            
            filepath = os.path.join(self.rankings_dir, 'sample_rankings.csv')
            with open(filepath, 'w') as f:
                f.write(sample_csv)
            
            logger.info("✅ Created minimal sample rankings")
            
        except Exception as e:
            logger.error(f"❌ Error creating sample rankings: {e}")

class SimpleInMemoryRankings:
    """Simple in-memory rankings manager"""
    
    def __init__(self):
        self.rankings_cache = {}
    
    def upload_ranking(self, file_content, filename, metadata=None):
        """Process uploaded ranking file"""
        try:
            import csv
            import io
            import uuid
            
            # Generate unique ID
            ranking_id = f"upload_{uuid.uuid4().hex[:8]}"
            
            # Parse CSV
            content_str = file_content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(content_str))
            
            players = []
            for row in csv_reader:
                # Simple normalization
                player = {}
                for key, value in row.items():
                    key_lower = key.lower().strip()
                    if 'name' in key_lower or 'player' in key_lower:
                        player['name'] = value.strip()
                    elif 'position' in key_lower or 'pos' in key_lower:
                        player['position'] = value.strip().upper()
                    elif 'team' in key_lower:
                        player['team'] = value.strip().upper()
                    elif 'rank' in key_lower:
                        try:
                            player['overall_rank'] = int(float(value))
                        except:
                            player['overall_rank'] = 999
                    else:
                        player[key] = value
                
                if 'name' in player and 'position' in player:
                    players.append(player)
            
            # Store ranking
            ranking_data = {
                'id': ranking_id,
                'name': metadata.get('name', filename) if metadata else filename,
                'players': players,
                'total_players': len(players),
                'type': 'custom',
                'source': 'User Upload',
                'upload_time': datetime.now().isoformat()
            }
            
            self.rankings_cache[ranking_id] = ranking_data
            
            return {
                'id': ranking_id,
                'name': ranking_data['name'],
                'total_players': len(players),
                'type': 'custom'
            }
            
        except Exception as e:
            logger.error(f"❌ Error processing upload: {e}")
            raise ValueError(f"Failed to process ranking file: {str(e)}")
    
    def get_ranking_data(self, ranking_id):
        """Get ranking data by ID"""
        return self.rankings_cache.get(ranking_id)
    
    def get_available_rankings(self):
        """Get list of uploaded rankings"""
        return [
            {
                'id': data['id'],
                'name': data['name'],
                'type': data['type'],
                'source': data['source'],
                'total_players': data['total_players'],
                'upload_time': data['upload_time']
            }
            for data in self.rankings_cache.values()
        ]
    
    def delete_ranking(self, ranking_id):
        """Delete a ranking"""
        if ranking_id in self.rankings_cache:
            del self.rankings_cache[ranking_id]
            return True
        return False
    
    def get_ranking_stats(self):
        """Get statistics"""
        return {
            'total_rankings': len(self.rankings_cache),
            'total_players': sum(data['total_players'] for data in self.rankings_cache.values()),
            'memory_usage_mb': 0.1  # Rough estimate
        }

# Global instances
simple_fantasy_pros = None
simple_in_memory = SimpleInMemoryRankings()

def initialize_simple_rankings(data_dir):
    """Initialize simple rankings system"""
    global simple_fantasy_pros
    try:
        simple_fantasy_pros = SimpleRankingsFallback(data_dir)
        logger.info("✅ Simple rankings fallback initialized")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize simple rankings: {e}")
        return False
