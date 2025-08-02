/**
 * Fantasy Football Draft Assistant V2 - Enhanced Application with Shoelace
 * 
 * This enhanced version uses Shoelace web components for a modern UI experience
 * while maintaining the same functionality as the original application.
 */

class EnhancedDraftAssistantApp {
    constructor() {
        this.apiBase = '/api';
        this.state = {
            connected: false,
            loading: false,
            currentSection: 'welcome',
            apiInfo: null,
            currentUser: null,
            userLeagues: [],
            selectedLeague: null,
            selectedDraft: null,
            autoRefreshEnabled: false,
            autoRefreshInterval: null,
            lastUpdate: 0,
            draftUpdates: null
        };
        
        // DOM elements
        this.elements = {
            statusIndicator: document.getElementById('status-indicator'),
            welcomeSection: document.getElementById('welcome-section'),
            userSetupSection: document.getElementById('user-setup-section'),
            draftSection: document.getElementById('draft-section'),
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            loadingProgress: document.getElementById('loading-progress'),
            versionInfo: document.getElementById('version-info'),
            notificationContainer: document.getElementById('notification-container')
        };
        
        // Initialize when Shoelace is ready
        this.initializeWhenReady();
    }
    
    /**
     * Wait for Shoelace components to be ready, then initialize
     */
    async initializeWhenReady() {
        console.log('🎨 Waiting for Shoelace components to load...');
        
        try {
            // Wait for key Shoelace components to be defined
            console.log('⏳ Waiting for sl-button...');
            await customElements.whenDefined('sl-button');
            console.log('✅ sl-button ready');
            
            console.log('⏳ Waiting for sl-card...');
            await customElements.whenDefined('sl-card');
            console.log('✅ sl-card ready');
            
            console.log('⏳ Waiting for sl-input...');
            await customElements.whenDefined('sl-input');
            console.log('✅ sl-input ready');
            
            console.log('⏳ Waiting for sl-badge...');
            await customElements.whenDefined('sl-badge');
            console.log('✅ sl-badge ready');
            
            console.log('🎨 All Shoelace components loaded successfully');
            
            // Add a small delay to ensure components are fully rendered
            setTimeout(() => {
                this.setupEventListeners();
                this.init();
            }, 500);
            
        } catch (error) {
            console.error('❌ Error loading Shoelace components:', error);
            this.showNotification('Failed to load UI components', 'danger');
            
            // Try to setup event listeners anyway
            setTimeout(() => {
                this.setupEventListeners();
                this.init();
            }, 1000);
        }
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Enhanced Fantasy Football Draft Assistant V2');
        
        try {
            // Test API connection with timeout
            await this.testConnection();
            this.updateConnectionStatus(true);
            
            // Load version info
            await this.loadVersionInfo();
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.updateConnectionStatus(false);
            
            // Show user-friendly error message
            this.showNotification(
                'Backend server not running. Click "Test Connection" to retry or start the server.', 
                'warning',
                10000
            );
            
            // Still load version info even if API fails
            await this.loadVersionInfo();
        }
    }
    
