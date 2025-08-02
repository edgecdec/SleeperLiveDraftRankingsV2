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
            autoRefreshInterval: null
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
        try {
            // Wait for key Shoelace components to be defined
            await customElements.whenDefined('sl-button');
            await customElements.whenDefined('sl-card');
            await customElements.whenDefined('sl-input');
            await customElements.whenDefined('sl-badge');
            
            console.log('🎨 Shoelace components loaded successfully');
            this.setupEventListeners();
            this.init();
        } catch (error) {
            console.error('❌ Error loading Shoelace components:', error);
            this.showNotification('Failed to load UI components', 'danger');
        }
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Enhanced Fantasy Football Draft Assistant V2');
        
        try {
            // Test API connection
            await this.testConnection();
            this.updateConnectionStatus(true);
            
            // Load version info
            await this.loadVersionInfo();
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.updateConnectionStatus(false);
            this.showNotification('Failed to connect to API', 'danger');
        }
    }
    
    /**
     * Set up event listeners for Shoelace components
     */
    setupEventListeners() {
        // Button event listeners
        document.getElementById('get-started-btn')?.addEventListener('click', () => {
            this.showSection('user-setup');
        });
        
        document.getElementById('test-connection-btn')?.addEventListener('click', () => {
            this.handleTestConnection();
        });
        
        document.getElementById('back-to-welcome-btn')?.addEventListener('click', () => {
            this.showSection('welcome');
        });
        
        document.getElementById('load-user-btn')?.addEventListener('click', () => {
            this.handleLoadUser();
        });
        
        // Input event listeners
        const usernameInput = document.getElementById('username-input');
        if (usernameInput) {
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
        document.getElementById('position-filter')?.addEventListener('sl-change', (event) => {
            this.handlePositionFilter(event.target.value);
        });
        
        document.getElementById('player-search')?.addEventListener('sl-input', (event) => {
            this.handlePlayerSearch(event.target.value);
        });
        
        // Auto-refresh toggle
        document.getElementById('auto-refresh-toggle')?.addEventListener('sl-change', (event) => {
            this.handleAutoRefreshToggle(event.target.checked);
        });
        
        // Tab change listeners
        const tabGroup = document.querySelector('sl-tab-group');
        if (tabGroup) {
            tabGroup.addEventListener('sl-tab-show', (event) => {
                this.handleTabChange(event.detail.name);
            });
        }
        
        // Modal event listeners
        document.getElementById('close-player-details')?.addEventListener('click', () => {
            this.closePlayerDetailsModal();
        });
        
        // API info link
        document.getElementById('api-info-link')?.addEventListener('click', () => {
            this.showApiInfo();
        });
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
     * Make API request with error handling
     */
    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
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
            this.showNotification('Connection successful!', 'success');
        } catch (error) {
            this.updateConnectionStatus(false);
            this.showNotification('Connection failed: ' + error.message, 'danger');
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
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.state.autoRefreshInterval) {
            clearInterval(this.state.autoRefreshInterval);
        }
        
        this.state.autoRefreshInterval = setInterval(() => {
            if (this.state.selectedDraft && this.state.currentSection === 'draft') {
                this.loadDraftData();
            }
        }, 30000); // Refresh every 30 seconds
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
                // TODO: Implement draft board
                break;
            case 'my-queue':
                // TODO: Implement queue
                break;
        }
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
    window.draftApp = new EnhancedDraftAssistantApp();
});

// Export for potential module usage
export default EnhancedDraftAssistantApp;
