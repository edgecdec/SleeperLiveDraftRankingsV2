/**
 * Rankings Service for Fantasy Football Draft Assistant V2
 * 
 * Handles CSV ranking files, uploads, and ranking data management
 */

class RankingsService {
    constructor() {
        this.baseUrl = '';
        this.currentRankings = null;
        this.availableRankings = [];
        console.log('✅ Rankings service initialized');
    }
    
    /**
     * Get list of available ranking files
     */
    async getAvailableRankings() {
        try {
            console.log('📡 Fetching available rankings...');
            
            const response = await fetch('/api/rankings/list');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.availableRankings = data.rankings;
                console.log(`✅ Found ${data.rankings.length} ranking files`);
                return data.rankings;
            } else {
                throw new Error(data.message || 'Failed to fetch rankings');
            }
        } catch (error) {
            console.error('❌ Error fetching rankings:', error);
            throw error;
        }
    }
    
    /**
     * Get ranking data for a specific ranking ID
     */
    async getRankingData(rankingId) {
        try {
            console.log(`📡 Fetching ranking data for: ${rankingId}`);
            
            const response = await fetch(`/api/rankings/data/${rankingId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.currentRankings = {
                    id: rankingId,
                    players: data.players,
                    totalPlayers: data.total_players,
                    columns: data.columns
                };
                
                console.log(`✅ Loaded ${data.total_players} players from ${rankingId}`);
                return this.currentRankings;
            } else {
                throw new Error(data.message || 'Failed to fetch ranking data');
            }
        } catch (error) {
            console.error(`❌ Error fetching ranking data for ${rankingId}:`, error);
            throw error;
        }
    }
    
    /**
     * Upload a custom ranking CSV file
     */
    async uploadRanking(file, metadata = {}) {
        try {
            console.log(`📤 Uploading ranking file: ${file.name}`);
            
            const formData = new FormData();
            formData.append('file', file);
            
            if (metadata.name) formData.append('name', metadata.name);
            if (metadata.scoring) formData.append('scoring', metadata.scoring);
            if (metadata.format) formData.append('format', metadata.format);
            
            const response = await fetch('/api/rankings/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log(`✅ Successfully uploaded: ${file.name}`);
                
                // Refresh available rankings
                await this.getAvailableRankings();
                
                return data.ranking;
            } else {
                throw new Error(data.message || 'Failed to upload ranking file');
            }
        } catch (error) {
            console.error(`❌ Error uploading ranking file:`, error);
            throw error;
        }
    }
    
    /**
     * Delete a custom ranking file
     */
    async deleteRanking(rankingId) {
        try {
            console.log(`🗑️ Deleting ranking: ${rankingId}`);
            
            const response = await fetch(`/api/rankings/delete/${rankingId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log(`✅ Successfully deleted: ${rankingId}`);
                
                // Refresh available rankings
                await this.getAvailableRankings();
                
                return true;
            } else {
                throw new Error(data.message || 'Failed to delete ranking file');
            }
        } catch (error) {
            console.error(`❌ Error deleting ranking:`, error);
            throw error;
        }
    }
    
    /**
     * Get current rankings data (all players)
     */
    getCurrentRankingsData() {
        if (!this.currentRankings || !this.currentRankings.players) {
            return [];
        }
        
        // Return the raw player data from CSV with normalized field names
        return this.currentRankings.players.map(player => ({
            player_name: player.name,
            position: player.position,
            team: player.team,
            overall_rank: player.overall_rank,
            position_rank: player.position_rank,
            tier: player.tier,
            bye_week: player.bye_week,
            value: player.value || 0 // Default to 0 if no value in CSV
        }));
    }
    
    /**
     * Get player ranking by name and position
     */
    getPlayerRanking(playerName, position) {
        if (!this.currentRankings || !this.currentRankings.players) {
            return null;
        }
        
        // Normalize player name for matching
        const normalizedName = this.normalizePlayerName(playerName);
        
        // Find player in rankings
        const player = this.currentRankings.players.find(p => {
            const rankingName = this.normalizePlayerName(p.name);
            const positionMatch = p.position === position || 
                                  p.position?.includes(position) ||
                                  position?.includes(p.position);
            
            return rankingName === normalizedName && positionMatch;
        });
        
        return player || null;
    }
    
    /**
     * Get all players for a specific position
     */
    getPlayersByPosition(position) {
        if (!this.currentRankings || !this.currentRankings.players) {
            return [];
        }
        
        return this.currentRankings.players.filter(player => {
            return player.position === position || 
                   player.position?.includes(position) ||
                   position?.includes(player.position);
        });
    }
    
    /**
     * Get top N players overall
     */
    getTopPlayers(count = 100) {
        if (!this.currentRankings || !this.currentRankings.players) {
            return [];
        }
        
        // Sort by overall rank if available, otherwise by position rank
        const sortedPlayers = [...this.currentRankings.players].sort((a, b) => {
            const aRank = a.overall_rank || a.position_rank || 999;
            const bRank = b.overall_rank || b.position_rank || 999;
            return aRank - bRank;
        });
        
        return sortedPlayers.slice(0, count);
    }
    
    /**
     * Normalize player name for matching
     */
    normalizePlayerName(name) {
        if (!name) return '';
        
        return name
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim();
    }
    
    /**
     * Get current rankings info
     */
    getCurrentRankingsInfo() {
        if (!this.currentRankings) {
            return null;
        }
        
        const rankingInfo = this.availableRankings.find(r => r.id === this.currentRankings.id);
        
        return {
            id: this.currentRankings.id,
            name: rankingInfo?.name || 'Unknown Rankings',
            totalPlayers: this.currentRankings.totalPlayers,
            type: rankingInfo?.type || 'unknown',
            scoring: rankingInfo?.scoring || 'unknown',
            format: rankingInfo?.format || 'unknown'
        };
    }
    
    /**
     * Parse CSV file for preview
     */
    async parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    
                    if (lines.length < 2) {
                        reject(new Error('CSV file must have at least a header and one data row'));
                        return;
                    }
                    
                    // Parse header
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    
                    // Parse first few data rows for preview
                    const previewRows = [];
                    for (let i = 1; i < Math.min(6, lines.length); i++) {
                        if (lines[i].trim()) {
                            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header] = values[index] || '';
                            });
                            previewRows.push(row);
                        }
                    }
                    
                    // Validate required columns
                    const requiredColumns = ['name', 'position'];
                    const availableColumns = headers.map(h => h.toLowerCase());
                    const missingColumns = requiredColumns.filter(col => 
                        !availableColumns.some(avail => avail.includes(col))
                    );
                    
                    if (missingColumns.length > 0) {
                        reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
                        return;
                    }
                    
                    resolve({
                        headers,
                        previewRows,
                        totalRows: lines.length - 1,
                        isValid: true
                    });
                    
                } catch (error) {
                    reject(new Error(`Failed to parse CSV: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
}

// Export for use in other modules
window.RankingsService = RankingsService;
