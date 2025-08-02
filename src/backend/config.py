"""
Configuration and Constants for Fantasy Football Draft Assistant V2

This module contains all configuration settings and constants used throughout the application.
"""

import os

# Default settings
DEFAULT_DRAFT_ID = None  # Will be set via API
LEGACY_FILE_NAME = 'Rankings.csv'  # Legacy fallback

# Flask settings
FLASK_HOST = 'localhost'  # Changed from 0.0.0.0 for security in single-user app
FLASK_PORT = 5000  # Default port, will be auto-detected
FLASK_DEBUG = False  # Will be set by main.py

# Cache settings
DRAFT_CACHE_DURATION = 30  # seconds
PLAYER_CACHE_DURATION = 3600  # 1 hour cache for player data

# File settings
MANUAL_RANKINGS_OVERRIDE_FILE = 'manual_rankings_override.json'
CURRENT_RANKINGS_SELECTION_FILE = 'current_rankings_selection.json'

# API settings
SLEEPER_API_BASE_URL = "https://api.sleeper.app/v1"
API_TIMEOUT = 10  # seconds
API_RATE_LIMIT_DELAY = 0.1  # seconds between requests

# Paths (will be set dynamically based on executable vs development)
DATA_DIR = None  # Will be set by app initialization
RANKINGS_DIR = None  # Will be set by app initialization

def init_paths(base_path: str):
    """Initialize paths based on the application base path"""
    global DATA_DIR, RANKINGS_DIR
    DATA_DIR = os.path.join(base_path, 'data')
    RANKINGS_DIR = os.path.join(DATA_DIR, 'rankings')
    
    # Create directories if they don't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(RANKINGS_DIR, exist_ok=True)