    /**
     * Set up event listeners for Shoelace components
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Button event listeners
        const getStartedBtn = document.getElementById('get-started-btn');
        if (getStartedBtn) {
            console.log('✅ Setting up get-started-btn listener');
            getStartedBtn.addEventListener('click', () => {
                console.log('🚀 Get Started clicked - showing user setup');
                this.showSection('user-setup');
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
                this.showSection('welcome');
            });
        }
        
        const loadUserBtn = document.getElementById('load-user-btn');
        if (loadUserBtn) {
            console.log('✅ Setting up load-user-btn listener');
            loadUserBtn.addEventListener('click', () => {
                console.log('👤 Load user clicked');
                this.handleLoadUser();
            });
        }
        
        // Input event listeners
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
        
        // Filter event listeners
        const positionFilter = document.getElementById('position-filter');
        if (positionFilter) {
            console.log('✅ Setting up position-filter listener');
            positionFilter.addEventListener('sl-change', (event) => {
                this.handlePositionFilter(event.target.value);
            });
        }
        
        const playerSearch = document.getElementById('player-search');
        if (playerSearch) {
            console.log('✅ Setting up player-search listener');
            playerSearch.addEventListener('sl-input', (event) => {
                this.handlePlayerSearch(event.target.value);
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
        
        // Manual refresh button
        const manualRefreshBtn = document.getElementById('manual-refresh-btn');
        if (manualRefreshBtn) {
            console.log('✅ Setting up manual-refresh-btn listener');
            manualRefreshBtn.addEventListener('click', () => {
                console.log('🔄 Manual refresh clicked');
                this.handleManualRefresh();
            });
        }
        
        // Tab change listeners
        const tabGroup = document.querySelector('sl-tab-group');
        if (tabGroup) {
            console.log('✅ Setting up tab-group listener');
            tabGroup.addEventListener('sl-tab-show', (event) => {
                this.handleTabChange(event.detail.name);
            });
        }
        
        // Modal event listeners
        const closePlayerDetails = document.getElementById('close-player-details');
        if (closePlayerDetails) {
            console.log('✅ Setting up close-player-details listener');
            closePlayerDetails.addEventListener('click', () => {
                this.closePlayerDetailsModal();
            });
        }
        
        // API info link
        const apiInfoLink = document.getElementById('api-info-link');
        if (apiInfoLink) {
            console.log('✅ Setting up api-info-link listener');
            apiInfoLink.addEventListener('click', () => {
                this.showApiInfo();
            });
        }
        
        console.log('🎯 Event listeners setup complete');
    }
    
    /**
     * Show a section and hide others
     */
    showSection(sectionName) {
        const sections = ['welcome', 'user-setup', 'draft'];
        
        sections.forEach(section => {
            const element = document.getElementById(`${section}-section`);
            if (element) {
                element.style.display = section === sectionName ? 'block' : 'none';
            }
        });
        
        this.state.currentSection = sectionName;
        
        // Load section-specific data
        if (sectionName === 'draft' && this.state.selectedDraft) {
            this.loadDraftData();
        }
    }
    
    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
        const indicator = this.elements.statusIndicator;
        if (!indicator) return;
        
        this.state.connected = connected;
        
