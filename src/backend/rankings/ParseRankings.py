import pandas as pd
from Rankings.Constants import *
from Rankings.RankingsUtil import *
from Rankings.PlayerRankings import Player

def parseCSV(fileName):
    tempDataFrame = pd.read_csv(f'{fileName}')
    rankingsDict = tempDataFrame.to_dict(orient='records')
    
    # Get column names and create flexible mapping
    columns = tempDataFrame.columns.tolist()
    column_map = {}
    
    print(f"📊 CSV columns found: {columns}")  # Debug logging
    
    # Map common column name variations
    for col in columns:
        col_lower = col.lower().strip()
        if col_lower in ['name', 'player', 'player_name']:
            column_map['name'] = col
        elif col_lower in ['position', 'pos']:
            column_map['position'] = col
        elif col_lower in ['team']:
            column_map['team'] = col
        elif col_lower in ['rank', 'overall_rank', 'overall rank', 'ranking']:
            column_map['rank'] = col
        elif col_lower in ['tier']:
            column_map['tier'] = col
        elif col_lower in ['value', 'val', 'projected_value', 'fantasy_value']:
            column_map['value'] = col
            print(f"📊 Found value column: '{col}' -> mapped as 'value'")  # Debug logging
    
    print(f"📊 Column mapping: {column_map}")  # Debug logging
    
    # Use mapped columns or fallback to constants
    name_col = column_map.get('name', FIELD_NAME)
    pos_col = column_map.get('position', FIELD_POSITION)
    team_col = column_map.get('team', FIELD_TEAM)
    rank_col = column_map.get('rank', FIELD_OVERALL_RANK)
    tier_col = column_map.get('tier', FIELD_TIER)
    value_col = column_map.get('value', FIELD_VALUE)
    
    playersList = []
    for i, player in enumerate(rankingsDict):
        try:
            name = player[name_col]
            pos = remove_numbers_from_string(player[pos_col])
            team = player.get(team_col, 'FA')  # Default to FA if team not found
            rank = player.get(rank_col, 999)  # Default rank if not found
            tier = player.get(tier_col, 999)  # Get tier from CSV, default to 999 if not present
            
            # Handle value column more carefully
            value = None
            if value_col in player:
                raw_value = player[value_col]
                if raw_value is not None and str(raw_value).lower() not in ['nan', 'null', '']:
                    try:
                        value = float(raw_value)
                        if i < 3:  # Debug first 3 players
                            print(f"📊 Player {name}: value_col='{value_col}', raw_value='{raw_value}', parsed_value={value}")
                    except (ValueError, TypeError):
                        print(f"⚠️ Could not parse value '{raw_value}' for {name}")
                        value = None
            
            # Include all positions including DST and D/ST
            playersList.append(Player(name, team, pos, rank, tier, value))
            
        except Exception as e:
            print(f"⚠️ Error parsing player {i}: {e}")
            continue
    
    print(f"✅ Parsed {len(playersList)} players")
    return playersList
