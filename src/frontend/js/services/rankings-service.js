/**
 * Rankings Service - Handles fetching and managing rankings data
 * Auto-refreshes Fantasy Pros rankings if they're over 5 hours old
 */

class RankingsService {
    constructor() {
        this.baseUrl = '/api/rankings';
        this.cache = new Map();
        this.lastFetchTime = null;
        this.autoRefreshThreshold = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
        this.isRefreshing = false;
        console.log('✅ Rankings service initialized with auto-refresh');
    }

    /**
     * Get all available rankings with auto-refresh
     */
    async getAvailableRankings() {
        try {
            console.log('📡 Fetching available rankings...');
            
            // Check if we need to auto-refresh Fantasy Pros rankings
            await this.checkAndAutoRefresh();
            
            const response = await fetch(`${this.baseUrl}/list`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log(`✅ Found ${data.total} ranking files (${data.fantasy_pros_count} Fantasy Pros, ${data.uploaded_count} custom)`);
                this.lastFetchTime = Date.now();
                return data.rankings;
            } else {
                throw new Error(data.message || 'Failed to fetch rankings');
            }
            
        } catch (error) {
            console.error('❌ Error fetching rankings:', error);
            
            // Return empty array instead of throwing to allow graceful fallback
            return [];
        }
    }

    /**
     * Check if Fantasy Pros rankings need refresh and auto-refresh if needed
     */
    async checkAndAutoRefresh() {
        try {
            // Don't auto-refresh if already in progress
            if (this.isRefreshing) {
                console.log('🔄 Auto-refresh already in progress, skipping...');
                return;
            }

            // Get current stats to check last update time
            const statsResponse = await fetch(`${this.baseUrl}/stats`);
            if (!statsResponse.ok) {
                console.log('⚠️ Could not fetch stats for auto-refresh check');
                return;
            }

            const statsData = await statsResponse.json();
            if (statsData.status !== 'success') {
                console.log('⚠️ Stats request failed, skipping auto-refresh');
                return;
            }

            const stats = statsData.stats;
            const lastScrapeTime = stats.last_scrape_time;

            // If no Fantasy Pros rankings exist, trigger refresh
            if (stats.fantasy_pros_rankings === 0) {
                console.log('🔄 No Fantasy Pros rankings found, triggering initial fetch...');
                await this.forceRefreshFantasyPros();
                return;
            }

            // If we have a last scrape time, check if it's over 5 hours old
            if (lastScrapeTime) {
                const lastScrape = new Date(lastScrapeTime);
                const now = new Date();
                const timeDiff = now - lastScrape;

                if (timeDiff > this.autoRefreshThreshold) {
                    const hoursOld = Math.round(timeDiff / (60 * 60 * 1000) * 10) / 10;
                    console.log(`🔄 Fantasy Pros rankings are ${hoursOld} hours old, auto-refreshing...`);
                    await this.forceRefreshFantasyPros();
                } else {
                    const hoursOld = Math.round(timeDiff / (60 * 60 * 1000) * 10) / 10;
                    console.log(`✅ Fantasy Pros rankings are ${hoursOld} hours old, no refresh needed`);
                }
            } else {
                console.log('🔄 No last scrape time found, triggering refresh...');
                await this.forceRefreshFantasyPros();
            }

        } catch (error) {
            console.error('❌ Error during auto-refresh check:', error);
            // Don't throw - allow the main ranking fetch to continue
        }
    }

    /**
     * Force refresh Fantasy Pros rankings
     */
    async forceRefreshFantasyPros() {
        try {
            if (this.isRefreshing) {
                console.log('🔄 Refresh already in progress');
                return;
            }

            this.isRefreshing = true;
            console.log('🔄 Force refreshing Fantasy Pros rankings...');

            const response = await fetch(`${this.baseUrl}/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                console.log(`✅ Fantasy Pros refresh successful: ${data.fantasy_pros_count} rankings available`);
                
                // Clear cache to force fresh fetch
                this.cache.clear();
                this.lastFetchTime = null;
                
                return true;
            } else {
                throw new Error(data.message || 'Refresh failed');
            }

        } catch (error) {
            console.error('❌ Error refreshing Fantasy Pros rankings:', error);
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Get ranking data for a specific ranking
     */
    async getRankingData(rankingId) {
        try {
            // Check cache first
            if (this.cache.has(rankingId)) {
                console.log(`📋 Using cached data for ${rankingId}`);
                return this.cache.get(rankingId);
            }

            console.log(`📡 Fetching ranking data for: ${rankingId}`);
            
            const response = await fetch(`${this.baseUrl}/data/${rankingId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log(`✅ Loaded ${data.total_players} players for ${rankingId}`);
                
                // Cache the data
                this.cache.set(rankingId, data);
                
                return data;
            } else {
                throw new Error(data.message || 'Failed to fetch ranking data');
            }
            
        } catch (error) {
            console.error(`❌ Error fetching ranking data for ${rankingId}:`, error);
            throw error;
        }
    }

    /**
     * Upload a custom ranking file
     */
    async uploadRanking(file, metadata = {}) {
        try {
            console.log(`📤 Uploading ranking file: ${file.name}`);
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', metadata.name || file.name);
            formData.append('scoring', metadata.scoring || 'Custom');
            formData.append('format', metadata.format || 'Custom');
            
            const response = await fetch(`${this.baseUrl}/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log(`✅ Upload successful: ${data.ranking.name}`);
                
                // Clear cache to force fresh fetch
                this.cache.clear();
                this.lastFetchTime = null;
                
                return data.ranking;
            } else {
                throw new Error(data.message || 'Upload failed');
            }
            
        } catch (error) {
            console.error('❌ Error uploading ranking:', error);
            throw error;
        }
    }

    /**
     * Delete a custom ranking
     */
    async deleteRanking(rankingId) {
        try {
            console.log(`🗑️ Deleting ranking: ${rankingId}`);
            
            const response = await fetch(`${this.baseUrl}/delete/${rankingId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log(`✅ Ranking deleted successfully`);
                
                // Clear cache
                this.cache.delete(rankingId);
                this.lastFetchTime = null;
                
                return true;
            } else {
                throw new Error(data.message || 'Delete failed');
            }
            
        } catch (error) {
            console.error('❌ Error deleting ranking:', error);
            throw error;
        }
    }

    /**
     * Get system statistics
     */
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/stats`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return data.stats;
            } else {
                throw new Error(data.message || 'Failed to fetch stats');
            }
            
        } catch (error) {
            console.error('❌ Error fetching stats:', error);
            throw error;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.lastFetchTime = null;
        console.log('🗑️ Rankings cache cleared');
    }
}

// Create global instance
const rankingsService = new RankingsService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = rankingsService;
}
