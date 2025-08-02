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
            draftUpdates: null
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
        // TODO: Implement position filtering
    }

    /**
     * Handle player search
     */
    handlePlayerSearch(searchTerm) {
        console.log('Player search:', searchTerm);
        // TODO: Implement player search
    }
}

// Export for use in other modules
window.EventHandlers = EventHandlers;
