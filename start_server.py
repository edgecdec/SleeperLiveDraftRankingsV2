#!/usr/bin/env python3
"""
Simple server startup script for Fantasy Football Draft Assistant V2

This script starts the Flask backend server with proper configuration
and provides clear feedback about the server status.
"""

import sys
import os
import subprocess
import time
import requests
from pathlib import Path

def check_server_running(port=5000):
    """Check if server is already running on the specified port"""
    try:
        response = requests.get(f'http://localhost:{port}/api/health', timeout=2)
        return response.status_code == 200
    except:
        return False

def start_server(port=5000, debug=False):
    """Start the Flask server"""
    project_root = Path(__file__).parent
    
    print("🏈 Fantasy Football Draft Assistant V2 - Server Startup")
    print("=" * 60)
    
    # Check if server is already running
    if check_server_running(port):
        print(f"✅ Server is already running on port {port}")
        print(f"🌐 Open your browser to: http://localhost:{port}")
        return
    
    print(f"🚀 Starting server on port {port}...")
    print(f"📁 Project root: {project_root}")
    
    # Change to project directory
    os.chdir(project_root)
    
    # Build command
    cmd = [sys.executable, 'main.py', '--port', str(port)]
    if debug:
        cmd.append('--debug')
    
    try:
        print(f"🔧 Command: {' '.join(cmd)}")
        print("⏳ Starting server (this may take a few seconds)...")
        print()
        
        # Start the server
        process = subprocess.Popen(cmd)
        
        # Wait a moment for startup
        time.sleep(3)
        
        # Check if server started successfully
        if check_server_running(port):
            print("✅ Server started successfully!")
            print(f"🌐 Open your browser to: http://localhost:{port}")
            print("🛑 Press Ctrl+C to stop the server")
            print()
            
            # Keep the script running
            try:
                process.wait()
            except KeyboardInterrupt:
                print("\n🛑 Stopping server...")
                process.terminate()
                process.wait()
                print("✅ Server stopped")
        else:
            print("❌ Server failed to start properly")
            print("Check the output above for error messages")
            
    except FileNotFoundError:
        print("❌ Python not found or main.py missing")
        print("Make sure you're in the correct directory")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Start Fantasy Football Draft Assistant V2 Server')
    parser.add_argument('--port', type=int, default=5000, help='Port to run server on (default: 5000)')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    
    args = parser.parse_args()
    
    start_server(args.port, args.debug)