        if (connected) {
            indicator.variant = 'success';
            indicator.pulse = false;
            indicator.innerHTML = '<sl-icon name="wifi"></sl-icon> Connected';
        } else {
            indicator.variant = 'danger';
            indicator.pulse = true;
            indicator.innerHTML = '<sl-icon name="wifi-off"></sl-icon> Disconnected';
        }
    }
    
    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...', showProgress = false) {
        const overlay = this.elements.loadingOverlay;
        const text = this.elements.loadingText;
        const progress = this.elements.loadingProgress;
        
        if (overlay) overlay.style.display = 'flex';
        if (text) text.textContent = message;
        if (progress) {
            progress.style.display = showProgress ? 'block' : 'none';
            if (showProgress) progress.indeterminate = true;
        }
        
        this.state.loading = true;
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = this.elements.loadingOverlay;
        if (overlay) overlay.style.display = 'none';
        
        this.state.loading = false;
    }
    
    /**
     * Show notification using Shoelace alert
     */
    showNotification(message, variant = 'primary', duration = 5000) {
        const container = this.elements.notificationContainer;
        if (!container) return;
        
        const alert = document.createElement('sl-alert');
        alert.variant = variant;
        alert.closable = true;
        alert.duration = duration;
        
        // Add appropriate icon
        const iconName = this.getIconForVariant(variant);
        alert.innerHTML = `
            <sl-icon slot="icon" name="${iconName}"></sl-icon>
            ${message}
        `;
        
        container.appendChild(alert);
        alert.show();
        
        // Auto-remove after duration
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, duration);
    }
    
    /**
     * Get appropriate icon for alert variant
     */
    getIconForVariant(variant) {
        const icons = {
            primary: 'info-circle',
            success: 'check-circle',
            neutral: 'info-circle',
            warning: 'exclamation-triangle',
            danger: 'exclamation-octagon'
        };
        return icons[variant] || 'info-circle';
    }
    
    /**
     * Make API request with error handling and timeout
     */
    async apiRequest(endpoint, options = {}) {
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
            const response = await this.apiRequest('/health');
            this.state.apiInfo = response;
            return response;
        } catch (error) {
            throw new Error('Failed to connect to API');
        }
    }
    
    /**
     * Handle test connection button click
     */
    async handleTestConnection() {
        const button = document.getElementById('test-connection-btn');
        if (button) button.loading = true;
        
        try {
            await this.testConnection();
            this.updateConnectionStatus(true);
            this.showNotification('✅ Connection successful! Backend is running.', 'success');
        } catch (error) {
            this.updateConnectionStatus(false);
            
            let errorMessage = 'Connection failed: ';
            if (error.message.includes('timeout')) {
                errorMessage += 'Server not responding (timeout). Make sure the backend is running on port 5000.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Cannot reach server. Start the backend with: python main.py --port 5000';
            } else {
                errorMessage += error.message;
            }
            
            this.showNotification(errorMessage, 'danger', 15000);
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
            this.showNotification('Please enter a username', 'warning');
            return;
        }
        
        const username = usernameInput.value.trim();
        
        if (loadButton) loadButton.loading = true;
        
        try {
            // Load user data
            const userData = await this.apiRequest(`/user/${username}`);
            this.state.currentUser = userData.user;
            
            // Load user leagues
            const leaguesData = await this.apiRequest(`/user/${username}/leagues`);
            this.state.userLeagues = leaguesData.leagues;
            
            this.showNotification(`Loaded ${leaguesData.leagues.length} leagues for ${username}`, 'success');
            
            // For demo purposes, auto-select first league with draft
            const leagueWithDraft = leaguesData.leagues.find(league => league.draft_id);
            if (leagueWithDraft) {
                this.state.selectedLeague = leagueWithDraft;
                this.state.selectedDraft = { draft_id: leagueWithDraft.draft_id };
                this.showSection('draft');
            } else {
                this.showNotification('No active drafts found', 'warning');
            }
            
        } catch (error) {
            this.showNotification('Failed to load user data: ' + error.message, 'danger');
        } finally {
            if (loadButton) loadButton.loading = false;
        }
    }
    
    /**
     * Handle manual refresh button click
     */
    async handleManualRefresh() {
        if (!this.state.selectedDraft?.draft_id) {
            this.showNotification('No draft selected for refresh', 'warning');
            return;
        }
        
        try {
            this.showLoading('Refreshing draft data...');
            
            // Use the refresh endpoint for manual refresh
            const refreshedData = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}/refresh`, {
                method: 'POST'
            });
            
            // Update the display with refreshed data
            this.updateDraftInfo(refreshedData);
            this.displayAvailablePlayers(refreshedData.available_players, refreshedData.is_dynasty_league);
            
            // Update best available if we have that data
            if (refreshedData.best_available) {
                this.displayBestAvailable(refreshedData.best_available);
            }
            
            // Update stats
            this.updateDraftStats(refreshedData);
            
            // Update last update timestamp
            this.state.lastUpdate = refreshedData.last_updated || Date.now() / 1000;
            
            this.showNotification('Draft data refreshed successfully!', 'success');
            
        } catch (error) {
            console.error('Manual refresh failed:', error);
            this.showNotification('Failed to refresh draft data: ' + error.message, 'danger');
    /**
     * Load draft data
     */
    async loadDraftData() {
        if (!this.state.selectedDraft?.draft_id) return;
        
        try {
            // Show loading states
            this.showLoadingState('available-players-loading', true);
            this.showLoadingState('best-available-loading', true);
            
            // Load draft info
            const draftInfo = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}`);
            this.updateDraftInfo(draftInfo);
            
            // Load available players
            const availableData = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}/available-players?limit=50`);
            this.displayAvailablePlayers(availableData.available_players, availableData.is_dynasty_league);
            
            // Load best available
            const bestData = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}/best-available?count=5`);
            this.displayBestAvailable(bestData.best_available);
            
            // Update stats
            this.updateDraftStats(availableData);
            
            // Initialize auto-refresh state if not already set
            if (this.state.lastUpdate === 0) {
                // Get initial draft updates to set baseline
                try {
                    const updates = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}/updates`);
                    this.state.lastUpdate = updates.last_update;
                    this.state.draftUpdates = updates;
                    console.log('📊 Initialized auto-refresh baseline:', updates);
                } catch (error) {
                    console.warn('Could not initialize auto-refresh baseline:', error);
                    this.state.lastUpdate = Date.now() / 1000;
                }
            }
            
        } catch (error) {
            this.showNotification('Failed to load draft data: ' + error.message, 'danger');
        } finally {
            this.showLoadingState('available-players-loading', false);
            this.showLoadingState('best-available-loading', false);
        }
    }
        if (!this.state.selectedDraft?.draft_id) return;
        
        try {
            // Show loading states
            this.showLoadingState('available-players-loading', true);
            this.showLoadingState('best-available-loading', true);
            
            // Load draft info
            const draftInfo = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}`);
            this.updateDraftInfo(draftInfo);
            
            // Load available players
            const availableData = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}/available-players?limit=50`);
            this.displayAvailablePlayers(availableData.available_players, availableData.is_dynasty_league);
            
            // Load best available
            const bestData = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}/best-available?count=5`);
            this.displayBestAvailable(bestData.best_available);
            
            // Update stats
            this.updateDraftStats(availableData);
            
        } catch (error) {
            this.showNotification('Failed to load draft data: ' + error.message, 'danger');
        } finally {
            this.showLoadingState('available-players-loading', false);
            this.showLoadingState('best-available-loading', false);
        }
    }
    
    /**
     * Show/hide loading state for a section
     */
    showLoadingState(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'flex' : 'none';
        }
    }
    
    /**
     * Update draft info display
     */
    updateDraftInfo(draftInfo) {
        // Update league format badge
        const formatBadge = document.getElementById('league-format-badge');
        if (formatBadge && draftInfo.league_format) {
            const format = draftInfo.league_format.format_string || 'Unknown Format';
            formatBadge.textContent = format.replace('_', ' ').toUpperCase();
        }
        
        // Update dynasty badge
        const dynastyBadge = document.getElementById('dynasty-badge');
        if (dynastyBadge) {
            dynastyBadge.style.display = draftInfo.is_dynasty_league ? 'inline-flex' : 'none';
        }
    }
    
    /**
     * Display available players
     */
    displayAvailablePlayers(players, isDynasty = false) {
        const container = document.getElementById('available-players-list');
        if (!container) return;
        
        if (!players || players.length === 0) {
            container.innerHTML = `
                <sl-alert variant="neutral" open>
                    <sl-icon slot="icon" name="info-circle"></sl-icon>
                    No available players found.
                </sl-alert>
            `;
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
     * Create a player card HTML
     */
    createPlayerCard(player) {
        const positionClass = `position-${player.position?.toLowerCase() || 'unknown'}`;
        
        return `
            <sl-card class="player-card" data-player-id="${player.player_id || ''}">
                <div slot="header" class="player-header">
                    <strong>${player.name || 'Unknown Player'}</strong>
                    <sl-badge variant="neutral" class="${positionClass}">
                        ${player.position || 'N/A'}
                    </sl-badge>
                    <sl-badge variant="neutral">${player.team || 'N/A'}</sl-badge>
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
                            <span class="stat-value">${player.bye_week}</span>
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
     * Display best available players by position
     */
    displayBestAvailable(bestAvailable) {
        const container = document.getElementById('best-available-content');
        if (!container) return;
        
        if (!bestAvailable || Object.keys(bestAvailable).length === 0) {
            container.innerHTML = `
                <sl-alert variant="neutral" open>
                    <sl-icon slot="icon" name="info-circle"></sl-icon>
                    No best available data found.
                </sl-alert>
            `;
            return;
        }
        
        const sectionsHtml = Object.entries(bestAvailable).map(([position, players]) => {
            const positionClass = `position-${position.toLowerCase()}`;
            const playersHtml = players.map(player => this.createPlayerCard(player)).join('');
            
            return `
                <div class="position-section">
                    <h3 class="${positionClass}">
                        <sl-icon name="star-fill"></sl-icon>
                        Best Available ${position}
                    </h3>
                    <div class="position-players">
                        ${playersHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = sectionsHtml;
    }
    
    /**
     * Update draft statistics
     */
    updateDraftStats(data) {
        const totalPicksBadge = document.getElementById('total-picks-badge');
        const availablePlayersBadge = document.getElementById('available-players-badge');
        
        if (totalPicksBadge) {
            totalPicksBadge.textContent = data.total_unavailable || '0';
        }
        
        if (availablePlayersBadge) {
            availablePlayersBadge.textContent = data.available_players?.length || '0';
        }
    }
    
    /**
     * Handle position filter change
     */
    handlePositionFilter(position) {
        console.log('Position filter changed:', position);
        // Reload data with position filter
        if (this.state.selectedDraft) {
            this.loadDraftData();
        }
    }
    
    /**
     * Handle player search
     */
    handlePlayerSearch(searchTerm) {
        console.log('Player search:', searchTerm);
        // Implement search functionality
    }
    
    /**
     * Handle auto-refresh toggle
     */
    handleAutoRefreshToggle(enabled) {
        this.state.autoRefreshEnabled = enabled;
        
        if (enabled) {
            this.startAutoRefresh();
            this.showNotification('Auto-refresh enabled', 'success');
        } else {
            this.stopAutoRefresh();
            this.showNotification('Auto-refresh disabled', 'neutral');
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
            if (!this.state.selectedDraft?.draft_id || this.state.currentSection !== 'draft') {
                return;
            }
            
            try {
                // Check for draft updates first
                const updates = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}/updates`);
                
                // Compare with last known update
                if (updates.last_update > this.state.lastUpdate) {
                    console.log('🔥 New draft picks detected, refreshing data...');
                    
                    // Show notification about new picks
                    const newPicks = updates.total_picks - (this.state.draftUpdates?.total_picks || 0);
                    if (newPicks > 0) {
                        this.showNotification(
                            `${newPicks} new pick${newPicks > 1 ? 's' : ''} detected! Refreshing draft data...`,
                            'primary',
                            3000
                        );
                    }
                    
                    // Update state
                    this.state.lastUpdate = updates.last_update;
                    this.state.draftUpdates = updates;
                    
                    // Refresh the full draft data
                    await this.loadDraftData();
                } else {
                    console.log('📊 No new draft updates detected');
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
                this.loadDraftBoard();
                break;
            case 'my-queue':
                // TODO: Implement queue
                break;
        }
    }
    
    /**
     * Load and display draft board
     */
    async loadDraftBoard() {
        if (!this.state.selectedDraft?.draft_id) return;
        
        const container = document.getElementById('draft-board-content');
        if (!container) return;
        
        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-state">
                    <sl-spinner style="font-size: 3rem;"></sl-spinner>
                    <p>Loading draft board...</p>
                </div>
            `;
            
            // Load draft board data
            const boardData = await this.apiRequest(`/draft/${this.state.selectedDraft.draft_id}/board`);
            this.displayDraftBoard(boardData.draft_board);
            
        } catch (error) {
            console.error('Failed to load draft board:', error);
            container.innerHTML = `
                <sl-alert variant="danger" open>
                    <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
                    Failed to load draft board: ${error.message}
                </sl-alert>
            `;
        }
    }
    
    /**
     * Display draft board with Shoelace components
     */
    displayDraftBoard(draftBoard) {
        const container = document.getElementById('draft-board-content');
        if (!container) return;
        
        const { teams, rounds, total_teams, draft_type, picks_made, total_picks, current_pick_info } = draftBoard;
        
        // Create turn indicator
        const turnIndicatorHtml = this.createTurnIndicator(current_pick_info);
        
        // Create draft board header
        const headerHtml = `
            <div class="draft-board-header">
                ${turnIndicatorHtml}
                <sl-card class="board-info-card">
                    <div slot="header">
                        <h3>Draft Board</h3>
                        <div class="board-stats">
                            <sl-badge variant="primary">${picks_made}/${total_picks} picks</sl-badge>
                            <sl-badge variant="neutral">${draft_type} draft</sl-badge>
                            <sl-badge variant="neutral">${total_teams} teams</sl-badge>
                        </div>
                    </div>
                </sl-card>
            </div>
        `;
        
        // Create round headers
        const roundHeaders = Array.from({length: rounds}, (_, i) => 
            `<div class="round-header">R${i + 1}</div>`
        ).join('');
        
        // Create team rows
        const teamRows = teams.map((team, teamIndex) => {
            const isCurrentDrafter = current_pick_info && 
                                   !current_pick_info.draft_complete && 
                                   team.team_name === current_pick_info.current_drafter_name;
            
            const teamHeaderClass = isCurrentDrafter ? 'team-header current-drafter' : 'team-header';
            
            const teamHeader = `
                <div class="${teamHeaderClass}">
                    <strong>${team.team_name}</strong>
                    ${isCurrentDrafter ? '<sl-icon name="clock" class="current-pick-icon"></sl-icon>' : ''}
                </div>
            `;
            
            const teamPicks = team.picks.map(pick => {
                if (pick.player) {
                    const positionClass = `position-${pick.player.position.toLowerCase()}`;
                    return `
                        <sl-card class="pick-card filled-pick">
                            <div class="pick-content">
                                <div class="pick-number">${pick.pick_number}</div>
                                <div class="player-info">
                                    <div class="player-name">${pick.player.name}</div>
                                    <div class="player-details">
                                        <sl-badge variant="neutral" class="${positionClass}">
                                            ${pick.player.position}
                                        </sl-badge>
                                        <span class="player-team">${pick.player.team}</span>
                                    </div>
                                </div>
                            </div>
                        </sl-card>
                    `;
                } else {
                    const isNextPick = current_pick_info && 
                                     !current_pick_info.draft_complete && 
                                     pick.round === current_pick_info.current_round &&
                                     isCurrentDrafter;
                    
                    const pickClass = isNextPick ? 'pick-card empty-pick next-pick' : 'pick-card empty-pick';
                    
                    return `
                        <sl-card class="${pickClass}">
                            <div class="pick-content">
                                <div class="pick-placeholder">
                                    ${isNextPick ? 
                                        '<sl-icon name="arrow-right-circle" class="next-pick-icon"></sl-icon>' : 
                                        '<sl-icon name="clock"></sl-icon>'
                                    }
                                    <span>Round ${pick.round}</span>
                                </div>
                            </div>
                        </sl-card>
                    `;
                }
            }).join('');
            
            return `
                <div class="team-row ${isCurrentDrafter ? 'current-drafter-row' : ''}">
                    ${teamHeader}
                    <div class="team-picks">
                        ${teamPicks}
                    </div>
                </div>
            `;
        }).join('');
        
        // Combine everything
        const boardHtml = `
            ${headerHtml}
            <div class="draft-board-grid">
                <div class="board-headers">
                    <div class="team-column-header">Teams</div>
                    <div class="rounds-headers">
                        ${roundHeaders}
                    </div>
                </div>
                <div class="board-content">
                    ${teamRows}
                </div>
            </div>
        `;
        
        container.innerHTML = boardHtml;
    }
    
    /**
     * Create turn indicator component
     */
    createTurnIndicator(currentPickInfo) {
        if (!currentPickInfo) {
            return `
                <sl-card class="turn-indicator-card">
                    <div class="turn-indicator">
                        <sl-icon name="info-circle"></sl-icon>
                        <span>Draft information loading...</span>
                    </div>
                </sl-card>
            `;
        }
        
        if (currentPickInfo.draft_complete) {
            return `
                <sl-card class="turn-indicator-card draft-complete">
                    <div class="turn-indicator">
                        <sl-icon name="check-circle"></sl-icon>
                        <div class="turn-info">
                            <strong>Draft Complete!</strong>
                            <span>All ${currentPickInfo.current_pick - 1} picks have been made</span>
                        </div>
                    </div>
                </sl-card>
            `;
        }
        
        return `
            <sl-card class="turn-indicator-card active-pick">
                <div class="turn-indicator">
                    <sl-icon name="clock" class="pulsing-icon"></sl-icon>
                    <div class="turn-info">
                        <strong>Pick ${currentPickInfo.current_pick} - Round ${currentPickInfo.current_round}</strong>
                        <span>${currentPickInfo.current_drafter_name || 'Unknown Team'} is on the clock</span>
                        <div class="pick-stats">
                            <sl-badge variant="primary">${currentPickInfo.picks_remaining} picks remaining</sl-badge>
                        </div>
                    </div>
                </div>
            </sl-card>
        `;
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
                            <span class="stat-value">${player.bye_week}</span>
                        </div>
                    ` : ''}
                    ${player.years_exp ? `
                        <div class="stat-row">
                            <span class="stat-label">Experience:</span>
                            <span class="stat-value">${player.years_exp} years</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        content.innerHTML = detailsHtml;
        modal.show();
    }
    
    /**
     * Close player details modal
     */
    closePlayerDetailsModal() {
        const modal = document.getElementById('player-details-modal');
        if (modal) modal.hide();
    }
    
    /**
     * Show API info
     */
    showApiInfo() {
        if (this.state.apiInfo) {
            const info = JSON.stringify(this.state.apiInfo, null, 2);
            this.showNotification(`API Info: ${info}`, 'neutral', 10000);
        } else {
            this.showNotification('No API info available', 'warning');
        }
    }
    
    /**
     * Load version info
     */
    async loadVersionInfo() {
        try {
            const versionElement = this.elements.versionInfo;
            if (versionElement) {
                versionElement.textContent = 'v2.0.0-enhanced';
            }
        } catch (error) {
            console.error('Failed to load version info:', error);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM Content Loaded - Initializing app...');
    
    // Add immediate debug event listeners to test button functionality
    const getStartedBtn = document.getElementById('get-started-btn');
    const testConnectionBtn = document.getElementById('test-connection-btn');
    
    if (getStartedBtn) {
        console.log('✅ Found get-started-btn, adding click listener');
        getStartedBtn.addEventListener('click', () => {
            console.log('🔥 Get Started button clicked!');
            alert('Get Started button works! (Debug mode)');
        });
    } else {
        console.error('❌ get-started-btn not found');
    }
    
    if (testConnectionBtn) {
        console.log('✅ Found test-connection-btn, adding click listener');
        testConnectionBtn.addEventListener('click', () => {
            console.log('🔥 Test Connection button clicked!');
            alert('Test Connection button works! (Debug mode)');
        });
    } else {
        console.error('❌ test-connection-btn not found');
    }
    
    // Initialize the main app
    window.draftApp = new EnhancedDraftAssistantApp();
});

// Export for potential module usage
export default EnhancedDraftAssistantApp;
