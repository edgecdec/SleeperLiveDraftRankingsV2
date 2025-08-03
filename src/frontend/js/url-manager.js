/**
 * URL Manager for Fantasy Football Draft Assistant V2
 * 
 * Handles URL parameters for state persistence and navigation
 */

class URLManager {
    constructor() {
        this.params = new URLSearchParams(window.location.search);
    }
    
    /**
     * Get current URL parameters
     */
    getParams() {
        return {
            username: this.params.get('username'),
            league_id: this.params.get('league_id'),
            draft_id: this.params.get('draft_id'),
            section: this.params.get('section') || 'welcome'
        };
    }
    
    /**
     * Update URL parameters without page reload
     */
    updateParams(newParams) {
        const currentParams = this.getParams();
        const updatedParams = { ...currentParams, ...newParams };
        
        // Remove null/undefined values
        Object.keys(updatedParams).forEach(key => {
            if (updatedParams[key] === null || updatedParams[key] === undefined) {
                delete updatedParams[key];
            }
        });
        
        // Build new URL
        const newUrl = new URL(window.location);
        newUrl.search = new URLSearchParams(updatedParams).toString();
        
        // Update browser history
        window.history.pushState(null, '', newUrl.toString());
        
        console.log('🔗 Updated URL params:', updatedParams);
    }
    
    /**
     * Set username in URL
     */
    setUsername(username) {
        this.updateParams({ username, section: 'leagues' });
    }
    
    /**
     * Set league selection in URL
     */
    setLeague(username, leagueId) {
        this.updateParams({ 
            username, 
            league_id: leagueId, 
            section: 'league-select' 
        });
    }
    
    /**
     * Set draft in URL
     */
    setDraft(username, leagueId, draftId) {
        this.updateParams({ 
            username, 
            league_id: leagueId, 
            draft_id: draftId, 
            section: 'draft' 
        });
    }
    
    /**
     * Clear all parameters (go to welcome)
     */
    clearParams() {
        const newUrl = new URL(window.location);
        newUrl.search = '';
        window.history.pushState(null, '', newUrl.toString());
        console.log('🔗 Cleared URL params');
    }
    
    /**
     * Get shareable URL for current state
     */
    getShareableUrl() {
        return window.location.href;
    }
    
    /**
     * Check if we should auto-load from URL params
     */
    shouldAutoLoad() {
        const params = this.getParams();
        return !!(params.username && (params.league_id || params.draft_id));
    }
    
    /**
     * Handle browser back/forward navigation
     */
    setupPopstateHandler(callback) {
        window.addEventListener('popstate', (event) => {
            console.log('🔗 Browser navigation detected');
            this.params = new URLSearchParams(window.location.search);
            if (callback) {
                callback(this.getParams());
            }
        });
    }
    
    /**
     * Generate URL for sharing a specific draft
     */
    generateDraftUrl(username, leagueId, draftId) {
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({
            username,
            league_id: leagueId,
            draft_id: draftId,
            section: 'draft'
        });
        return `${baseUrl}?${params.toString()}`;
    }
    
    /**
     * Copy current URL to clipboard
     */
    async copyCurrentUrl() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            return true;
        } catch (error) {
            console.error('Failed to copy URL:', error);
            return false;
        }
    }
}
