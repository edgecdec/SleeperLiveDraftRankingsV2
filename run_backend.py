#!/usr/bin/env python3

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.backend.app import create_app

if __name__ == "__main__":
    app = create_app()
    print("🚀 Starting Fantasy Football Draft Assistant V2 Backend...")
    print("📡 Server running on http://localhost:5000")
    print("🔗 API endpoints available at http://localhost:5000/api")
    app.run(host='0.0.0.0', port=5000, debug=True)
