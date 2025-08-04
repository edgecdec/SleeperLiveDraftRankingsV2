/**
 * Event Handlers Module - Main Coordinator
 * 
 * Coordinates between specialized handler modules and manages overall application state
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
        
        // Initialize specialized handlers
        this.navigationHandlers = new NavigationHandlers(apiService, uiUtils);
        this.landingHandlers = new LandingHandlers(apiService, uiUtils);
        this.draftHandlers = new DraftHandlers(apiService, uiUtils, draftBoard, queueManager, teamAnalysis);
        this.playerHandlers = new PlayerHandlers(apiService, uiUtils, queueManager, customRankings);
        this.uiHandlers = new UIHandlers(uiUtils, mobileEnhancements);
        
        // Main application state
        this.state = {
            currentUser: null,
            userLeagues: [],
            selectedLeague: null,
            selectedDraft: null,
            isInitialized: false
        };
        
        // Setup cross-handler communication
        this.setupHandlerCommunication();
    }

    /**
     * Setup communication between handlers
     */
    setupHandlerCommunication() {
        // Allow handlers to access each other when needed
        this.navigationHandlers.setLandingHandlers(this.landingHandlers);
        this.landingHandlers.setDraftHandlers(this.draftHandlers);
        this.draftHandlers.setPlayerHandlers(this.playerHandlers);
        
        // Setup event listeners for cross-handler communication
        this.setupCrossHandlerEvents();
    }

    /**
     * Setup events that coordinate between handlers
     */
    setupCrossHandlerEvents() {
        // Listen for user selection from landing handlers
        document.addEventListener('userSelected', (e) => {
            this.handleUserSelected(e.detail);
        });

        // Listen for league selection from landing handlers
        document.addEventListener('leagueSelected', (e) => {
            this.handleLeagueSelected(e.detail);
        });

        // Listen for draft selection from landing handlers
        document.addEventListener('draftSelected', (e) => {
            this.handleDraftSelected(e.detail);
        });

        // Listen for navigation events
        document.addEventListener('navigationRequested', (e) => {
            this.handleNavigationRequest(e.detail);
        });
    }

    /**
     * Initialize all event handlers
     */
    setupEventListeners() {
        console.log('🔧 Setting up modular event handlers...');
        
        try {
            // Initialize all handler modules
            this.navigationHandlers.init();
            this.landingHandlers.init();
            this.draftHandlers.init();
            this.playerHandlers.init();
            this.uiHandlers.init();
            
            // Setup legacy event listeners that haven't been moved yet
            this.setupLegacyEventListeners();
            
            this.state.isInitialized = true;
            console.log('🎯 All event handlers initialized successfully');
            
        } catch (error) {
            console.error('❌ Error setting up event handlers:', error);
            this.uiUtils.showNotification('Failed to initialize event handlers', 'danger');
        }
    }

    /**
     * Setup legacy event listeners that haven't been moved to specialized handlers yet
     */
    setupLegacyEventListeners() {
        // Connection retry button
        const connectionRetryBtn = document.getElementById('connection-retry-btn');
        if (connectionRetryBtn) {
            connectionRetryBtn.addEventListener('click', () => {
                console.log('🔄 Connection retry clicked');
                this.handleConnectionRetry();
            });
        }

        // API info link
        const apiInfoLink = document.getElementById('api-info-link');
        if (apiInfoLink) {
            apiInfoLink.addEventListener('click', () => {
                console.log('ℹ️ API info clicked');
                this.showApiInfo();
            });
        }

        // Player details modal close
        const closePlayerDetails = document.getElementById('close-player-details');
        if (closePlayerDetails) {
            closePlayerDetails.addEventListener('click', () => {
                const modal = document.getElementById('player-details-modal');
                if (modal) modal.hide();
            });
        }
    }

    /**
     * Handle user selection event
     */
    handleUserSelected(userData) {
        console.log('👤 User selected:', userData);
        this.state.currentUser = userData;
        
        // Update UI state
        this.uiUtils.showSection('league-select');
        
        // Notify other handlers
        this.draftHandlers.setCurrentUser(userData);
        this.playerHandlers.setCurrentUser(userData);
    }

    /**
     * Handle league selection event
     */
    handleLeagueSelected(leagueData) {
        console.log('🏆 League selected:', leagueData);
        this.state.selectedLeague = leagueData;
        
        // Notify draft handlers
        this.draftHandlers.setSelectedLeague(leagueData);
    }

    /**
     * Handle draft selection event
     */
    handleDraftSelected(draftData) {
        console.log('🎯 Draft selected:', draftData);
        this.state.selectedDraft = draftData;
        
        // Update handlers with draft data
        this.draftHandlers.setSelectedDraft(draftData);
        this.playerHandlers.loadAvailablePlayers(draftData.draft_id);
        
        // Show draft section
        this.draftHandlers.showDraftSection();
        
        // Initialize draft-specific features
        this.initializeDraftFeatures(draftData);
    }

    /**
     * Handle navigation request event
     */
    handleNavigationRequest(navigationData) {
        console.log('🧭 Navigation requested:', navigationData);
        
        const { type, section, data, params } = navigationData;
        
        if (type === 'updateUrl' && params) {
            // Handle URL update request
            console.log('🔄 Updating URL with params:', params);
            this.navigationHandlers.updateUrl(params);
            return;
        }
        
        switch (section) {
            case 'user-setup':
                this.uiUtils.showSection('user-setup');
                break;
            case 'league-select':
                this.uiUtils.showSection('league-select');
                break;
            case 'draft':
                if (data && data.draft) {
                    this.handleDraftSelected(data.draft);
                }
                break;
            default:
                console.warn('Unknown navigation section:', section);
        }
    }

    /**
     * Initialize draft-specific features
     */
    initializeDraftFeatures(draftData) {
        // Initialize team analysis
        if (this.teamAnalysis) {
            this.teamAnalysis.initializeForDraft(draftData);
        }
        
        // Initialize custom rankings
        if (this.customRankings) {
            this.customRankings.loadForDraft(draftData);
        }
        
        // Initialize draft board
        if (this.draftBoard) {
            this.draftBoard.initializeForDraft(draftData);
        }
        
        // Initialize queue manager
        if (this.queueManager) {
            this.queueManager.initializeForDraft(draftData);
        }
    }

    /**
     * Handle connection retry
     */
    async handleConnectionRetry() {
        try {
            this.uiUtils.showNotification('Retrying connection...', 'info');
            
            // Test API connection
            const response = await this.apiService.testConnection();
            
            if (response.status === 'success') {
                this.uiUtils.showNotification('Connection restored', 'success');
                this.updateConnectionStatus(true);
            } else {
                throw new Error('Connection test failed');
            }
        } catch (error) {
            console.error('❌ Connection retry failed:', error);
            this.uiUtils.showNotification('Connection retry failed', 'danger');
            this.updateConnectionStatus(false);
        }
    }

    /**
     * Update connection status UI
     */
    updateConnectionStatus(isConnected) {
        const statusIndicator = document.getElementById('status-indicator');
        const connectionStatus = document.getElementById('connection-status');
        const connectionStatusText = document.getElementById('connection-status-text');
        
        if (statusIndicator) {
            if (isConnected) {
                statusIndicator.variant = 'success';
                statusIndicator.innerHTML = '<sl-icon name="wifi"></sl-icon> Connected';
            } else {
                statusIndicator.variant = 'danger';
                statusIndicator.innerHTML = '<sl-icon name="wifi-off"></sl-icon> Disconnected';
            }
        }
        
        if (connectionStatus) {
            connectionStatus.style.display = isConnected ? 'none' : 'block';
        }
        
        if (connectionStatusText) {
            connectionStatusText.textContent = isConnected ? 'Connected' : 'Disconnected';
        }
    }

    /**
     * Show API information
     */
    showApiInfo() {
        const apiInfo = {
            version: '2.0.0',
            endpoint: this.apiService.getBaseUrl(),
            status: 'Connected',
            lastUpdate: new Date().toLocaleString()
        };
        
        this.uiUtils.showNotification(
            `API: ${apiInfo.endpoint} | Status: ${apiInfo.status}`, 
            'info'
        );
    }

    /**
     * Get current application state
     */
    getState() {
        return {
            ...this.state,
            handlers: {
                navigation: this.navigationHandlers.getState ? this.navigationHandlers.getState() : {},
                landing: this.landingHandlers.getState ? this.landingHandlers.getState() : {},
                draft: this.draftHandlers.getDraftState(),
                player: this.playerHandlers.getFilterState(),
                ui: this.uiHandlers.getUIState()
            }
        };
    }

    /**
     * Handle URL navigation (delegated to navigation handlers)
     */
    handleUrlNavigation(params) {
        if (this.navigationHandlers && this.navigationHandlers.handleUrlNavigation) {
            this.navigationHandlers.handleUrlNavigation(params);
        }
    }

    /**
     * Check for auto-load from URL (delegated to navigation handlers)
     */
    checkAutoLoadFromUrl() {
        if (this.navigationHandlers && this.navigationHandlers.checkAutoLoadFromUrl) {
            this.navigationHandlers.checkAutoLoadFromUrl();
        }
    }

    /**
     * Cleanup handlers on app shutdown
     */
    cleanup() {
        console.log('🧹 Cleaning up event handlers...');
        
        // Cleanup specialized handlers
        if (this.draftHandlers && this.draftHandlers.cleanup) {
            this.draftHandlers.cleanup();
        }
        
        if (this.navigationHandlers && this.navigationHandlers.cleanup) {
            this.navigationHandlers.cleanup();
        }
        
        if (this.landingHandlers && this.landingHandlers.cleanup) {
            this.landingHandlers.cleanup();
        }
        
        if (this.playerHandlers && this.playerHandlers.cleanup) {
            this.playerHandlers.cleanup();
        }
        
        if (this.uiHandlers && this.uiHandlers.cleanup) {
            this.uiHandlers.cleanup();
        }
        
        console.log('✅ Event handlers cleanup complete');
    }

    /**
     * Legacy methods for backward compatibility
     * These delegate to the appropriate specialized handlers
     */

    // Delegate to landing handlers
    async handleUserSearch(username) {
        if (this.landingHandlers && this.landingHandlers.handleUserSearch) {
            return this.landingHandlers.handleUserSearch(username);
        }
    }

    // Delegate to draft handlers
    refreshDraftData() {
        if (this.draftHandlers && this.draftHandlers.refreshDraftData) {
            return this.draftHandlers.refreshDraftData();
        }
    }

    // Delegate to player handlers
    handleAddToQueue(player) {
        if (this.playerHandlers && this.playerHandlers.handleAddToQueue) {
            return this.playerHandlers.handleAddToQueue(player);
        }
    }

    // Delegate to UI handlers
    showKeyboardShortcuts() {
        if (this.uiHandlers && this.uiHandlers.showKeyboardShortcutsModal) {
            return this.uiHandlers.showKeyboardShortcutsModal();
        }
    }
}

// Export for use in other modules
window.EventHandlers = EventHandlers;
