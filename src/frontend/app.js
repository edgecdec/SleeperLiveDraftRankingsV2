/**
 * Fantasy Football Draft Assistant V2 - Main Application
 * 
 * This is the main JavaScript application that handles:
 * - API communication
 * - UI state management
 * - User interactions
 * - Navigation between sections
 */

class DraftAssistantApp {
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
            selectedDraft: null
        };
        
        // DOM elements
        this.elements = {
            statusIndicator: document.getElementById('status-indicator'),
            statusDot: document.querySelector('.status-dot'),
            statusText: document.querySelector('.status-text'),
            welcomeSection: document.getElementById('welcome-section'),
            draftSection: document.getElementById('draft-section'),
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            versionInfo: document.getElementById('version-info')
        };
        
        // Buttons
        this.buttons = {
            getStarted: document.getElementById('get-started-btn'),
            testConnection: document.getElementById('test-connection-btn'),
            backToWelcome: document.getElementById('back-to-welcome-btn'),
            apiInfo: document.getElementById('api-info-link')
        };
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Fantasy Football Draft Assistant V2');
        
        this.setupEventListeners();
        await this.checkConnection();
        
        console.log('✅ Application initialized successfully');
    }
    
    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Button event listeners
        this.buttons.getStarted?.addEventListener('click', () => {
            this.showUserSetup();
        });
        
        this.buttons.testConnection?.addEventListener('click', () => {
            this.testConnection();
        });
        
        this.buttons.backToWelcome?.addEventListener('click', () => {
            this.showSection('welcome');
        });
        
        this.buttons.apiInfo?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showApiInfo();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideLoading();
            }
        });
        
        console.log('📝 Event listeners set up');
    }
    
    /**
     * Check connection to the backend API
     */
    async checkConnection() {
        try {
            this.updateStatus('connecting', 'Connecting...');
            
            const response = await fetch(`${this.apiBase}/health`);
            const data = await response.json();
            
            if (response.ok && data.status === 'healthy') {
                this.updateStatus('connected', 'Connected');
                this.state.connected = true;
                
                // Update version info if available
                if (data.version && this.elements.versionInfo) {
                    this.elements.versionInfo.textContent = `v${data.version}`;
                }
                
                console.log('✅ Backend connection successful', data);
            } else {
                throw new Error(`Health check failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
            this.updateStatus('error', 'Connection Failed');
            this.state.connected = false;
        }
    }
    
    /**
     * Test connection (manual trigger)
     */
    async testConnection() {
        this.showLoading('Testing connection...');
        
        try {
            await this.checkConnection();
            
            if (this.state.connected) {
                this.showNotification('✅ Connection test successful!', 'success');
            } else {
                this.showNotification('❌ Connection test failed!', 'error');
            }
        } catch (error) {
            this.showNotification('❌ Connection test failed!', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Show user setup interface
     */
    async showUserSetup() {
        if (!this.state.connected) {
            this.showNotification('⚠️ Please check connection first', 'warning');
            return;
        }
        
        // Create user setup form
        const userSetupHtml = `
            <div class="user-setup-container">
                <h2>🏈 Setup Your Draft Assistant</h2>
                <p>Enter your Sleeper username to get started:</p>
                
                <form id="user-setup-form" class="user-setup-form">
                    <div class="form-group">
                        <label for="username-input">Sleeper Username:</label>
                        <input 
                            type="text" 
                            id="username-input" 
                            placeholder="Enter your Sleeper username"
                            required
                        >
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            Load My Leagues
                        </button>
                        <button type="button" id="cancel-setup-btn" class="btn btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
                
                <div id="user-leagues-container" style="display: none;">
                    <h3>Your Leagues</h3>
                    <div id="leagues-list"></div>
                </div>
            </div>
        `;
        
        // Update draft section content
        this.elements.draftSection.innerHTML = userSetupHtml;
        this.showSection('draft');
        
        // Set up form event listeners
        const form = document.getElementById('user-setup-form');
        const cancelBtn = document.getElementById('cancel-setup-btn');
        
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserSetup();
        });
        
        cancelBtn?.addEventListener('click', () => {
            this.showSection('welcome');
        });
        
        // Focus on username input
        document.getElementById('username-input')?.focus();
    }
    
    /**
     * Handle user setup form submission
     */
    async handleUserSetup() {
        const usernameInput = document.getElementById('username-input');
        const username = usernameInput?.value.trim();
        
        if (!username) {
            this.showNotification('⚠️ Please enter a username', 'warning');
            return;
        }
        
        this.showLoading('Loading user data...');
        
        try {
            // Get user info
            const userData = await this.apiRequest(`/user/${username}`);
            this.state.currentUser = userData.user;
            
            // Get user leagues
            this.updateLoadingText('Loading leagues...');
            const leaguesData = await this.apiRequest(`/user/${username}/leagues`);
            this.state.userLeagues = leaguesData.leagues;
            
            // Display leagues
            this.displayUserLeagues();
            
            this.showNotification(`✅ Loaded ${leaguesData.total_leagues} leagues for ${userData.user.display_name}`, 'success');
            
        } catch (error) {
            console.error('Failed to load user data:', error);
            
            if (error.message.includes('not found')) {
                this.showNotification('❌ User not found. Please check your username.', 'error');
            } else {
                this.showNotification('❌ Failed to load user data. Please try again.', 'error');
            }
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Display user leagues
     */
    displayUserLeagues() {
        const container = document.getElementById('user-leagues-container');
        const leaguesList = document.getElementById('leagues-list');
        
        if (!container || !leaguesList) return;
        
        if (this.state.userLeagues.length === 0) {
            leaguesList.innerHTML = '<p>No leagues found for this user.</p>';
        } else {
            const leaguesHtml = this.state.userLeagues.map(league => `
                <div class="league-card" data-league-id="${league.league_id}">
                    <div class="league-info">
                        <h4>${league.name}</h4>
                        <p>Season: ${league.season} • Teams: ${league.total_rosters || 'N/A'}</p>
                        <p>Status: ${league.status}</p>
                    </div>
                    <div class="league-actions">
                        <button class="btn btn-primary select-league-btn" data-league-id="${league.league_id}">
                            Select League
                        </button>
                    </div>
                </div>
            `).join('');
            
            leaguesList.innerHTML = leaguesHtml;
            
            // Add event listeners for league selection
            document.querySelectorAll('.select-league-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const leagueId = e.target.dataset.leagueId;
                    this.selectLeague(leagueId);
                });
            });
        }
        
        container.style.display = 'block';
    }
    
    /**
     * Select a league and load its drafts
     */
    async selectLeague(leagueId) {
        this.showLoading('Loading league drafts...');
        
        try {
            // Find the selected league
            this.state.selectedLeague = this.state.userLeagues.find(l => l.league_id === leagueId);
            
            if (!this.state.selectedLeague) {
                throw new Error('League not found');
            }
            
            // Get league drafts
            const draftsData = await this.apiRequest(`/user/${this.state.currentUser.username}/leagues/${leagueId}/drafts`);
            
            // Display draft selection
            this.displayDraftSelection(draftsData.drafts);
            
        } catch (error) {
            console.error('Failed to load league drafts:', error);
            this.showNotification('❌ Failed to load league drafts', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Display draft selection interface
     */
    displayDraftSelection(drafts) {
        const draftSelectionHtml = `
            <div class="draft-selection-container">
                <h2>🏈 Select Draft</h2>
                <p>League: ${this.state.selectedLeague.name}</p>
                
                ${drafts.length === 0 ? 
                    '<p>No drafts found for this league.</p>' :
                    `<div class="drafts-list">
                        ${drafts.map(draft => `
                            <div class="draft-card" data-draft-id="${draft.draft_id}">
                                <div class="draft-info">
                                    <h4>Draft ${draft.draft_id}</h4>
                                    <p>Status: ${draft.status}</p>
                                    <p>Type: ${draft.type}</p>
                                    ${draft.start_time ? `<p>Started: ${new Date(draft.start_time).toLocaleString()}</p>` : ''}
                                </div>
                                <div class="draft-actions">
                                    <button class="btn btn-primary select-draft-btn" data-draft-id="${draft.draft_id}">
                                        Select Draft
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>`
                }
                
                <div class="form-actions">
                    <button type="button" id="back-to-leagues-btn" class="btn btn-secondary">
                        ← Back to Leagues
                    </button>
                </div>
            </div>
        `;
        
        this.elements.draftSection.innerHTML = draftSelectionHtml;
        
        // Add event listeners
        document.getElementById('back-to-leagues-btn')?.addEventListener('click', () => {
            this.showUserSetup();
        });
        
        document.querySelectorAll('.select-draft-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const draftId = e.target.dataset.draftId;
                this.selectDraft(draftId);
            });
        });
    }
    
    /**
     * Select a draft and load draft data
     */
    async selectDraft(draftId) {
        this.showLoading('Loading draft data...');
        
        try {
            // Get draft info
            const draftData = await this.apiRequest(`/draft/${draftId}`);
            this.state.selectedDraft = draftData;
            
            // Get draft picks
            this.updateLoadingText('Loading draft picks...');
            const picksData = await this.apiRequest(`/draft/${draftId}/picks`);
            
            // Display draft interface
            this.displayDraftInterface(draftData, picksData);
            
            this.showNotification('✅ Draft loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to load draft data:', error);
            this.showNotification('❌ Failed to load draft data', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Display the main draft interface
     */
    async displayDraftInterface(draftData, picksData) {
        const draftInterfaceHtml = `
            <div class="draft-interface-container">
                <h2>🏈 Draft Assistant</h2>
                
                <div class="draft-header">
                    <div class="draft-info">
                        <h3>League: ${this.state.selectedLeague.name}</h3>
                        <p>Draft ID: ${draftData.draft_id}</p>
                        <p>Status: ${draftData.draft_info.status}</p>
                        ${draftData.league_format ? 
                            `<p>Format: ${draftData.league_format.scoring_format} ${draftData.league_format.league_type}</p>` : 
                            ''
                        }
                    </div>
                </div>
                
                <div class="draft-content">
                    <div class="draft-picks-section">
                        <h4>Draft Picks (${picksData.total_picks})</h4>
                        <div class="picks-list" id="picks-list">
                            ${this.renderDraftPicks(picksData.picks)}
                        </div>
                    </div>
                    
                    <div class="rankings-section">
                        <div class="rankings-header">
                            <h4>🏆 Player Rankings</h4>
                            <div class="rankings-controls">
                                <select id="position-filter" class="form-control">
                                    <option value="">All Positions</option>
                                    <option value="QB">QB</option>
                                    <option value="RB">RB</option>
                                    <option value="WR">WR</option>
                                    <option value="TE">TE</option>
                                    <option value="K">K</option>
                                    <option value="DEF">DEF</option>
                                </select>
                                <button id="refresh-rankings-btn" class="btn btn-sm btn-secondary">
                                    🔄 Refresh
                                </button>
                            </div>
                        </div>
                        
                        <div class="rankings-tabs">
                            <button class="tab-btn active" data-tab="available">Available Players</button>
                            <button class="tab-btn" data-tab="best">Best Available</button>
                        </div>
                        
                        <div class="rankings-content">
                            <div id="available-players-tab" class="tab-content active">
                                <div id="available-players-list" class="players-list">
                                    <div class="loading-placeholder">Loading available players...</div>
                                </div>
                            </div>
                            
                            <div id="best-available-tab" class="tab-content">
                                <div id="best-available-list" class="best-available-grid">
                                    <div class="loading-placeholder">Loading best available players...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="draft-actions">
                    <button type="button" id="back-to-drafts-btn" class="btn btn-secondary">
                        ← Back to Drafts
                    </button>
                    <button type="button" id="refresh-draft-btn" class="btn btn-primary">
                        🔄 Refresh Draft
                    </button>
                </div>
            </div>
        `;
        
        this.elements.draftSection.innerHTML = draftInterfaceHtml;
        
        // Set up event listeners
        this.setupDraftInterfaceListeners(draftData);
        
        // Load rankings data
        await this.loadRankingsData(draftData.draft_id);
    }
    
    /**
     * Set up event listeners for draft interface
     */
    setupDraftInterfaceListeners(draftData) {
        // Navigation buttons
        document.getElementById('back-to-drafts-btn')?.addEventListener('click', () => {
            this.selectLeague(this.state.selectedLeague.league_id);
        });
        
        document.getElementById('refresh-draft-btn')?.addEventListener('click', () => {
            this.selectDraft(draftData.draft_id);
        });
        
        // Rankings controls
        document.getElementById('position-filter')?.addEventListener('change', () => {
            this.filterAvailablePlayers();
        });
        
        document.getElementById('refresh-rankings-btn')?.addEventListener('click', () => {
            this.loadRankingsData(draftData.draft_id);
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }
    
    /**
     * Load rankings data for the draft
     */
    async loadRankingsData(draftId) {
        try {
            // Check if rankings are available
            const apiInfo = await this.apiRequest('/info');
            if (!apiInfo.rankings_enabled) {
                this.showRankingsUnavailable();
                return;
            }
            
            // Load available players
            this.updateRankingsLoading('available', 'Loading available players...');
            const availableData = await this.apiRequest(`/draft/${draftId}/available-players?limit=100`);
            this.displayAvailablePlayers(availableData.available_players);
            
            // Load best available by position
            this.updateRankingsLoading('best', 'Loading best available players...');
            const bestData = await this.apiRequest(`/draft/${draftId}/best-available?count=10`);
            this.displayBestAvailable(bestData.best_available);
            
        } catch (error) {
            console.error('Failed to load rankings data:', error);
            this.showRankingsError(error.message);
        }
    }
    
    /**
     * Display available players
     */
    displayAvailablePlayers(players) {
        const container = document.getElementById('available-players-list');
        if (!container) return;
        
        if (!players || players.length === 0) {
            container.innerHTML = '<div class="no-data">No available players found.</div>';
            return;
        }
        
        const playersHtml = players.map((player, index) => `
            <div class="player-card" data-position="${player.position}">
                <div class="player-rank">${player.rank || index + 1}</div>
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-details">
                        <span class="player-position">${player.position}</span>
                        <span class="player-team">${player.team || 'N/A'}</span>
                        ${player.bye_week ? `<span class="player-bye">Bye: ${player.bye_week}</span>` : ''}
                    </div>
                </div>
                <div class="player-tier">
                    <span class="tier-badge tier-${player.tier || 1}">T${player.tier || 1}</span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = playersHtml;
    }
    
    /**
     * Display best available players by position
     */
    displayBestAvailable(bestByPosition) {
        const container = document.getElementById('best-available-list');
        if (!container) return;
        
        if (!bestByPosition || Object.keys(bestByPosition).length === 0) {
            container.innerHTML = '<div class="no-data">No best available data found.</div>';
            return;
        }
        
        const positionsHtml = Object.entries(bestByPosition).map(([position, players]) => `
            <div class="position-group">
                <h5 class="position-header">${position}</h5>
                <div class="position-players">
                    ${players.slice(0, 5).map((player, index) => `
                        <div class="best-player-card">
                            <div class="best-player-rank">${index + 1}</div>
                            <div class="best-player-info">
                                <div class="best-player-name">${player.name}</div>
                                <div class="best-player-team">${player.team || 'N/A'}</div>
                            </div>
                            <div class="best-player-tier">T${player.tier || 1}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = positionsHtml;
    }
    
    /**
     * Filter available players by position
     */
    filterAvailablePlayers() {
        const positionFilter = document.getElementById('position-filter')?.value;
        const playerCards = document.querySelectorAll('.player-card');
        
        playerCards.forEach(card => {
            const playerPosition = card.dataset.position;
            if (!positionFilter || playerPosition === positionFilter) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    /**
     * Switch between rankings tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-${tabName === 'available' ? 'players' : 'available'}-tab`)?.classList.add('active');
    }
    
    /**
     * Render draft picks with better formatting
     */
    renderDraftPicks(picks) {
        if (!picks || picks.length === 0) {
            return '<div class="no-data">No picks yet.</div>';
        }
        
        const recentPicks = picks.slice(0, 20); // Show last 20 picks
        
        return recentPicks.map(pick => `
            <div class="pick-item">
                <div class="pick-number">${pick.pick_no}</div>
                <div class="pick-info">
                    <div class="pick-player">${pick.player_id ? `Player: ${pick.player_id}` : 'TBD'}</div>
                    <div class="pick-details">Round ${pick.round} • Pick ${pick.draft_slot}</div>
                </div>
                <div class="pick-time">
                    ${pick.picked_at ? new Date(pick.picked_at).toLocaleTimeString() : ''}
                </div>
            </div>
        `).join('') + (picks.length > 20 ? `<div class="more-picks">... and ${picks.length - 20} more picks</div>` : '');
    }
    
    /**
     * Update rankings loading state
     */
    updateRankingsLoading(section, message) {
        const container = document.getElementById(`${section === 'available' ? 'available-players' : 'best-available'}-list`);
        if (container) {
            container.innerHTML = `<div class="loading-placeholder">${message}</div>`;
        }
    }
    
    /**
     * Show rankings unavailable message
     */
    showRankingsUnavailable() {
        const availableContainer = document.getElementById('available-players-list');
        const bestContainer = document.getElementById('best-available-list');
        
        const message = `
            <div class="rankings-unavailable">
                <h4>⚠️ Rankings Unavailable</h4>
                <p>Player rankings are not available in this version.</p>
                <p>The draft assistant will still show draft picks and basic functionality.</p>
            </div>
        `;
        
        if (availableContainer) availableContainer.innerHTML = message;
        if (bestContainer) bestContainer.innerHTML = message;
    }
    
    /**
     * Show rankings error message
     */
    showRankingsError(errorMessage) {
        const availableContainer = document.getElementById('available-players-list');
        const bestContainer = document.getElementById('best-available-list');
        
        const message = `
            <div class="rankings-error">
                <h4>❌ Rankings Error</h4>
                <p>Failed to load player rankings: ${errorMessage}</p>
                <button onclick="window.draftApp.loadRankingsData('${this.state.selectedDraft?.draft_id}')" class="btn btn-sm btn-primary">
                    Try Again
                </button>
            </div>
        `;
        
        if (availableContainer) availableContainer.innerHTML = message;
        if (bestContainer) bestContainer.innerHTML = message;
    }
    
    /**
     * Update loading text
     */
    updateLoadingText(text) {
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = text;
        }
    }
    
    /**
     * Update connection status indicator
     */
    updateStatus(status, text) {
        if (!this.elements.statusDot || !this.elements.statusText) return;
        
        // Remove existing status classes
        this.elements.statusDot.classList.remove('connected', 'error');
        
        // Add new status class
        if (status === 'connected') {
            this.elements.statusDot.classList.add('connected');
        } else if (status === 'error') {
            this.elements.statusDot.classList.add('error');
        }
        
        // Update text
        this.elements.statusText.textContent = text;
    }
    
    /**
     * Show a specific section and hide others
     */
    showSection(sectionName) {
        console.log(`📄 Showing section: ${sectionName}`);
        
        // Hide all sections
        this.elements.welcomeSection.style.display = 'none';
        this.elements.draftSection.style.display = 'none';
        
        // Show requested section
        switch (sectionName) {
            case 'welcome':
                this.elements.welcomeSection.style.display = 'block';
                break;
            case 'draft':
                this.elements.draftSection.style.display = 'block';
                break;
            default:
                console.warn(`Unknown section: ${sectionName}`);
                this.elements.welcomeSection.style.display = 'block';
        }
        
        this.state.currentSection = sectionName;
    }
    
    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        if (this.elements.loadingOverlay && this.elements.loadingText) {
            this.elements.loadingText.textContent = message;
            this.elements.loadingOverlay.style.display = 'flex';
            this.state.loading = true;
        }
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
            this.state.loading = false;
        }
    }
    
    /**
     * Show API information
     */
    async showApiInfo() {
        try {
            this.showLoading('Fetching API info...');
            
            const response = await fetch(`${this.apiBase}/info`);
            const data = await response.json();
            
            if (response.ok) {
                const info = JSON.stringify(data, null, 2);
                alert(`API Information:\n\n${info}`);
            } else {
                throw new Error(data.error || 'Failed to fetch API info');
            }
        } catch (error) {
            console.error('Failed to fetch API info:', error);
            alert(`Failed to fetch API info: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Show a temporary notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease',
            maxWidth: '400px'
        });
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10b981';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f59e0b';
                break;
            default:
                notification.style.backgroundColor = '#2563eb';
        }
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
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
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }
    
    /**
     * Get current application state
     */
    getState() {
        return { ...this.state };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.draftApp = new DraftAssistantApp();
        await window.draftApp.init();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fee2e2;
                border: 1px solid #fecaca;
                color: #991b1b;
                padding: 20px;
                border-radius: 8px;
                max-width: 400px;
                text-align: center;
                z-index: 1000;
            ">
                <h3>⚠️ Application Error</h3>
                <p>Failed to initialize the application.</p>
                <p style="font-size: 0.9em; margin-top: 10px;">
                    Please refresh the page or check the console for details.
                </p>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Export for potential use in other modules
export { DraftAssistantApp };
