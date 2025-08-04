/**
 * Event Handlers Module
 * 
 * Handles all user interactions and event listeners
 */

class EventHandlers {
    constructor(apiService, uiUtils, draftBoard, queueManager, teamAnalysis, customRankings, mobileEnhancements) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        this.draftBoard = draftBoard;
        this.queueManager = queueManager;
        this.teamAnalysis = teamAnalysis;
        this.customRankings = customRankings;
        this.mobileEnhancements = mobileEnhancements;
        this.urlManager = new URLManager();
        
        this.state = {
            currentUser: null,
            userLeagues: [],
            selectedLeague: null,
            selectedDraft: null,
            autoRefreshEnabled: false,
            autoRefreshInterval: null,
            vbdEnabled: false,
            lastUpdate: 0,
            draftUpdates: null,
            currentFilters: {}, // Add filter state
            isLoadingAvailablePlayers: false // Prevent concurrent requests
        };
        
        // Setup URL navigation handler
        this.urlManager.setupPopstateHandler((params) => {
            this.handleUrlNavigation(params);
        });
        
        // Check for auto-load from URL on initialization
        setTimeout(() => {
            this.checkAutoLoadFromUrl();
        }, 1000);
    }

    /**
     * Check if we should auto-load from URL parameters
     */
    async checkAutoLoadFromUrl() {
        const params = this.urlManager.getParams();
        
        if (params.username) {
            console.log('🔗 Auto-loading from URL:', params);
            
            // Set username in input
            const usernameInput = document.getElementById('username-input');
            if (usernameInput) {
                usernameInput.value = params.username;
            }
            
            // Load user data
            try {
                await this.loadUserData(params.username);
                
                if (params.league_id && params.draft_id) {
                    // Direct to draft
                    const league = this.state.userLeagues.find(l => l.league_id === params.league_id);
                    if (league) {
                        this.state.selectedLeague = league;
                        this.state.selectedDraft = { draft_id: params.draft_id };
                        this.uiUtils.showSection('draft');
                        return;
                    }
                }
                
                if (params.league_id) {
                    // Show league selection with pre-selected league
                    this.showLeagueSelection(params.league_id);
                    return;
                }
                
                // Show league selection
                this.showLeagueSelection();
                
            } catch (error) {
                console.error('Auto-load failed:', error);
                this.uiUtils.showNotification('Failed to load from URL: ' + error.message, 'warning');
            }
        }
    }
    
    /**
     * Handle URL navigation (back/forward buttons)
     */
    async handleUrlNavigation(params) {
        console.log('🔗 Handling URL navigation:', params);
        
        if (!params.username) {
            this.uiUtils.showSection('welcome');
            return;
        }
        
        // Load user if not already loaded
        if (!this.state.currentUser || this.state.currentUser.username !== params.username) {
            try {
                await this.loadUserData(params.username);
            } catch (error) {
                this.uiUtils.showNotification('Failed to load user: ' + error.message, 'danger');
                return;
            }
        }
        
        // Navigate to appropriate section
        if (params.draft_id && params.league_id) {
            const league = this.state.userLeagues.find(l => l.league_id === params.league_id);
            if (league) {
                this.state.selectedLeague = league;
                this.state.selectedDraft = { draft_id: params.draft_id };
                this.uiUtils.showSection('draft');
            }
        } else if (params.section === 'league-select' || this.state.userLeagues.length > 0) {
            this.showLeagueSelection(params.league_id);
        } else {
            this.uiUtils.showSection('user-setup');
        }
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
        
        // Draft view event listeners
        this.setupDraftEventListeners();
        
        // Tab navigation
        this.setupTabNavigation();
        
        // Initialize team analysis
        this.teamAnalysis.init();
        
        // Initialize custom rankings
        this.customRankings.init();
        
        // Initialize mobile enhancements
        this.mobileEnhancements.init();
        
        // Initialize keyboard shortcuts (after other modules)
        if (window.app && window.app.keyboardShortcuts) {
            window.app.keyboardShortcuts.init();
            
            // Setup shortcuts help button
            const shortcutsBtn = document.getElementById('shortcuts-help-btn');
            if (shortcutsBtn) {
                shortcutsBtn.addEventListener('click', () => {
                    window.app.keyboardShortcuts.showHelp();
                });
            }
        }
        
        console.log('🎯 Event listeners setup complete');
    }

    /**
     * Setup main navigation buttons
     */
    setupNavigationButtons() {
        // Tab navigation for landing page
        const leaguesTab = document.getElementById('leagues-tab');
        const mockDraftTab = document.getElementById('mock-draft-tab');
        const leaguesContent = document.getElementById('leagues-tab-content');
        const mockDraftContent = document.getElementById('mock-draft-tab-content');
        
        if (leaguesTab && mockDraftTab) {
            console.log('✅ Setting up landing page tab navigation');
            leaguesTab.addEventListener('click', () => {
                leaguesTab.classList.add('active');
                mockDraftTab.classList.remove('active');
                leaguesContent.style.display = 'block';
                mockDraftContent.style.display = 'none';
            });
            
            mockDraftTab.addEventListener('click', () => {
                mockDraftTab.classList.add('active');
                leaguesTab.classList.remove('active');
                mockDraftContent.style.display = 'block';
                leaguesContent.style.display = 'none';
            });
        }
        
        // Legacy buttons (for backward compatibility)
        const getStartedBtn = document.getElementById('get-started-btn');
        if (getStartedBtn) {
            console.log('✅ Setting up get-started-btn listener');
            getStartedBtn.addEventListener('click', () => {
                console.log('🚀 Get Started clicked - showing user setup');
                this.uiUtils.showSection('user-setup');
            });
        }
        
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            console.log('✅ Setting up test-connection-btn listener');
            testConnectionBtn.addEventListener('click', () => {
                console.log('🔌 Test Connection clicked');
                this.handleTestConnection();
            });
        }

        const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
        if (backToWelcomeBtn) {
            console.log('✅ Setting up back-to-welcome-btn listener');
            backToWelcomeBtn.addEventListener('click', () => {
                console.log('⬅️ Back to welcome clicked');
                this.urlManager.clearParams();
                this.uiUtils.showSection('welcome');
            });
        }
        
        // League selection buttons
        const backToUserBtn = document.getElementById('back-to-user-btn');
        if (backToUserBtn) {
            console.log('✅ Setting up back-to-user-btn listener');
            backToUserBtn.addEventListener('click', () => {
                console.log('⬅️ Back to user setup clicked');
                this.uiUtils.showSection('user-setup');
            });
        }
        
        const refreshLeaguesBtn = document.getElementById('refresh-leagues-btn');
        if (refreshLeaguesBtn) {
            console.log('✅ Setting up refresh-leagues-btn listener');
            refreshLeaguesBtn.addEventListener('click', () => {
                console.log('🔄 Refresh leagues clicked');
                this.handleRefreshLeagues();
            });
        }
    }

    /**
     * Setup user form interactions
     */
    setupUserForm() {
        // New landing page form
        const userSearchForm = document.getElementById('user-search-form');
        const usernameInput = document.getElementById('username-input');
        const seasonSelect = document.getElementById('season-select');
        const loadUserBtn = document.getElementById('load-user-btn');
        
        if (userSearchForm && usernameInput && loadUserBtn) {
            console.log('✅ Setting up new user search form');
            
            userSearchForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = usernameInput.value.trim();
                const season = seasonSelect.value;
                
                if (username) {
                    await this.handleUserSearch(username, season);
                }
            });
            
            // Season change handler
            if (seasonSelect) {
                seasonSelect.addEventListener('sl-change', async (e) => {
                    const username = usernameInput.value.trim();
                    if (username) {
                        await this.handleUserSearch(username, e.target.value);
                    }
                });
            }
        }
        
        // Mock draft form
        const mockDraftForm = document.getElementById('mock-draft-form');
        const mockDraftId = document.getElementById('mock-draft-id');
        const connectButton = document.getElementById('connect-mock-draft-btn');
        
        if (mockDraftForm && mockDraftId && connectButton) {
            console.log('✅ Setting up mock draft form');
            
            mockDraftForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const draftId = mockDraftId.value.trim();
                
                if (draftId) {
                    await this.handleMockDraftConnect(draftId);
                }
            });
        }
        
        // Legacy form (for backward compatibility)
        const legacyLoadUserBtn = document.getElementById('load-user-btn-legacy');
        if (legacyLoadUserBtn) {
            console.log('✅ Setting up legacy load-user-btn listener');
            legacyLoadUserBtn.addEventListener('click', () => {
                console.log('👤 Load user clicked');
                this.handleLoadUser();
            });
        }

        const legacyUsernameInput = document.getElementById('username-input-legacy');
        if (legacyUsernameInput) {
            console.log('✅ Setting up legacy username-input listeners');
            legacyUsernameInput.addEventListener('sl-input', (event) => {
                const loadButton = document.getElementById('load-user-btn-legacy');
                if (loadButton) {
                    loadButton.disabled = !event.target.value.trim();
                }
            });
            
            legacyUsernameInput.addEventListener('keydown', (event) => {
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
        
        // VBD toggle
        const vbdToggle = document.getElementById('vbd-toggle');
        if (vbdToggle) {
            console.log('✅ Setting up vbd-toggle listener');
            vbdToggle.addEventListener('sl-change', (event) => {
                this.handleVBDToggle(event.target.checked);
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
            await this.loadUserData(username);
            this.urlManager.setUsername(username);
            this.showLeagueSelection();
            
        } catch (error) {
            this.uiUtils.showNotification('Failed to load user data: ' + error.message, 'danger');
        } finally {
            if (loadButton) loadButton.loading = false;
        }
    }
    
    /**
     * Load user data (separated for reuse)
     */
    async loadUserData(username) {
        // Load user data
        const userData = await this.apiService.getUser(username);
        this.state.currentUser = userData.user;
        
        // Load user leagues
        const leaguesData = await this.apiService.getUserLeagues(username);
        this.state.userLeagues = leaguesData.leagues;
        
        this.uiUtils.showNotification(`Loaded ${leaguesData.leagues.length} leagues for ${username}`, 'success');
    }
    
    /**
     * Show league selection screen
     */
    showLeagueSelection(preSelectedLeagueId = null) {
        this.uiUtils.showSection('league-select');
        this.renderLeagueList(preSelectedLeagueId);
        
        // Update subtitle
        const subtitle = document.getElementById('league-select-subtitle');
        if (subtitle && this.state.currentUser) {
            subtitle.textContent = `Choose a league for ${this.state.currentUser.display_name || this.state.currentUser.username}`;
        }
    }
    
    /**
     * Render the league list
     */
    renderLeagueList(preSelectedLeagueId = null) {
        const leagueList = document.getElementById('league-list');
        if (!leagueList) return;
        
        if (!this.state.userLeagues || this.state.userLeagues.length === 0) {
            leagueList.innerHTML = `
                <div class="league-empty-state">
                    <sl-icon name="inbox"></sl-icon>
                    <h3>No Leagues Found</h3>
                    <p>This user doesn't have any leagues for the current season.</p>
                </div>
            `;
            return;
        }
        
        leagueList.innerHTML = '';
        
        this.state.userLeagues.forEach(league => {
            const leagueItem = document.createElement('div');
            leagueItem.className = 'league-item';
            if (league.league_id === preSelectedLeagueId) {
                leagueItem.classList.add('selected');
            }
            
            const hasDraft = !!league.draft_id;
            const statusClass = hasDraft ? 'has-draft' : 'no-draft';
            const statusIcon = hasDraft ? 'check-circle' : 'clock';
            const statusText = hasDraft ? 'Draft Available' : 'No Active Draft';
            
            leagueItem.innerHTML = `
                <div class="league-info">
                    <div class="league-name">${league.name || 'Unnamed League'}</div>
                    <div class="league-details">
                        <span>👥 ${league.total_rosters || 'Unknown'} teams</span>
                        <span>🏈 ${league.settings?.type || 'Standard'}</span>
                        <span>📊 ${league.scoring_settings?.rec || 0} PPR</span>
                    </div>
                    <div class="league-status ${statusClass}">
                        <sl-icon name="${statusIcon}"></sl-icon>
                        ${statusText}
                    </div>
                </div>
            `;
            
            // Add click handler
            leagueItem.addEventListener('click', () => {
                this.handleLeagueSelect(league);
            });
            
            leagueList.appendChild(leagueItem);
        });
    }
    
    /**
     * Handle league selection
     */
    async handleLeagueSelect(league) {
        if (!league.draft_id) {
            this.uiUtils.showNotification('This league does not have an active draft', 'warning');
            return;
        }
        
        try {
            this.state.selectedLeague = league;
            this.state.selectedDraft = { draft_id: league.draft_id };
            
            // Update URL
            this.urlManager.setDraft(
                this.state.currentUser.username,
                league.league_id,
                league.draft_id
            );
            
            // Initialize team analysis with draft ID
            this.teamAnalysis.setDraftId(league.draft_id);
            
            // Show draft section
            this.uiUtils.showSection('draft');
            
            this.uiUtils.showNotification(`Selected league: ${league.name}`, 'success');
            
        } catch (error) {
            this.uiUtils.showNotification('Failed to select league: ' + error.message, 'danger');
        }
    }
    
    /**
     * Handle refresh leagues button
     */
    async handleRefreshLeagues() {
        if (!this.state.currentUser) {
            this.uiUtils.showNotification('No user loaded', 'warning');
            return;
        }
        
        const refreshBtn = document.getElementById('refresh-leagues-btn');
        if (refreshBtn) refreshBtn.loading = true;
        
        try {
            await this.loadUserData(this.state.currentUser.username);
            this.renderLeagueList();
            this.uiUtils.showNotification('Leagues refreshed successfully', 'success');
            
        } catch (error) {
            this.uiUtils.showNotification('Failed to refresh leagues: ' + error.message, 'danger');
        } finally {
            if (refreshBtn) refreshBtn.loading = false;
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
     * Handle VBD toggle change
     */
    handleVBDToggle(enabled) {
        console.log(`🎯 VBD toggle ${enabled ? 'enabled' : 'disabled'}`);
        
        // Store VBD preference
        this.state.vbdEnabled = enabled;
        
        // Refresh available players with VBD data (only if not already loading)
        if (!this.state.isLoadingAvailablePlayers) {
            this.applyFiltersAndSearch();
        }
        
        // Show notification
        this.uiUtils.showNotification(
            `VBD values ${enabled ? 'enabled' : 'disabled'}`, 
            'success'
        );
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
                this.queueManager.updateQueueDisplay();
                break;
            case 'team-analysis':
                if (this.state.selectedDraft?.draft_id) {
                    this.teamAnalysis.loadTeamAnalysis(this.state.selectedDraft.draft_id);
                }
                break;
            case 'custom-rankings':
                this.customRankings.loadUserRankings();
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
        
        // Only apply if not already loading
        if (!this.state.isLoadingAvailablePlayers) {
            this.applyFiltersAndSearch();
        }
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
            // Only apply if not already loading
            if (!this.state.isLoadingAvailablePlayers) {
                this.applyFiltersAndSearch();
            }
        }, 500); // Increased delay to 500ms
    }
    
    /**
     * Apply current filters and search to available players
     */
    async applyFiltersAndSearch() {
        if (!this.state.selectedDraft?.draft_id) {
            return;
        }
        
        // Prevent multiple concurrent requests
        if (this.state.isLoadingAvailablePlayers) {
            console.log('⚠️ Already loading available players, skipping request');
            return;
        }
        
        try {
            // Set loading flag
            this.state.isLoadingAvailablePlayers = true;
            
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
            
            // Add VBD parameter if enabled
            if (this.state.vbdEnabled) {
                params.append('include_vbd', 'true');
            }
            
            console.log(`🔍 Loading available players with filters:`, Object.fromEntries(params));
            
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
            // Clear loading flag
            this.state.isLoadingAvailablePlayers = false;
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
            
            // Add queue button listeners
            const queueBtn = card.querySelector('.add-to-queue-btn');
            if (queueBtn) {
                queueBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click
                    const playerId = card.dataset.playerId;
                    const player = players.find(p => p.player_id === playerId);
                    if (player) {
                        this.queueManager.addPlayer(player);
                    }
                });
            }
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
                    ${player.vbd_value !== undefined ? `
                        <div class="stat-item vbd-stat">
                            <span class="stat-label">VBD</span>
                            <span class="stat-value ${player.vbd_value > 0 ? 'positive' : 'negative'}">
                                ${player.vbd_value > 0 ? '+' : ''}${player.vbd_value.toFixed(1)}
                            </span>
                        </div>
                    ` : ''}
                    ${player.vbd_rank ? `
                        <div class="stat-item vbd-stat">
                            <span class="stat-label">VBD Rank</span>
                            <span class="stat-value">#${player.vbd_rank}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div slot="footer">
                    <sl-button-group>
                        <sl-button variant="primary" size="small" class="add-to-queue-btn">
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
    
    /**
     * Handle user search from new landing page
     */
    async handleUserSearch(username, season = '2025') {
        console.log(`🔍 Searching for user: ${username}, season: ${season}`);
        
        const loadButton = document.getElementById('load-user-btn');
        
        try {
            // Show loading state
            if (loadButton) loadButton.loading = true;
            this.hideError();
            
            // Fetch user data
            const userData = await this.apiService.request(`/user/${username}`);
            
            if (userData.status === 'success' && userData.user) {
                // Display user info
                this.displayUserInfo(userData.user);
                
                // Fetch leagues for the season
                const leaguesData = await this.apiService.request(`/user/${username}/leagues?season=${season}`);
                
                if (leaguesData.status === 'success' && leaguesData.leagues) {
                    this.displayLeagues(leaguesData.leagues, season);
                } else {
                    this.showError(leaguesData.error || 'Failed to load leagues');
                }
            } else {
                this.showError(userData.error || 'User not found');
            }
            
        } catch (error) {
            console.error('❌ User search failed:', error);
            this.showError('Failed to search for user. Please try again.');
        } finally {
            if (loadButton) loadButton.loading = false;
        }
    }
    
    /**
     * Display user information
     */
    displayUserInfo(user) {
        const userInfoDiv = document.getElementById('user-info');
        const avatarImg = document.getElementById('user-avatar-img');
        const avatarIcon = document.getElementById('user-avatar-icon');
        const displayName = document.getElementById('user-display-name');
        const username = document.getElementById('user-username');
        
        if (userInfoDiv && displayName && username) {
            // Show user info
            userInfoDiv.style.display = 'block';
            
            // Set user details
            displayName.textContent = user.display_name || user.username;
            username.textContent = `@${user.username}`;
            
            // Handle avatar
            if (user.avatar && avatarImg && avatarIcon) {
                avatarImg.src = `https://sleepercdn.com/avatars/thumbs/${user.avatar}`;
                avatarImg.style.display = 'block';
                avatarIcon.style.display = 'none';
            } else if (avatarIcon) {
                avatarIcon.style.display = 'block';
                if (avatarImg) avatarImg.style.display = 'none';
            }
            
            // Store user data
            this.state.currentUser = user;
        }
    }
    
    /**
     * Display leagues list
     */
    displayLeagues(leagues, season) {
        const leaguesSection = document.getElementById('leagues-section');
        const leaguesList = document.getElementById('leagues-list');
        const emptyState = document.getElementById('leagues-empty');
        const emptyMessage = document.getElementById('empty-message');
        const leagueCount = document.getElementById('user-league-count');
        
        // Update league count
        if (leagueCount) {
            leagueCount.textContent = `${leagues.length} leagues found for ${season}`;
        }
        
        if (leagues.length > 0) {
            // Show leagues section
            if (leaguesSection) leaguesSection.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            
            // Clear existing leagues
            if (leaguesList) leaguesList.innerHTML = '';
            
            // Sort leagues by draft status
            const sortedLeagues = this.sortLeaguesByDraftStatus(leagues);
            
            // Create league cards
            sortedLeagues.forEach(league => {
                const leagueCard = this.createLeagueCard(league);
                if (leaguesList) leaguesList.appendChild(leagueCard);
            });
            
            // Store leagues data
            this.state.userLeagues = leagues;
            
        } else {
            // Show empty state
            if (leaguesSection) leaguesSection.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            
            if (emptyMessage) {
                emptyMessage.textContent = `No leagues found for ${this.state.currentUser?.display_name || 'this user'} in the ${season} season.`;
            }
        }
    }
    
    /**
     * Create a league card element
     */
    createLeagueCard(league) {
        const card = document.createElement('div');
        card.className = 'league-card';
        
        // Check if league has active draft
        const hasActiveDraft = league.drafts && league.drafts.some(draft => draft.status === 'drafting');
        if (hasActiveDraft) {
            card.classList.add('active-draft');
        }
        
        // League header
        const header = document.createElement('div');
        header.className = 'league-header';
        
        const titleRow = document.createElement('div');
        titleRow.className = 'league-title-row';
        
        const titleLeft = document.createElement('div');
        titleLeft.className = 'league-title-left';
        
        const title = document.createElement('h4');
        title.textContent = league.name;
        titleLeft.appendChild(title);
        
        // League type badge
        const badge = document.createElement('div');
        badge.className = `league-badge ${this.isDynastyOrKeeperLeague(league) ? 'dynasty' : 'redraft'}`;
        
        if (this.isDynastyOrKeeperLeague(league)) {
            badge.innerHTML = '<sl-icon name="crown"></sl-icon><span>Dynasty/Keeper</span>';
        } else {
            badge.innerHTML = '<sl-icon name="arrow-clockwise"></sl-icon><span>Redraft</span>';
        }
        titleLeft.appendChild(badge);
        
        titleRow.appendChild(titleLeft);
        
        // League meta info
        const meta = document.createElement('div');
        meta.className = 'league-meta';
        meta.innerHTML = `
            <sl-icon name="people-fill"></sl-icon>
            <span>${league.total_rosters} teams</span>
        `;
        titleRow.appendChild(meta);
        
        header.appendChild(titleRow);
        
        // League description
        const description = document.createElement('p');
        description.className = 'league-description';
        description.textContent = `${league.settings?.type || 'Standard'} • Season ${league.season}`;
        header.appendChild(description);
        
        card.appendChild(header);
        
        // Drafts section
        if (league.drafts && league.drafts.length > 0) {
            const draftsSection = document.createElement('div');
            draftsSection.className = 'drafts-section';
            
            const draftsTitle = document.createElement('h5');
            draftsTitle.textContent = 'Available Drafts:';
            draftsSection.appendChild(draftsTitle);
            
            league.drafts.forEach(draft => {
                const draftItem = this.createDraftItem(league, draft);
                draftsSection.appendChild(draftItem);
            });
            
            card.appendChild(draftsSection);
        }
        
        return card;
    }
    
    /**
     * Create a draft item element
     */
    createDraftItem(league, draft) {
        const item = document.createElement('div');
        item.className = 'draft-item';
        
        const draftInfo = document.createElement('div');
        draftInfo.className = 'draft-info';
        
        // Status icon
        const statusIcon = document.createElement('div');
        statusIcon.className = 'draft-status-icon';
        statusIcon.textContent = this.getDraftStatusIcon(draft.status);
        draftInfo.appendChild(statusIcon);
        
        // Draft details
        const details = document.createElement('div');
        details.className = 'draft-details';
        
        const title = document.createElement('h6');
        title.textContent = draft.type === 'snake' ? 'Snake Draft' : draft.type;
        details.appendChild(title);
        
        const time = document.createElement('p');
        time.className = 'draft-time';
        time.textContent = draft.start_time ? 
            new Date(draft.start_time).toLocaleString() : 
            'Start time TBD';
        details.appendChild(time);
        
        draftInfo.appendChild(details);
        item.appendChild(draftInfo);
        
        // Status badge and select button
        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.alignItems = 'center';
        rightSide.style.gap = '0.5rem';
        
        const statusBadge = document.createElement('div');
        statusBadge.className = `draft-status-badge ${draft.status}`;
        statusBadge.textContent = draft.status.replace('_', ' ');
        rightSide.appendChild(statusBadge);
        
        const selectButton = document.createElement('sl-button');
        selectButton.variant = 'primary';
        selectButton.size = 'small';
        selectButton.innerHTML = '<sl-icon slot="prefix" name="play-fill"></sl-icon>Select Draft';
        
        selectButton.addEventListener('click', () => {
            this.handleNewDraftSelect(league, draft);
        });
        
        rightSide.appendChild(selectButton);
        item.appendChild(rightSide);
        
        return item;
    }
    
    /**
     * Handle draft selection from new landing page
     */
    async handleNewDraftSelect(league, draft) {
        console.log('🎯 Draft selected:', { league: league.league_id, draft: draft.draft_id });
        
        try {
            // Store selected draft info
            this.state.selectedLeague = league;
            this.state.selectedDraft = draft;
            
            // Show loading overlay
            this.uiUtils.showLoadingOverlay('Loading draft data...');
            
            // Load draft data
            const draftData = await this.apiService.request(`/draft/${draft.draft_id}`);
            
            if (draftData.status === 'success') {
                // Switch to draft view
                this.showDraftSection();
                
                // Initialize draft data
                await this.loadDraftData();
                
            } else {
                this.uiUtils.showNotification('Failed to load draft data: ' + draftData.message, 'danger');
            }
            
        } catch (error) {
            console.error('❌ Failed to select draft:', error);
            this.uiUtils.showNotification('Failed to load draft. Please try again.', 'danger');
        } finally {
            this.uiUtils.hideLoadingOverlay();
        }
    }
    
    /**
     * Handle mock draft connection
     */
    async handleMockDraftConnect(draftId) {
        console.log('🎯 Connecting to mock draft:', draftId);
        
        const connectButton = document.getElementById('connect-mock-draft-btn');
        
        // Validate draft ID
        if (!draftId.match(/^\d+$/)) {
            this.showMockDraftError('Draft ID must be numeric');
            return;
        }
        
        try {
            // Show loading state
            if (connectButton) connectButton.loading = true;
            this.hideMockDraftError();
            
            // Create mock draft object
            const mockDraft = {
                draft_id: draftId,
                type: 'snake',
                status: 'drafting'
            };
            
            const mockLeague = {
                league_id: 'mock',
                name: `Mock Draft ${draftId}`,
                total_rosters: 12,
                season: '2025'
            };
            
            // Handle as regular draft selection
            await this.handleNewDraftSelect(mockLeague, mockDraft);
            
        } catch (error) {
            console.error('❌ Mock draft connection failed:', error);
            this.showMockDraftError('Network error while connecting to mock draft');
        } finally {
            if (connectButton) connectButton.loading = false;
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('user-error');
        const errorText = document.getElementById('user-error-text');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    /**
     * Hide error message
     */
    hideError() {
        const errorDiv = document.getElementById('user-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    /**
     * Show mock draft error
     */
    showMockDraftError(message) {
        const errorDiv = document.getElementById('mock-draft-error');
        const errorText = document.getElementById('mock-draft-error-text');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    /**
     * Hide mock draft error
     */
    hideMockDraftError() {
        const errorDiv = document.getElementById('mock-draft-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    /**
     * Sort leagues by draft status priority
     */
    sortLeaguesByDraftStatus(leagues) {
        return [...leagues].sort((a, b) => {
            const getLeaguePriority = (league) => {
                if (!league.drafts || league.drafts.length === 0) return 4;
                
                const priorities = league.drafts.map(draft => this.getDraftStatusPriority(draft.status));
                return Math.min(...priorities);
            };
            
            const priorityA = getLeaguePriority(a);
            const priorityB = getLeaguePriority(b);
            
            return priorityA - priorityB;
        });
    }
    
    /**
     * Get draft status priority for sorting
     */
    getDraftStatusPriority(status) {
        switch (status) {
            case 'drafting': return 1;
            case 'pre_draft': return 2;
            case 'complete': return 3;
            default: return 4;
        }
    }
    
    /**
     * Get draft status icon
     */
    getDraftStatusIcon(status) {
        switch (status) {
            case 'complete': return '✅';
            case 'drafting': return '🔴';
            case 'pre_draft': return '⏳';
            default: return '❓';
        }
    }
    
    /**
     * Check if league is dynasty or keeper
     */
    isDynastyOrKeeperLeague(league) {
        const settings = league.settings || {};
        
        if (settings.type === 2) return true;
        if (settings.taxi_slots > 0) return true;
        if (settings.max_keepers > 1) return true;
        
        if (league.previous_league_id) {
            if (settings.max_keepers > 1 || settings.taxi_slots > 0 || settings.type === 2) {
                return true;
            }
        }
        
        if (league.drafts && league.drafts.length > 0) {
            const draft = league.drafts[0];
            if (draft.metadata && draft.metadata.scoring_type && 
                draft.metadata.scoring_type.includes('dynasty')) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Setup draft-specific event listeners
     */
    setupDraftEventListeners() {
        // Roster toggle
        const rosterToggleBtn = document.getElementById('roster-toggle-btn');
        if (rosterToggleBtn) {
            rosterToggleBtn.addEventListener('click', () => {
                this.handleRosterToggle();
            });
        }
        
        // Draft refresh
        const refreshDraftBtn = document.getElementById('refresh-draft-btn');
        if (refreshDraftBtn) {
            refreshDraftBtn.addEventListener('click', () => {
                this.handleDraftRefresh();
            });
        }
        
        // Settings modal
        const settingsBtn = document.getElementById('draft-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.handleSettingsModal();
            });
        }
        
        // Rankings manager
        const rankingsBtn = document.getElementById('rankings-manager-btn');
        if (rankingsBtn) {
            rankingsBtn.addEventListener('click', () => {
                this.handleRankingsModal();
            });
        }
        
        // Connection retry
        const retryBtn = document.getElementById('connection-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.handleConnectionRetry();
            });
        }
        
        // League selector dropdown
        const leagueDropdown = document.getElementById('league-selector-dropdown');
        if (leagueDropdown) {
            leagueDropdown.addEventListener('sl-select', (e) => {
                this.handleLeagueSelect(e.detail.item.value);
            });
        }
    }
    
    /**
     * Handle roster sidebar toggle
     */
    handleRosterToggle() {
        const sidebar = document.getElementById('roster-sidebar');
        const mainContent = document.getElementById('draft-main-content');
        const toggleText = document.getElementById('roster-toggle-text');
        
        if (sidebar && mainContent && toggleText) {
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                sidebar.classList.remove('open');
                mainContent.classList.remove('roster-open');
                toggleText.textContent = 'Show My Roster';
            } else {
                sidebar.classList.add('open');
                mainContent.classList.add('roster-open');
                toggleText.textContent = 'Hide My Roster';
                
                // Load roster data if not already loaded
                this.loadRosterData();
            }
            
            // Save state to localStorage
            localStorage.setItem('rosterSidebarOpen', JSON.stringify(!isOpen));
        }
    }
    
    /**
     * Handle draft refresh
     */
    async handleDraftRefresh() {
        const refreshBtn = document.getElementById('refresh-draft-btn');
        
        try {
            if (refreshBtn) refreshBtn.loading = true;
            
            // Refresh draft data
            await this.loadDraftData();
            
            this.uiUtils.showNotification('Draft data refreshed successfully', 'success');
            
        } catch (error) {
            console.error('❌ Failed to refresh draft:', error);
            this.uiUtils.showNotification('Failed to refresh draft data', 'danger');
        } finally {
            if (refreshBtn) refreshBtn.loading = false;
        }
    }
    
    /**
     * Handle settings modal
     */
    handleSettingsModal() {
        // TODO: Implement settings modal
        this.uiUtils.showNotification('Settings modal coming soon!', 'primary');
    }
    
    /**
     * Handle rankings modal
     */
    handleRankingsModal() {
        // TODO: Implement rankings modal
        this.uiUtils.showNotification('Rankings manager coming soon!', 'primary');
    }
    
    /**
     * Handle connection retry
     */
    async handleConnectionRetry() {
        const statusDiv = document.getElementById('connection-status');
        
        try {
            // Hide error status
            if (statusDiv) statusDiv.style.display = 'none';
            
            // Attempt to refresh data
            await this.loadDraftData();
            
            this.uiUtils.showNotification('Connection restored', 'success');
            
        } catch (error) {
            console.error('❌ Connection retry failed:', error);
            this.showConnectionError('Connection retry failed');
        }
    }
    
    /**
     * Handle league selection from dropdown
     */
    async handleLeagueSelect(leagueData) {
        try {
            const { leagueId, draftId } = JSON.parse(leagueData);
            
            // Find the league and draft objects
            const league = this.state.userLeagues.find(l => l.league_id === leagueId);
            const draft = league?.drafts?.find(d => d.draft_id === draftId);
            
            if (league && draft) {
                await this.handleNewDraftSelect(league, draft);
            }
            
        } catch (error) {
            console.error('❌ Failed to select league:', error);
            this.uiUtils.showNotification('Failed to switch league', 'danger');
        }
    }
    
    /**
     * Load draft data and update UI
     */
    async loadDraftData() {
        if (!this.state.selectedDraft) {
            console.warn('No draft selected');
            return;
        }
        
        try {
            // Update draft header info
            this.updateDraftHeader();
            
            // Load position data
            const positionData = await this.apiService.request(`/draft/${this.state.selectedDraft.draft_id}/available-players`);
            
            if (positionData.status === 'success') {
                this.displayPositionGrid(positionData.players);
                this.updateDraftStats(positionData);
            }
            
            // Update last updated time
            this.updateLastUpdatedTime();
            
        } catch (error) {
            console.error('❌ Failed to load draft data:', error);
            this.showConnectionError('Failed to load draft data');
            throw error;
        }
    }
    
    /**
     * Update draft header information
     */
    updateDraftHeader() {
        const usernameEl = document.getElementById('draft-username');
        const statusEl = document.getElementById('draft-status');
        const statusIconEl = document.getElementById('draft-status-icon');
        const statusTextEl = document.getElementById('draft-status-text');
        const leagueNameEl = document.getElementById('current-league-name');
        const dynastyIndicator = document.getElementById('dynasty-indicator');
        
        if (this.state.currentUser && usernameEl) {
            usernameEl.textContent = `@${this.state.currentUser.username}`;
        }
        
        if (this.state.selectedDraft && statusEl) {
            const status = this.state.selectedDraft.status || 'unknown';
            const statusClass = status.replace('_', ' ');
            
            statusEl.className = `draft-status ${status}`;
            
            if (statusIconEl) statusIconEl.textContent = this.getDraftStatusIcon(status);
            if (statusTextEl) statusTextEl.textContent = statusClass;
        }
        
        if (this.state.selectedLeague && leagueNameEl) {
            leagueNameEl.textContent = this.state.selectedLeague.name;
            
            // Show dynasty indicator if applicable
            if (dynastyIndicator) {
                const isDynasty = this.isDynastyOrKeeperLeague(this.state.selectedLeague);
                dynastyIndicator.style.display = isDynasty ? 'flex' : 'none';
            }
        }
    }
    
    /**
     * Display position grid with players
     */
    displayPositionGrid(players) {
        const gridEl = document.getElementById('position-grid');
        if (!gridEl || !players) return;
        
        // Group players by position
        const playersByPosition = {};
        players.forEach(player => {
            const position = player.position || 'UNKNOWN';
            if (!playersByPosition[position]) {
                playersByPosition[position] = [];
            }
            playersByPosition[position].push(player);
        });
        
        // Clear existing content
        gridEl.innerHTML = '';
        
        // Create position sections
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
        positions.forEach(position => {
            const positionPlayers = playersByPosition[position] || [];
            if (positionPlayers.length > 0) {
                const sectionEl = this.createPositionSection(position, positionPlayers);
                gridEl.appendChild(sectionEl);
            }
        });
    }
    
    /**
     * Create a position section element
     */
    createPositionSection(position, players) {
        const section = document.createElement('div');
        section.className = 'position-section';
        
        // Header
        const header = document.createElement('div');
        header.className = 'position-header';
        
        const title = document.createElement('h3');
        title.className = 'position-title';
        title.textContent = this.getPositionName(position);
        
        const count = document.createElement('span');
        count.className = 'position-count';
        count.textContent = players.length;
        
        header.appendChild(title);
        header.appendChild(count);
        section.appendChild(header);
        
        // Players list
        const playersList = document.createElement('div');
        playersList.className = 'position-players';
        
        players.slice(0, 20).forEach(player => { // Show top 20 players
            const playerCard = this.createPlayerCard(player);
            playersList.appendChild(playerCard);
        });
        
        section.appendChild(playersList);
        return section;
    }
    
    /**
     * Create a player card element
     */
    createPlayerCard(player) {
        const card = document.createElement('div');
        card.className = 'player-card';
        
        const info = document.createElement('div');
        info.className = 'player-info';
        
        const details = document.createElement('div');
        details.className = 'player-details';
        
        const name = document.createElement('h4');
        name.className = 'player-name';
        name.textContent = player.full_name || player.name;
        
        const meta = document.createElement('p');
        meta.className = 'player-meta';
        meta.textContent = `${player.team || 'FA'} • ${player.position}`;
        
        details.appendChild(name);
        details.appendChild(meta);
        info.appendChild(details);
        
        const actions = document.createElement('div');
        actions.className = 'player-actions';
        
        if (player.rank) {
            const rank = document.createElement('span');
            rank.className = 'player-rank';
            rank.textContent = `#${player.rank}`;
            actions.appendChild(rank);
        }
        
        const queueBtn = document.createElement('sl-button');
        queueBtn.variant = 'neutral';
        queueBtn.size = 'small';
        queueBtn.innerHTML = '<sl-icon name="plus"></sl-icon>';
        queueBtn.addEventListener('click', () => {
            this.handleAddToQueue(player);
        });
        
        actions.appendChild(queueBtn);
        info.appendChild(actions);
        card.appendChild(info);
        
        return card;
    }
    
    /**
     * Update draft statistics
     */
    updateDraftStats(data) {
        const availableEl = document.getElementById('available-count');
        const draftedEl = document.getElementById('drafted-count');
        
        if (availableEl && data.available_players) {
            availableEl.textContent = `${data.available_players.length} available`;
        }
        
        if (draftedEl && data.total_drafted) {
            draftedEl.textContent = `${data.total_drafted} drafted`;
        }
    }
    
    /**
     * Show connection error
     */
    showConnectionError(message) {
        const statusDiv = document.getElementById('connection-status');
        const errorText = document.getElementById('connection-error-text');
        
        if (statusDiv && errorText) {
            errorText.textContent = message;
            statusDiv.style.display = 'block';
        }
    }
    
    /**
     * Update last updated time
     */
    updateLastUpdatedTime() {
        const timeEl = document.getElementById('last-updated-time');
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString();
        }
    }
    
    /**
     * Load roster data for sidebar
     */
    async loadRosterData() {
        const rosterContent = document.getElementById('roster-content');
        if (!rosterContent || !this.state.selectedDraft) return;
        
        try {
            rosterContent.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading roster...</p>
                </div>
            `;
            
            // TODO: Implement roster data loading
            // For now, show placeholder
            setTimeout(() => {
                rosterContent.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #64748b;">
                        <p>Roster data coming soon!</p>
                    </div>
                `;
            }, 1000);
            
        } catch (error) {
            console.error('❌ Failed to load roster:', error);
            rosterContent.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #dc2626;">
                    <p>Failed to load roster</p>
                </div>
            `;
        }
    }
    
    /**
     * Get position display name
     */
    getPositionName(position) {
        const names = {
            'QB': 'Quarterback',
            'RB': 'Running Back',
            'WR': 'Wide Receiver',
            'TE': 'Tight End',
            'K': 'Kicker',
            'DEF': 'Defense'
        };
        return names[position] || position;
    }
    
    /**
     * Handle add player to queue
     */
    handleAddToQueue(player) {
        // TODO: Implement queue functionality
        this.uiUtils.showNotification(`Added ${player.full_name || player.name} to queue`, 'success');
    }
    
    /**
     * Show draft section and initialize
     */
    showDraftSection() {
        // Hide other sections
        document.getElementById('welcome-section').style.display = 'none';
        document.getElementById('user-setup-section').style.display = 'none';
        document.getElementById('league-select-section').style.display = 'none';
        
        // Show draft section
        document.getElementById('draft-section').style.display = 'block';
        
        // Initialize roster sidebar state
        const savedState = localStorage.getItem('rosterSidebarOpen');
        if (savedState === 'true') {
            setTimeout(() => this.handleRosterToggle(), 100);
        }
    }
}

// Export for use in other modules
window.EventHandlers = EventHandlers;
