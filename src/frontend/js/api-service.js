/**
 * API Service Module
 * 
 * Handles all API communication with the backend server
 */

class ApiService {
    constructor(apiBase = '/api') {
        this.apiBase = apiBase;
    }

    /**
     * Make API request with error handling and timeout
     */
    async request(endpoint, options = {}) {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                signal: controller.signal,
                ...options
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`API request timeout: ${endpoint}`);
                throw new Error('Request timed out - server may not be running');
            }
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            const response = await this.request('/health');
            return response;
        } catch (error) {
            throw new Error('Failed to connect to API');
        }
    }

    /**
     * Get user data
     */
    async getUser(username) {
        return await this.request(`/user/${username}`);
    }

    /**
     * Get user leagues
     */
    async getUserLeagues(username) {
        return await this.request(`/user/${username}/leagues`);
    }

    /**
     * Get draft information
     */
    async getDraft(draftId) {
        return await this.request(`/draft/${draftId}`);
    }

    /**
     * Get available players
     */
    async getAvailablePlayers(draftId, limit = 50) {
        return await this.request(`/draft/${draftId}/available-players?limit=${limit}`);
    }

    /**
     * Get best available players
     */
    async getBestAvailable(draftId, count = 5) {
        return await this.request(`/draft/${draftId}/best-available?count=${count}`);
    }

    /**
     * Get draft updates
     */
    async getDraftUpdates(draftId) {
        return await this.request(`/draft/${draftId}/updates`);
    }

    /**
     * Refresh draft data
     */
    async refreshDraft(draftId) {
        return await this.request(`/draft/${draftId}/refresh`, {
            method: 'POST'
        });
    }

    /**
     * Get draft board
     */
    async getDraftBoard(draftId) {
        return await this.request(`/draft/${draftId}/board`);
    }

    /**
     * Get base URL for API info display
     */
    getBaseUrl() {
        return this.apiBase;
    }
}

// Export for use in other modules
window.ApiService = ApiService;
