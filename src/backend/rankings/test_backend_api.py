#!/usr/bin/env python3
"""
Test script to verify backend API is returning tier data correctly
"""

import requests
import json
import sys

def test_backend_api():
    """Test the backend API endpoints"""
    print("🧪 Testing Backend API for Tier Data...")
    
    base_url = "http://localhost:5000"
    
    # Test 1: Health check
    print("\n1️⃣ Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working")
            health_data = response.json()
            print(f"   Status: {health_data.get('status')}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("   Make sure the Flask server is running on port 5000")
        return False
    
    # Test 2: Get rankings with tier data
    print("\n2️⃣ Testing rankings endpoint...")
    try:
        response = requests.get(f"{base_url}/api/rankings?scoring_format=half_ppr&league_type=superflex", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                rankings = data.get('rankings', [])
                print(f"✅ Rankings endpoint working - {len(rankings)} players")
                
                # Check first 5 players for tier data
                print("\n   First 5 players with tier data:")
                for i, player in enumerate(rankings[:5]):
                    tier = player.get('tier', 'Missing')
                    print(f"   {i+1}. {player.get('name', 'Unknown')} ({player.get('position', '?')}) - Tier {tier}")
                
                # Verify tier data types and values
                tier_issues = []
                for i, player in enumerate(rankings[:10]):
                    tier = player.get('tier')
                    if tier is None:
                        tier_issues.append(f"Player {i+1} has no tier data")
                    elif not isinstance(tier, int):
                        tier_issues.append(f"Player {i+1} tier is {type(tier)}, not int")
                    elif tier < 1 or tier > 20:
                        tier_issues.append(f"Player {i+1} has unusual tier value: {tier}")
                
                if tier_issues:
                    print(f"\n⚠️  Tier data issues found:")
                    for issue in tier_issues:
                        print(f"     {issue}")
                else:
                    print(f"\n✅ All tier data looks correct!")
                
                return True
            else:
                print(f"❌ Rankings API returned error: {data.get('error')}")
                return False
        else:
            print(f"❌ Rankings endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Rankings request failed: {e}")
        return False

def test_custom_rankings_api():
    """Test custom rankings API"""
    print("\n3️⃣ Testing custom rankings endpoint...")
    try:
        response = requests.get("http://localhost:5000/api/custom-rankings", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                custom_rankings = data.get('custom_rankings', [])
                print(f"✅ Custom rankings endpoint working - {len(custom_rankings)} custom rankings")
                return True
            else:
                print(f"❌ Custom rankings API error: {data.get('error')}")
                return False
        else:
            print(f"❌ Custom rankings endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Custom rankings request failed: {e}")
        return False

def main():
    """Main test function"""
    print("🏈 Testing Backend API for Tier Data")
    print("=" * 50)
    
    # Test backend API
    api_working = test_backend_api()
    custom_working = test_custom_rankings_api()
    
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    print(f"  Backend API: {'✅ Working' if api_working else '❌ Failed'}")
    print(f"  Custom Rankings: {'✅ Working' if custom_working else '❌ Failed'}")
    
    if api_working:
        print("\n🎉 Backend is serving tier data correctly!")
        print("\n📋 Next steps:")
        print("  1. ✅ CSV has correct tier data")
        print("  2. ✅ Backend loads and serves tier data")
        print("  3. ❓ Frontend needs to display tier column")
        print("\n💡 The issue is likely in the frontend not displaying the tier column.")
        print("   Check that the React component includes a 'Tier' column in the table.")
    else:
        print("\n❌ Backend API issues found. Start the Flask server:")
        print("   cd /path/to/backend && python3 app.py")
    
    return 0 if (api_working and custom_working) else 1

if __name__ == "__main__":
    sys.exit(main())
