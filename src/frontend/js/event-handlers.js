/**
 * Event Handlers Module
 * 
 * Handles all user interactions and event listeners
 */

class EventHandlers {
    constructor(apiService, uiUtils, draftBoard) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        this.draftBoard = draftBoard;
        this.state = {
            currentUser: null,
            userLeagues: [],
            selectedLeague: null,
            selectedDraft: null,
            autoRefreshEnabled: false,
            autoRefreshInterval: null,
            lastUpdate: 0,
            draftUpdates: null,
            currentFilters: {} // Add filter state
        };
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Main navigation buttons
        this.setupNavigationButtons();
        
        // User setup form
        this.setupUserForm();
        
        // Draft controls
        this.setupDraftControls();
        
        // Tab navigation
        this.setupTabNavigation();
        
        console.log('🎯 Event listeners setup complete');
    }

    /**
     * Setup main navigation buttons
     */
    setupNavigationButtons() {
        const getStartedBtn = document.getElementById('get-started-btn');
        if (getStartedBtn) {
            console.log('✅ Setting up get-started-btn listener');
            getStartedBtn.addEventListener('click', () => {
                console.log('🚀 Get Started clicked - showing user setup');
                this.uiUtils.showSection('user-setup');
            });
        } else {
            console.error('❌ get-started-btn not found');
        }
        
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            console.log('✅ Setting up test-connection-btn listener');
            testConnectionBtn.addEventListener('click', () => {
                console.log('🔌 Test Connection clicked');
                this.handleTestConnection();
            });
        } else {
            console.error('❌ test-connection-btn not found');
        }

        const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
        if (backToWelcomeBtn) {
            console.log('✅ Setting up back-to-welcome-btn listener');
            backToWelcomeBtn.addEventListener('click', () => {
                console.log('⬅️ Back to welcome clicked');
                this.uiUtils.showSection('welcome');
            });
        }
    }

    /**
     * Setup user form interactions
     */
    setupUserForm() {
        const loadUserBtn = document.getElementById('load-user-btn');
        if (loadUserBtn) {
            console.log('✅ Setting up load-user-btn listener');
            loadUserBtn.addEventListener('click', () => {
                console.log('👤 Load user clicked');
                this.handleLoadUser();
            });
        }

        const usernameInput = document.getElementById('username-input');
        if (usernameInput) {
            console.log('✅ Setting up username-input listeners');
            usernameInput.addEventListener('sl-input', (event) => {
                const loadButton = document.getElementById('load-user-btn');
                if (loadButton) {
                    loadButton.disabled = !event.target.value.trim();
                }
            });
            
            usernameInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.value.trim()) {
                    this.handleLoadUser();
                }
            });
        }
    }

    /**
     * Setup draft control interactions
     */
    setupDraftControls() {
        // Manual refresh button
        const manualRefreshBtn = document.getElementById('manual-refresh-btn');
        if (manualRefreshBtn) {
            console.log('✅ Setting up manual-refresh-btn listener');
            manualRefreshBtn.addEventListener('click', () => {
                console.log('🔄 Manual refresh clicked');
                this.handleManualRefresh();
            });
        }

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        if (autoRefreshToggle) {
            console.log('✅ Setting up auto-refresh-toggle listener');
            autoRefreshToggle.addEventListener('sl-change', (event) => {
                this.handleAutoRefreshToggle(event.target.checked);
            });
        }

        // Position filter
        const positionFilter = document.getElementById('position-filter');
        if (positionFilter) {
            console.log('✅ Setting up position-filter listener');
            positionFilter.addEventListener('sl-change', (event) => {
                this.handlePositionFilter(event.target.value);
            });
        }

        // Player search
        const playerSearch = document.getElementById('player-search');
        if (playerSearch) {
            console.log('✅ Setting up player-search listener');
            playerSearch.addEventListener('sl-input', (event) => {
                this.handlePlayerSearch(event.target.value);
            });
        }
    }

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const tabGroup = document.querySelector('sl-tab-group');
        if (tabGroup) {
            console.log('✅ Setting up tab-group listener');
            tabGroup.addEventListener('sl-tab-show', (event) => {
                this.handleTabChange(event.detail.name);
            });
        }
    }

    /**
     * Handle test connection button click
     */
    async handleTestConnection() {
        const button = document.getElementById('test-connection-btn');
        if (button) button.loading = true;
        
        try {
            await this.apiService.testConnection();
            this.uiUtils.updateConnectionStatus(true);
            this.uiUtils.showNotification('✅ Connection successful! Backend is running.', 'success');
        } catch (error) {
            this.uiUtils.updateConnectionStatus(false);
            
            let errorMessage = 'Connection failed: ';
            if (error.message.includes('timeout')) {
                errorMessage += 'Server not responding (timeout). Make sure the backend is running on port 5000.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Cannot reach server. Start the backend with: python main.py --port 5000';
            } else {
                errorMessage += error.message;
            }
            
            this.uiUtils.showNotification(errorMessage, 'danger', 15000);
        } finally {
            if (button) button.loading = false;
        }
    }

    /**
     * Handle load user button click
     */
    async handleLoadUser() {
        const usernameInput = document.getElementById('username-input');
        const loadButton = document.getElementById('load-user-btn');
        
        if (!usernameInput?.value?.trim()) {
            this.uiUtils.showNotification('Please enter a username', 'warning');
            return;
        }
        
        const username = usernameInput.value.trim();
        
        if (loadButton) loadButton.loading = true;
        
        try {
            // Load user data
            const userData = await this.apiService.getUser(username);
            this.state.currentUser = userData.user;
            
            // Load user leagues
            const leaguesData = await this.apiService.getUserLeagues(username);
            this.state.userLeagues = leaguesData.leagues;
            
            this.uiUtils.showNotification(`Loaded ${leaguesData.leagues.length} leagues for ${username}`, 'success');
            
            // For demo purposes, auto-select first league with draft
            const leagueWithDraft = leaguesData.leagues.find(league => league.draft_id);
            if (leagueWithDraft) {
                this.state.selectedLeague = leagueWithDraft;
                this.state.selectedDraft = { draft_id: leagueWithDraft.draft_id };
                this.uiUtils.showSection('draft');
            } else {
                this.uiUtils.showNotification('No active drafts found', 'warning');
            }
            
        } catch (error) {
            this.uiUtils.showNotification('Failed to load user data: ' + error.message, 'danger');
        } finally {
            if (loadButton) loadButton.loading = false;
        }
    }

    /**
     * Handle manual refresh button click
     */
    async handleManualRefresh() {
        if (!this.state.selectedDraft?.draft_id) {
            this.uiUtils.showNotification('No draft selected for refresh', 'warning');
            return;
        }
        
        try {
            this.uiUtils.showLoading('Refreshing draft data...');
            
            // Use the refresh endpoint for manual refresh
            const refreshedData = await this.apiService.refreshDraft(this.state.selectedDraft.draft_id);
            
            // Update last update timestamp
            this.state.lastUpdate = refreshedData.last_updated || Date.now() / 1000;
            
            this.uiUtils.showNotification('Draft data refreshed successfully!', 'success');
            
        } catch (error) {
            console.error('Manual refresh failed:', error);
            this.uiUtils.showNotification('Failed to refresh draft data: ' + error.message, 'danger');
        } finally {
            this.uiUtils.hideLoading();
        }
    }

    /**
     * Handle auto-refresh toggle
     */
    handleAutoRefreshToggle(enabled) {
        this.state.autoRefreshEnabled = enabled;
        
        if (enabled) {
            this.startAutoRefresh();
            this.uiUtils.showNotification('Auto-refresh enabled', 'success');
        } else {
            this.stopAutoRefresh();
            this.uiUtils.showNotification('Auto-refresh disabled', 'neutral');
        }
    }

    /**
     * Start auto-refresh with draft updates checking
     */
    startAutoRefresh() {
        if (this.state.autoRefreshInterval) {
            clearInterval(this.state.autoRefreshInterval);
        }
        
        console.log('🔄 Starting auto-refresh for draft updates...');
        
        this.state.autoRefreshInterval = setInterval(async () => {
            if (!this.state.selectedDraft?.draft_id) {
                return;
            }
            
            try {
                // Check for draft updates first
                const updates = await this.apiService.getDraftUpdates(this.state.selectedDraft.draft_id);
                
                // Compare with last known update
                if (updates.last_update > this.state.lastUpdate) {
                    console.log('🔥 New draft picks detected, refreshing data...');
                    
                    // Show notification about new picks
                    const newPicks = updates.total_picks - (this.state.draftUpdates?.total_picks || 0);
                    if (newPicks > 0) {
                        this.uiUtils.showNotification(
                            `${newPicks} new pick${newPicks > 1 ? 's' : ''} detected! Refreshing draft data...`,
                            'primary',
                            3000
                        );
                    }
                    
                    // Update state
                    this.state.lastUpdate = updates.last_update;
                    this.state.draftUpdates = updates;
                }
                
            } catch (error) {
                console.error('❌ Auto-refresh failed:', error);
                // Don't show error notifications for auto-refresh failures
                // to avoid spamming the user
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.state.autoRefreshInterval) {
            clearInterval(this.state.autoRefreshInterval);
            this.state.autoRefreshInterval = null;
        }
    }

    /**
     * Handle tab change
     */
    handleTabChange(tabName) {
        console.log('Tab changed to:', tabName);
        
        // Load tab-specific data if needed
        switch (tabName) {
            case 'available-players':
                // Already loaded
                break;
            case 'best-available':
                // Already loaded
                break;
            case 'draft-board':
                if (this.state.selectedDraft?.draft_id) {
                    this.draftBoard.load(this.state.selectedDraft.draft_id);
                }
                break;
            case 'my-queue':
                // TODO: Implement queue
                break;
        }
    }

    /**
     * Handle position filter change
     */
    handlePositionFilter(position) {
        console.log('Position filter changed:', position);
        this.state.currentFilters = this.state.currentFilters || {};
        this.state.currentFilters.position = position;
        this.applyFiltersAndSearch();
    }
    
    /**
     * Handle player search
     */
    handlePlayerSearch(searchTerm) {
        console.log('Player search:', searchTerm);
        this.state.currentFilters = this.state.currentFilters || {};
        this.state.currentFilters.search = searchTerm;
        
        // Debounce search to avoid too many API calls
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            this.applyFiltersAndSearch();
        }, 300); // 300ms delay
    }
    
    /**
     * Apply current filters and search to available players
     */
    async applyFiltersAndSearch() {
        if (!this.state.selectedDraft?.draft_id) {
            return;
        }
        
        try {
            // Show loading state
            this.uiUtils.showLoadingState('available-players-loading', true);
            
            // Build query parameters
            const params = new URLSearchParams();
            params.append('limit', '100'); // Get more results for better filtering
            
            if (this.state.currentFilters?.position) {
                params.append('position', this.state.currentFilters.position);
            }
            
            if (this.state.currentFilters?.search) {
                params.append('search', this.state.currentFilters.search);
            }
            
            // Make API request with filters
            const availableData = await this.apiService.request(
                `/draft/${this.state.selectedDraft.draft_id}/available-players?${params.toString()}`
            );
            
            // Update the display
            this.displayFilteredPlayers(availableData.available_players, availableData.is_dynasty_league);
            
            // Update stats
            this.updateFilterStats(availableData);
            
        } catch (error) {
            console.error('Failed to apply filters:', error);
            this.uiUtils.showNotification('Failed to apply filters: ' + error.message, 'danger');
        } finally {
            this.uiUtils.showLoadingState('available-players-loading', false);
        }
    }
    
    /**
     * Display filtered players
     */
    displayFilteredPlayers(players, isDynasty = false) {
        const container = document.getElementById('available-players-list');
        if (!container) return;
        
        if (!players || players.length === 0) {
            container.innerHTML = `
                <sl-alert variant="neutral" open>
                    <sl-icon slot="icon" name="info-circle"></sl-icon>
                    No players found matching your search criteria.
                    <br><br>
                    <sl-button variant="neutral" size="small" id="clear-filters-btn">
                        <sl-icon slot="prefix" name="x-circle"></sl-icon>
                        Clear Filters
                    </sl-button>
                </sl-alert>
            `;
            
            // Add clear filters button listener
            const clearBtn = document.getElementById('clear-filters-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearAllFilters();
                });
            }
            
            return;
        }
        
        const playersHtml = players.map(player => this.createPlayerCard(player)).join('');
        container.innerHTML = playersHtml;
        
        // Add click listeners to player cards
        container.querySelectorAll('.player-card').forEach(card => {
            card.addEventListener('click', () => {
                const playerId = card.dataset.playerId;
                const player = players.find(p => p.player_id === playerId);
                if (player) {
                    this.showPlayerDetails(player);
                }
            });
        });
    }
    
    /**
     * Create enhanced player card with search highlighting
     */
    createPlayerCard(player) {
        const positionClass = `position-${player.position?.toLowerCase() || 'unknown'}`;
        
        // Highlight search terms in player name
        let displayName = player.name || 'Unknown Player';
        if (this.state.currentFilters?.search) {
            const searchTerm = this.state.currentFilters.search;
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            displayName = displayName.replace(regex, '<mark>$1</mark>');
        }
        
        return `
            <sl-card class="player-card" data-player-id="${player.player_id || ''}">
                <div slot="header" class="player-header">
                    <strong>${displayName}</strong>
                    <div class="player-badges">
                        <sl-badge variant="neutral" class="${positionClass}">
                            ${player.position || 'N/A'}
                        </sl-badge>
                        <sl-badge variant="neutral">${player.team || 'N/A'}</sl-badge>
                        ${player.tier ? `<sl-badge variant="primary">Tier ${player.tier}</sl-badge>` : ''}
                    </div>
                </div>
                
                <div class="player-stats">
                    <div class="stat-item">
                        <span class="stat-label">Rank</span>
                        <span class="stat-value">${player.rank || 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tier</span>
                        <span class="stat-value">${player.tier || 'N/A'}</span>
                    </div>
                    ${player.bye_week ? `
                        <div class="stat-item">
                            <span class="stat-label">Bye</span>
                            <span class="stat-value">Week ${player.bye_week}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div slot="footer">
                    <sl-button-group>
                        <sl-button variant="primary" size="small">
                            <sl-icon slot="prefix" name="plus"></sl-icon>
                            Queue
                        </sl-button>
                        <sl-button variant="neutral" size="small">
                            <sl-icon slot="prefix" name="info-circle"></sl-icon>
                            Details
                        </sl-button>
                    </sl-button-group>
                </div>
            </sl-card>
        `;
    }
    
    /**
     * Update filter statistics
     */
    updateFilterStats(data) {
        const availablePlayersBadge = document.getElementById('available-players-badge');
        if (availablePlayersBadge) {
            availablePlayersBadge.textContent = data.total_results || data.available_players?.length || '0';
        }
        
        // Show filter summary if filters are active
        this.showFilterSummary(data.filters);
    }
    
    /**
     * Show filter summary
     */
    showFilterSummary(filters) {
        const container = document.getElementById('available-players-list');
        if (!container) return;
        
        const activeFilters = [];
        if (filters?.position) activeFilters.push(`Position: ${filters.position}`);
        if (filters?.search) activeFilters.push(`Search: "${filters.search}"`);
        if (filters?.team) activeFilters.push(`Team: ${filters.team}`);
        if (filters?.tier) activeFilters.push(`Tier: ${filters.tier}`);
        
        if (activeFilters.length > 0) {
            const filterSummary = `
                <div class="filter-summary">
                    <sl-alert variant="primary" open>
                        <sl-icon slot="icon" name="funnel"></sl-icon>
                        <strong>Active Filters:</strong> ${activeFilters.join(', ')}
                        <sl-button slot="suffix" variant="text" size="small" id="clear-all-filters">
                            <sl-icon name="x"></sl-icon>
                        </sl-button>
                    </sl-alert>
                </div>
            `;
            
            // Insert filter summary at the top
            container.insertAdjacentHTML('afterbegin', filterSummary);
            
            // Add clear all filters listener
            const clearAllBtn = document.getElementById('clear-all-filters');
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', () => {
                    this.clearAllFilters();
                });
            }
        }
    }
    
    /**
     * Clear all active filters
     */
    clearAllFilters() {
        // Reset filter state
        this.state.currentFilters = {};
        
        // Clear UI elements
        const positionFilter = document.getElementById('position-filter');
        if (positionFilter) {
            positionFilter.value = '';
        }
        
        const playerSearch = document.getElementById('player-search');
        if (playerSearch) {
            playerSearch.value = '';
        }
        
        // Refresh data without filters
        this.applyFiltersAndSearch();
        
        this.uiUtils.showNotification('All filters cleared', 'success');
    }
    
    /**
     * Show player details modal
     */
    showPlayerDetails(player) {
        const modal = document.getElementById('player-details-modal');
        const content = document.getElementById('player-details-content');
        
        if (!modal || !content) return;
        
        // Create detailed player info
        const detailsHtml = `
            <div class="player-details">
                <div class="player-header">
                    <h3>${player.name}</h3>
                    <div class="player-badges">
                        <sl-badge variant="primary" class="position-${player.position?.toLowerCase()}">${player.position}</sl-badge>
                        <sl-badge variant="neutral">${player.team}</sl-badge>
                        ${player.tier ? `<sl-badge variant="success">Tier ${player.tier}</sl-badge>` : ''}
                    </div>
                </div>
                
                <div class="player-stats-detailed">
                    <div class="stat-row">
                        <span class="stat-label">Overall Rank:</span>
                        <span class="stat-value">${player.rank || 'N/A'}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Tier:</span>
                        <span class="stat-value">${player.tier || 'N/A'}</span>
                    </div>
                    ${player.bye_week ? `
                        <div class="stat-row">
                            <span class="stat-label">Bye Week:</span>
                            <span class="stat-value">Week ${player.bye_week}</span>
                        </div>
                    ` : ''}
                    ${player.years_exp ? `
                        <div class="stat-row">
                            <span class="stat-label">Experience:</span>
                            <span class="stat-value">${player.years_exp} years</span>
                        </div>
                    ` : ''}
                    ${player.value ? `
                        <div class="stat-row">
                            <span class="stat-label">Value:</span>
                            <span class="stat-value">${player.value}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        content.innerHTML = detailsHtml;
        modal.show();
    }
}

// Export for use in other modules
window.EventHandlers = EventHandlers;
