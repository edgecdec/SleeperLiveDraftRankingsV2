/**
 * Draft Handlers - V1 Style Draft View
 * 
 * Handles the draft board interface with position-based filtering,
 * roster sidebar, and real-time draft updates.
 */
class DraftHandlers {
    constructor(apiService, uiUtils) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        
        // State
        this.state = {
            currentDraft: null,
            currentLeague: null,
            players: [],
            filteredPlayers: [],
            currentPosition: 'ALL',
            myRoster: {},
            draftPicks: [],
            isRosterVisible: false
        };
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Draft handlers initialized');
    }
    
    /**
     * Setup event listeners for draft view
     */
    setupEventListeners() {
        // Back to leagues button
        const backBtn = document.getElementById('back-to-leagues-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showLeagueSelection();
            });
        }
        
        // Roster toggle button
        const rosterToggleBtn = document.getElementById('toggle-roster-btn');
        if (rosterToggleBtn) {
            rosterToggleBtn.addEventListener('click', () => {
                this.toggleRosterSidebar();
            });
        }
        
        // Close roster button
        const closeRosterBtn = document.getElementById('close-roster-btn');
        if (closeRosterBtn) {
            closeRosterBtn.addEventListener('click', () => {
                this.hideRosterSidebar();
            });
        }
        
        // Listen for draft selection events
        document.addEventListener('draftSelected', (event) => {
            this.handleDraftSelected(event.detail);
        });
        
        console.log('✅ Draft event listeners setup complete');
    }
    
    /**
     * Handle draft selection from league page
     */
    async handleDraftSelected(draftData) {
        console.log('🎯 Draft selected in draft handlers:', draftData);
        
        try {
            // Store draft info
            this.state.currentDraft = draftData;
            
            // Show draft view
            this.showDraftView();
            
            // Load draft data
            await this.loadDraftData(draftData.draft_id);
            
            // Load player rankings
            await this.loadPlayerRankings();
            
            // Update connection status
            this.updateConnectionStatus('online');
            
        } catch (error) {
            console.error('❌ Error handling draft selection:', error);
            this.updateConnectionStatus('offline');
        }
    }
    
    /**
     * Show the draft view and hide league selection
     */
    showDraftView() {
        const userSetupPage = document.getElementById('user-setup-page');
        const draftSection = document.getElementById('draft-section');
        
        if (userSetupPage) userSetupPage.style.display = 'none';
        if (draftSection) draftSection.style.display = 'block';
        
        // Update page title
        document.title = 'Fantasy Draft Assistant - Draft Board';
        
        console.log('✅ Draft view displayed');
    }
    
    /**
     * Show league selection and hide draft view
     */
    showLeagueSelection() {
        const userSetupPage = document.getElementById('user-setup-page');
        const draftSection = document.getElementById('draft-section');
        
        if (userSetupPage) userSetupPage.style.display = 'block';
        if (draftSection) draftSection.style.display = 'none';
        
        // Update page title
        document.title = 'Fantasy Draft Assistant';
        
        // Reset state
        this.state.currentDraft = null;
        this.state.currentLeague = null;
        this.state.players = [];
        this.state.filteredPlayers = [];
        
        console.log('✅ Returned to league selection');
    }
    
    /**
     * Load draft data from API
     */
    async loadDraftData(draftId) {
        console.log('📡 Loading draft data for:', draftId);
        
        try {
            const response = await this.apiService.request(`/draft/${draftId}`);
            
            if (response.status === 'success') {
                // The API response has draft data at the root level, not nested under 'draft'
                console.log('✅ Draft API response keys:', Object.keys(response));
                
                // Store draft data - the response itself contains the draft info
                this.state.currentDraft = {
                    draft_id: response.draft_id,
                    ...response.draft_info
                };
                
                // If we have league data in the response, use it
                if (response.league_info) {
                    this.state.currentLeague = response.league_info;
                    console.log('✅ League data found in draft response:', response.league_info);
                }
                
                // Update draft title
                this.updateDraftTitle(this.state.currentDraft);
                
                // Load draft picks if available
                if (response.draft_info && response.draft_info.picks) {
                    this.state.draftPicks = response.draft_info.picks;
                    console.log('✅ Draft picks loaded:', response.draft_info.picks.length, 'picks');
                }
                
                console.log('✅ Draft data loaded:', this.state.currentDraft);
                return this.state.currentDraft;
            } else {
                throw new Error(response.message || 'Failed to load draft data');
            }
        } catch (error) {
            console.error('❌ Error loading draft data:', error);
            throw error;
        }
    }
    
    /**
     * Load player rankings
     */
    async loadPlayerRankings() {
        console.log('📡 Loading player rankings...');
        
        if (!this.state.currentDraft || !this.state.currentDraft.draft_id) {
            console.error('❌ No draft ID available for loading players');
            this.loadMockPlayers();
            return;
        }
        
        try {
            const draftId = this.state.currentDraft.draft_id;
            console.log('🎯 Loading available players for draft:', draftId);
            
            // Load available players from the draft-specific endpoint
            const response = await this.apiService.request(`/draft/${draftId}/available-players`);
            
            if (response.status === 'success' && response.available_players) {
                console.log('✅ Available players API response:', response.available_players.length, 'players');
                console.log('🏈 League format detected:', response.league_format);
                
                // Transform API data to match our player format
                const players = response.available_players.map((player, index) => ({
                    player_id: player.player_id,
                    full_name: player.name,
                    position: player.position,
                    team: player.team,
                    rank: player.rank !== 999 ? player.rank : index + 1, // Use API rank or fallback to index
                    adp: player.rank !== 999 ? player.rank.toString() : (index + 1).toString(),
                    status: 'available',
                    // Additional data
                    tier: player.tier,
                    bye_week: player.bye_week,
                    injury_status: player.injury_status,
                    years_exp: player.years_exp
                }));
                
                this.state.players = players;
                this.state.filteredPlayers = players;
                
                // Render players
                this.renderPlayers();
                
                console.log('✅ Player rankings loaded:', players.length, 'players');
            } else {
                console.warn('⚠️ Available players API failed, response:', response);
                this.loadMockPlayers();
            }
        } catch (error) {
            console.error('❌ Error loading player rankings:', error);
            console.warn('⚠️ Falling back to mock data');
            this.loadMockPlayers();
        }
    }
    
    /**
     * Load mock players as fallback
     */
    loadMockPlayers() {
        console.log('📡 Loading mock player data...');
        
        const mockPlayers = this.generateMockPlayers();
        this.state.players = mockPlayers;
        this.state.filteredPlayers = mockPlayers;
        
        // Render players
        this.renderPlayers();
        
        console.log('✅ Mock player data loaded:', mockPlayers.length, 'players');
    }
    
    /**
     * Generate mock player data (replace with real API call)
     */
    generateMockPlayers() {
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
        const teams = ['BUF', 'MIA', 'NE', 'NYJ', 'BAL', 'CIN', 'CLE', 'PIT', 'HOU', 'IND', 'JAX', 'TEN'];
        const players = [];
        
        // Generate sample players
        for (let i = 1; i <= 200; i++) {
            const position = positions[Math.floor(Math.random() * positions.length)];
            const team = teams[Math.floor(Math.random() * teams.length)];
            
            players.push({
                player_id: `player_${i}`,
                full_name: `Player ${i}`,
                position: position,
                team: team,
                rank: i,
                adp: (Math.random() * 200 + 1).toFixed(1),
                status: 'available'
            });
        }
        
        return players;
    }
    
    /**
     * Update draft title and subtitle
     */
    updateDraftTitle(draftData) {
        const titleElement = document.getElementById('draft-title');
        const subtitleElement = document.getElementById('draft-subtitle');
        
        if (titleElement) {
            if (this.state.currentLeague && this.state.currentLeague.name) {
                titleElement.textContent = this.state.currentLeague.name;
            } else {
                titleElement.textContent = 'Draft Board';
            }
        }
        
        if (subtitleElement && draftData) {
            const draftType = draftData.type === 'snake' ? 'Snake Draft' : (draftData.type || 'Draft');
            const status = draftData.status || 'Unknown';
            subtitleElement.textContent = `${draftType} • Status: ${status}`;
        }
    }
    
    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        const indicator = document.getElementById('connection-indicator');
        const text = document.getElementById('connection-text');
        
        if (indicator && text) {
            indicator.className = `status-indicator ${status}`;
            text.textContent = status === 'online' ? 'Connected' : 'Connecting...';
        }
    }
    
    /**
     * Render players in V1-style position sections
     */
    renderPlayers() {
        const sectionsContainer = document.getElementById('position-sections');
        if (!sectionsContainer) return;
        
        if (this.state.players.length === 0) {
            sectionsContainer.innerHTML = `
                <div class="position-section-loading">
                    <sl-icon name="hourglass"></sl-icon>
                    Loading players...
                </div>
            `;
            return;
        }
        
        // Group players by position
        const playersByPosition = this.groupPlayersByPosition(this.state.players);
        
        // Define position order (like V1)
        const positionOrder = ['ALL', 'SUPER_FLEX', 'FLEX', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
        
        sectionsContainer.innerHTML = '';
        
        positionOrder.forEach(position => {
            const players = playersByPosition[position] || [];
            if (players.length === 0 && position !== 'ALL') return;
            
            const section = this.createPositionSection(position, players);
            sectionsContainer.appendChild(section);
        });
        
        console.log('✅ Rendered position sections for', this.state.players.length, 'players');
    }
    
    /**
     * Group players by position (including multi-position groups)
     */
    groupPlayersByPosition(players) {
        const groups = {
            'ALL': [...players],
            'QB': [],
            'RB': [],
            'WR': [],
            'TE': [],
            'K': [],
            'DEF': [],
            'FLEX': [], // RB/WR/TE
            'SUPER_FLEX': [] // QB/RB/WR/TE
        };
        
        players.forEach(player => {
            const pos = player.position;
            
            // Add to specific position
            if (groups[pos]) {
                groups[pos].push(player);
            }
            
            // Add to FLEX (RB/WR/TE)
            if (['RB', 'WR', 'TE'].includes(pos)) {
                groups['FLEX'].push(player);
            }
            
            // Add to SUPER_FLEX (QB/RB/WR/TE)
            if (['QB', 'RB', 'WR', 'TE'].includes(pos)) {
                groups['SUPER_FLEX'].push(player);
            }
        });
        
        return groups;
    }
    
    /**
     * Create a position section element
     */
    createPositionSection(position, players) {
        const section = document.createElement('div');
        section.className = 'position-section';
        section.dataset.position = position;
        
        const positionNames = {
            'ALL': 'All Players',
            'QB': 'Quarterbacks',
            'RB': 'Running Backs', 
            'WR': 'Wide Receivers',
            'TE': 'Tight Ends',
            'K': 'Kickers',
            'DEF': 'Defense/ST',
            'FLEX': 'Flex (RB/WR/TE)',
            'SUPER_FLEX': 'Super Flex (QB/RB/WR/TE)'
        };
        
        section.innerHTML = `
            <div class="position-section-header" onclick="window.app.draftHandlers.toggleSection('${position}')">
                <div class="position-section-title">
                    <div class="position-icon ${position}">${position}</div>
                    <div>
                        <div class="position-title">${positionNames[position]}</div>
                        <div class="position-count">${players.length} players</div>
                    </div>
                </div>
                <div class="position-section-controls">
                    <sl-icon name="chevron-down" class="collapse-icon"></sl-icon>
                </div>
            </div>
            <div class="position-section-content">
                <div class="position-players">
                    ${players.map(player => this.createPlayerCard(player)).join('')}
                </div>
            </div>
        `;
        
        return section;
    }
    
    /**
     * Create a player card element
     */
    createPlayerCard(player) {
        const injuryStatus = player.injury_status ? ` (${player.injury_status})` : '';
        const byeWeek = player.bye_week ? `Bye: ${player.bye_week}` : '';
        const details = [byeWeek, `Exp: ${player.years_exp || 0}y`].filter(Boolean).join(' • ');
        
        return `
            <div class="player-card ${player.status}" data-player-id="${player.player_id}" onclick="window.app.draftHandlers.handlePlayerSelect('${player.player_id}')">
                <div class="player-info">
                    <div class="player-rank">${player.rank}</div>
                    <div class="player-name-info">
                        <div class="player-name">${player.full_name}${injuryStatus}</div>
                        ${details ? `<div class="player-details">${details}</div>` : ''}
                    </div>
                    <div class="player-position ${player.position}">${player.position}</div>
                    <div class="player-team">${player.team}</div>
                    <div class="player-adp">${player.adp}</div>
                    <div class="player-status">
                        <span class="status-${player.status}">${player.status === 'available' ? 'Available' : 'Drafted'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Toggle position section collapse/expand
     */
    toggleSection(position) {
        const section = document.querySelector(`[data-position="${position}"]`);
        if (section) {
            section.classList.toggle('collapsed');
        }
    }
    
    /**
     * Handle player selection (for future implementation)
     */
    handlePlayerSelect(playerId) {
        console.log('🎯 Player selected:', playerId);
        // This would handle drafting a player in a real implementation
    }
    
    /**
     * Toggle roster sidebar visibility
     */
    toggleRosterSidebar() {
        const sidebar = document.getElementById('roster-sidebar');
        const toggleBtn = document.getElementById('toggle-roster-btn');
        const toggleText = toggleBtn.querySelector('span');
        
        if (sidebar) {
            if (this.state.isRosterVisible) {
                this.hideRosterSidebar();
            } else {
                this.showRosterSidebar();
            }
        }
    }
    
    /**
     * Show roster sidebar
     */
    showRosterSidebar() {
        const sidebar = document.getElementById('roster-sidebar');
        const toggleBtn = document.getElementById('toggle-roster-btn');
        const toggleText = toggleBtn.querySelector('span');
        
        if (sidebar) {
            sidebar.classList.remove('hidden');
            this.state.isRosterVisible = true;
            
            if (toggleText) {
                toggleText.textContent = 'Hide Roster';
            }
        }
    }
    
    /**
     * Hide roster sidebar
     */
    hideRosterSidebar() {
        const sidebar = document.getElementById('roster-sidebar');
        const toggleBtn = document.getElementById('toggle-roster-btn');
        const toggleText = toggleBtn.querySelector('span');
        
        if (sidebar) {
            sidebar.classList.add('hidden');
            this.state.isRosterVisible = false;
            
            if (toggleText) {
                toggleText.textContent = 'Show Roster';
            }
        }
    }
    
    /**
     * Set reference to landing handlers for cross-communication
     */
    setLandingHandlers(landingHandlers) {
        this.landingHandlers = landingHandlers;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftHandlers;
}
