#!/usr/bin/env python3
"""
Fantasy Football Draft Assistant V2
Single executable entry point

This is the main entry point for the application. It:
1. Finds an available port
2. Creates and configures the Flask app
3. Opens the browser automatically
4. Starts the server

Usage:
    python main.py [--port PORT] [--debug] [--no-browser]
"""

import os
import sys
import time
import threading
import webbrowser
import argparse
from pathlib import Path

# Add src to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.backend.app import create_app
from src.backend.utils.port_finder import find_available_port


def open_browser(url: str, delay: float = 1.5):
    """
    Open the default web browser to the application URL.
    
    Args:
        url: The URL to open
        delay: Seconds to wait before opening (allows server to start)
    """
    def _open():
        time.sleep(delay)
        try:
            webbrowser.open(url)
            print(f"🌐 Opened browser to {url}")
        except Exception as e:
            print(f"⚠️  Could not open browser automatically: {e}")
            print(f"   Please open your browser and go to: {url}")
    
    thread = threading.Thread(target=_open, daemon=True)
    thread.start()


def main():
    """Main application entry point"""
    parser = argparse.ArgumentParser(
        description='Fantasy Football Draft Assistant V2'
    )
    parser.add_argument(
        '--port', 
        type=int, 
        default=None,
        help='Port to run on (default: auto-detect)'
    )
    parser.add_argument(
        '--debug', 
        action='store_true',
        help='Run in debug mode'
    )
    parser.add_argument(
        '--no-browser', 
        action='store_true',
        help='Don\'t open browser automatically'
    )
    parser.add_argument(
        '--host',
        default='localhost',
        help='Host to bind to (default: localhost)'
    )
    
    args = parser.parse_args()
    
    # Find available port
    if args.port:
        port = args.port
        print(f"🔌 Using specified port: {port}")
    else:
        port = find_available_port(start_port=5000)
        print(f"🔌 Found available port: {port}")
    
    # Create Flask app
    print("🏗️  Creating Flask application...")
    app = create_app(debug=args.debug)
    
    # Prepare URL
    url = f"http://{args.host}:{port}"
    
    # Open browser (unless disabled)
    if not args.no_browser:
        print("🚀 Starting browser...")
        open_browser(url)
    
    # Start server
    print(f"🏈 Fantasy Football Draft Assistant V2")
    print(f"   Running on: {url}")
    print(f"   Debug mode: {args.debug}")
    print("   Press Ctrl+C to stop")
    print("-" * 50)
    
    try:
        app.run(
            host=args.host,
            port=port,
            debug=args.debug,
            use_reloader=False  # Disable reloader to prevent double startup
        )
    except KeyboardInterrupt:
        print("\n👋 Shutting down gracefully...")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
