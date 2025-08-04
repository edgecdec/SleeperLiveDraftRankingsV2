/**
 * Player Handlers Module
 * 
 * Handles player-related functionality including filtering, searching,
 * queue management, and player interactions
 */

class PlayerHandlers {
    constructor(apiService, uiUtils, queueManager, customRankings) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        this.queueManager = queueManager;
        this.customRankings = customRankings;
        
        this.state = {
            currentFilters: {},
            isLoadingAvailablePlayers: false,
            availablePlayers: [],
            searchTerm: ''
        };
    }

    /**
     * Initialize player handlers
     */
    init() {
        this.setupPlayerFilters();
        this.setupPlayerSearch();
        this.setupPlayerInteractions();
    }

    /**
     * Setup player filtering controls
     */
    setupPlayerFilters() {
        // Position filters
        const positionFilters = document.querySelectorAll('.position-filter');
        positionFilters.forEach(filter => {
            filter.addEventListener('sl-change', (e) => {
                const position = e.target.dataset.position;
                const checked = e.target.checked;
                console.log(`🏈 Position filter ${position}:`, checked);
                this.handlePositionFilter(position, checked);
            });
        });

        // Team filters
        const teamFilters = document.querySelectorAll('.team-filter');
        teamFilters.forEach(filter => {
            filter.addEventListener('sl-change', (e) => {
                const team = e.target.dataset.team;
                const checked = e.target.checked;
                console.log(`🏟️ Team filter ${team}:`, checked);
                this.handleTeamFilter(team, checked);
            });
        });

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                console.log('🧹 Clear filters clicked');
                this.clearAllFilters();
            });
        }
    }

    /**
     * Setup player search functionality
     */
    setupPlayerSearch() {
        const searchInput = document.getElementById('player-search');
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('sl-input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                
                // Debounce search
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    console.log('🔍 Player search:', searchTerm);
                    this.handlePlayerSearch(searchTerm);
                }, 300);
            });

            // Clear search button
            searchInput.addEventListener('sl-clear', () => {
                console.log('🧹 Player search cleared');
                this.handlePlayerSearch('');
            });
        }
    }

    /**
     * Setup player interaction handlers
     */
    setupPlayerInteractions() {
        // Delegate event handling for dynamically created player elements
        document.addEventListener('click', (e) => {
            // Add to queue button
            if (e.target.matches('.add-to-queue-btn') || e.target.closest('.add-to-queue-btn')) {
                const btn = e.target.matches('.add-to-queue-btn') ? e.target : e.target.closest('.add-to-queue-btn');
                const playerId = btn.dataset.playerId;
                if (playerId) {
                    this.handleAddToQueue(playerId);
                }
            }

            // Player card click for details
            if (e.target.matches('.player-card') || e.target.closest('.player-card')) {
                const card = e.target.matches('.player-card') ? e.target : e.target.closest('.player-card');
                const playerId = card.dataset.playerId;
                if (playerId) {
                    this.handlePlayerDetails(playerId);
                }
            }

            // Draft player button
            if (e.target.matches('.draft-player-btn') || e.target.closest('.draft-player-btn')) {
                const btn = e.target.matches('.draft-player-btn') ? e.target : e.target.closest('.draft-player-btn');
                const playerId = btn.dataset.playerId;
                if (playerId) {
                    this.handleDraftPlayer(playerId);
                }
            }
        });
    }

    /**
     * Handle position filter change
     */
    handlePositionFilter(position, checked) {
        if (!this.state.currentFilters.positions) {
            this.state.currentFilters.positions = new Set();
        }

        if (checked) {
            this.state.currentFilters.positions.add(position);
        } else {
            this.state.currentFilters.positions.delete(position);
        }

        this.applyFilters();
    }

    /**
     * Handle team filter change
     */
    handleTeamFilter(team, checked) {
        if (!this.state.currentFilters.teams) {
            this.state.currentFilters.teams = new Set();
        }

        if (checked) {
            this.state.currentFilters.teams.add(team);
        } else {
            this.state.currentFilters.teams.delete(team);
        }

        this.applyFilters();
    }

    /**
     * Handle player search
     */
    handlePlayerSearch(searchTerm) {
        this.state.searchTerm = searchTerm;
        this.applyFilters();
    }

    /**
     * Apply all current filters
     */
    applyFilters() {
        const playerCards = document.querySelectorAll('.player-card');
        let visibleCount = 0;

        playerCards.forEach(card => {
            const player = this.getPlayerFromCard(card);
            const isVisible = this.shouldShowPlayer(player);
            
            card.style.display = isVisible ? 'block' : 'none';
            if (isVisible) visibleCount++;
        });

        // Update filter status
        this.updateFilterStatus(visibleCount);
    }

    /**
     * Check if player should be shown based on current filters
     */
    shouldShowPlayer(player) {
        if (!player) return false;

        // Position filter
        if (this.state.currentFilters.positions && this.state.currentFilters.positions.size > 0) {
            if (!this.state.currentFilters.positions.has(player.position)) {
                return false;
            }
        }

        // Team filter
        if (this.state.currentFilters.teams && this.state.currentFilters.teams.size > 0) {
            if (!this.state.currentFilters.teams.has(player.team)) {
                return false;
            }
        }

        // Search filter
        if (this.state.searchTerm) {
            const searchLower = this.state.searchTerm.toLowerCase();
            const playerName = (player.full_name || player.name || '').toLowerCase();
            const playerTeam = (player.team || '').toLowerCase();
            const playerPosition = (player.position || '').toLowerCase();
            
            if (!playerName.includes(searchLower) && 
                !playerTeam.includes(searchLower) && 
                !playerPosition.includes(searchLower)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get player data from card element
     */
    getPlayerFromCard(card) {
        return {
            id: card.dataset.playerId,
            name: card.dataset.playerName,
            full_name: card.dataset.playerFullName,
            position: card.dataset.playerPosition,
            team: card.dataset.playerTeam
        };
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        // Clear filter state
        this.state.currentFilters = {};
        this.state.searchTerm = '';

        // Clear UI elements
        const positionFilters = document.querySelectorAll('.position-filter');
        positionFilters.forEach(filter => {
            filter.checked = false;
        });

        const teamFilters = document.querySelectorAll('.team-filter');
        teamFilters.forEach(filter => {
            filter.checked = false;
        });

        const searchInput = document.getElementById('player-search');
        if (searchInput) {
            searchInput.value = '';
        }

        // Apply cleared filters
        this.applyFilters();
        
        this.uiUtils.showNotification('All filters cleared', 'info');
    }

    /**
     * Update filter status display
     */
    updateFilterStatus(visibleCount) {
        const statusElement = document.getElementById('filter-status');
        if (statusElement) {
            const totalCount = document.querySelectorAll('.player-card').length;
            statusElement.textContent = `Showing ${visibleCount} of ${totalCount} players`;
        }
    }

    /**
     * Handle add player to queue
     */
    handleAddToQueue(playerId) {
        const player = this.findPlayerById(playerId);
        if (player) {
            if (this.queueManager) {
                this.queueManager.addPlayer(player);
            }
            this.uiUtils.showNotification(`Added ${player.full_name || player.name} to queue`, 'success');
        }
    }

    /**
     * Handle player details view
     */
    handlePlayerDetails(playerId) {
        const player = this.findPlayerById(playerId);
        if (player) {
            // TODO: Implement player details modal/view
            console.log('📋 Show player details:', player);
            this.uiUtils.showNotification(`Player details: ${player.full_name || player.name}`, 'info');
        }
    }

    /**
     * Handle draft player action
     */
    handleDraftPlayer(playerId) {
        const player = this.findPlayerById(playerId);
        if (player) {
            // TODO: Implement draft player functionality
            console.log('🎯 Draft player:', player);
            this.uiUtils.showNotification(`Drafted ${player.full_name || player.name}`, 'success');
        }
    }

    /**
     * Find player by ID
     */
    findPlayerById(playerId) {
        return this.state.availablePlayers.find(player => 
            player.player_id === playerId || player.id === playerId
        );
    }

    /**
     * Load available players
     */
    async loadAvailablePlayers(draftId) {
        if (this.state.isLoadingAvailablePlayers) {
            console.log('⏳ Already loading available players...');
            return;
        }

        try {
            this.state.isLoadingAvailablePlayers = true;
            console.log('📥 Loading available players...');

            const response = await this.apiService.getAvailablePlayers(draftId);
            
            if (response.status === 'success') {
                this.state.availablePlayers = response.data || [];
                console.log(`✅ Loaded ${this.state.availablePlayers.length} available players`);
                
                // Trigger UI update
                this.renderAvailablePlayers();
            } else {
                throw new Error(response.message || 'Failed to load available players');
            }
        } catch (error) {
            console.error('❌ Error loading available players:', error);
            this.uiUtils.showNotification('Failed to load available players', 'danger');
        } finally {
            this.state.isLoadingAvailablePlayers = false;
        }
    }

    /**
     * Render available players in the UI
     */
    renderAvailablePlayers() {
        // TODO: Implement player rendering logic
        console.log('🎨 Rendering available players...');
        
        // Apply current filters after rendering
        setTimeout(() => {
            this.applyFilters();
        }, 100);
    }

    /**
     * Get current filter state
     */
    getFilterState() {
        return {
            positions: this.state.currentFilters.positions ? 
                Array.from(this.state.currentFilters.positions) : [],
            teams: this.state.currentFilters.teams ? 
                Array.from(this.state.currentFilters.teams) : [],
            searchTerm: this.state.searchTerm
        };
    }

    /**
     * Set available players data
     */
    setAvailablePlayers(players) {
        this.state.availablePlayers = players || [];
        console.log(`🎯 Set ${this.state.availablePlayers.length} available players`);
    }

    /**
     * Set current user
     */
    setCurrentUser(user) {
        this.state.currentUser = user;
        console.log('👤 Current user set for player handlers:', user);
    }

    /**
     * Cleanup player handlers
     */
    cleanup() {
        console.log('🧹 Cleaning up player handlers');
    }
}

// Export for use in other modules
window.PlayerHandlers = PlayerHandlers;
