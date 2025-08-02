"""
Draft API Module

Handles draft-related Sleeper API calls
"""

from typing import Dict, List, Optional
from .base_client import BaseSleeperClient, SleeperAPIError


class DraftAPI(BaseSleeperClient):
    """API client for draft operations"""
    
    @staticmethod
    def get_draft_info(draft_id: str) -> Optional[Dict]:
        """Get draft information by draft ID"""
        if not draft_id:
            raise ValueError("Draft ID is required")
        
        return DraftAPI.make_request(f"/draft/{draft_id}")
    
    @staticmethod
    def get_draft_picks(draft_id: str) -> List[Dict]:
        """Get all draft picks for a draft"""
        if not draft_id:
            raise ValueError("Draft ID is required")
        
        result = DraftAPI.make_request(f"/draft/{draft_id}/picks", timeout=15)
        return result or []
