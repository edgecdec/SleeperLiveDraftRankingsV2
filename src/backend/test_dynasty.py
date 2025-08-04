#!/usr/bin/env python3

# Simple test to verify dynasty detection
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test dynasty detection logic directly
def test_dynasty_detection():
    # Mock league info for the dynasty league
    league_info = {
        'settings': {
            'type': 2,
            'max_keepers': 1,
            'taxi_slots': 4
        },
        'previous_league_id': '1049934141544185856'
    }
    
    # Direct dynasty detection logic
    settings = league_info.get('settings', {})
    league_type = settings.get('type')
    max_keepers = settings.get('max_keepers', 0)
    taxi_slots = settings.get('taxi_slots', 0)
    previous_league = league_info.get('previous_league_id')
    
    print(f"League settings - type={league_type}, max_keepers={max_keepers}, taxi_slots={taxi_slots}, previous_league={previous_league}")
    
    # Dynasty detection logic
    if league_type == 2 or max_keepers > 0 or taxi_slots > 0 or previous_league:
        is_dynasty = True
        print(f"✅ DYNASTY DETECTED: type={league_type}, keepers={max_keepers}, taxi={taxi_slots}")
    else:
        is_dynasty = False
        print(f"❌ REDRAFT DETECTED")
    
    return is_dynasty

if __name__ == "__main__":
    result = test_dynasty_detection()
    print(f"Final result: {result}")
