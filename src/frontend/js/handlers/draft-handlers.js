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
        
        // Initialize rankings service
        this.rankingsService = new RankingsService();
        
        // State
        this.state = {
            currentDraft: null,
            currentLeague: null,
            players: [],
            filteredPlayers: [],
            currentPosition: 'ALL',
            myRoster: {},
            draftPicks: [],
            isRosterVisible: false,
            currentRankings: null
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
        
        // Rankings selector
        const rankingsSelect = document.getElementById('rankings-select');
        if (rankingsSelect) {
            rankingsSelect.addEventListener('sl-change', (event) => {
                try {
                    this.handleRankingSelection(event.target.value);
                } catch (error) {
                    console.error('❌ Error handling ranking selection:', error);
                }
            });
        }
        
        // Upload rankings button
        const uploadBtn = document.getElementById('upload-rankings-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.showUploadDialog();
            });
        }
        
        // Upload dialog handlers
        this.setupUploadDialogHandlers();
        
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
        if (this.navigationHandlers) {
            this.navigationHandlers.showDraftPage();
        } else {
            // Fallback for backward compatibility
            const landingSection = document.getElementById('landing-section');
            const draftSection = document.getElementById('draft-section');
            
            if (landingSection) landingSection.style.display = 'none';
            if (draftSection) draftSection.style.display = 'flex';
        }
        
        // Update page title
        document.title = 'Fantasy Draft Assistant - Draft Board';
        
        console.log('✅ Draft view displayed');
    }
    
    /**
     * Show league selection and hide draft view
     */
    showLeagueSelection() {
        if (this.navigationHandlers) {
            this.navigationHandlers.showLandingPage();
        } else {
            // Fallback for backward compatibility
            const landingSection = document.getElementById('landing-section');
            const draftSection = document.getElementById('draft-section');
            
            if (landingSection) landingSection.style.display = 'flex';
            if (draftSection) draftSection.style.display = 'none';
        }
        
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
                
                // Initialize rankings selector
                await this.waitForShoelaceComponents();
                await this.initializeRankingsSelector();
                
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
    async loadMockPlayers() {
        console.log('📡 Loading mock player data...');
        
        const mockPlayers = this.generateMockPlayers();
        this.state.players = mockPlayers;
        this.state.filteredPlayers = mockPlayers;
        
        // Initialize rankings selector
        await this.waitForShoelaceComponents();
        await this.initializeRankingsSelector();
        
        // Render players
        this.renderPlayers();
        
        console.log('✅ Mock player data loaded:', mockPlayers.length, 'players');
    }
    
    /**
     * Generate mock player data (replace with real API call)
     */
    generateMockPlayers() {
        // Use real player names for better testing of rankings integration
        const realPlayers = [
            // QBs
            { name: 'Josh Allen', position: 'QB', team: 'BUF' },
            { name: 'Lamar Jackson', position: 'QB', team: 'BAL' },
            { name: 'Jayden Daniels', position: 'QB', team: 'WAS' },
            { name: 'Jalen Hurts', position: 'QB', team: 'PHI' },
            { name: 'Joe Burrow', position: 'QB', team: 'CIN' },
            { name: 'Dak Prescott', position: 'QB', team: 'DAL' },
            { name: 'Tua Tagovailoa', position: 'QB', team: 'MIA' },
            { name: 'Anthony Richardson', position: 'QB', team: 'IND' },
            
            // RBs
            { name: 'Saquon Barkley', position: 'RB', team: 'PHI' },
            { name: 'Bijan Robinson', position: 'RB', team: 'ATL' },
            { name: 'Breece Hall', position: 'RB', team: 'NYJ' },
            { name: 'Jonathan Taylor', position: 'RB', team: 'IND' },
            { name: 'Derrick Henry', position: 'RB', team: 'BAL' },
            { name: 'Josh Jacobs', position: 'RB', team: 'GB' },
            { name: 'Kenneth Walker III', position: 'RB', team: 'SEA' },
            { name: 'De\'Von Achane', position: 'RB', team: 'MIA' },
            { name: 'Jahmyr Gibbs', position: 'RB', team: 'DET' },
            { name: 'Alvin Kamara', position: 'RB', team: 'NO' },
            
            // WRs
            { name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN' },
            { name: 'Justin Jefferson', position: 'WR', team: 'MIN' },
            { name: 'CeeDee Lamb', position: 'WR', team: 'DAL' },
            { name: 'Tyreek Hill', position: 'WR', team: 'MIA' },
            { name: 'A.J. Brown', position: 'WR', team: 'PHI' },
            { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET' },
            { name: 'Puka Nacua', position: 'WR', team: 'LAR' },
            { name: 'DK Metcalf', position: 'WR', team: 'SEA' },
            { name: 'Garrett Wilson', position: 'WR', team: 'NYJ' },
            { name: 'Chris Olave', position: 'WR', team: 'NO' },
            { name: 'DeVonta Smith', position: 'WR', team: 'PHI' },
            { name: 'Jaylen Waddle', position: 'WR', team: 'MIA' },
            
            // TEs
            { name: 'Travis Kelce', position: 'TE', team: 'KC' },
            { name: 'Mark Andrews', position: 'TE', team: 'BAL' },
            { name: 'Sam LaPorta', position: 'TE', team: 'DET' },
            { name: 'Trey McBride', position: 'TE', team: 'ARI' },
            { name: 'George Kittle', position: 'TE', team: 'SF' },
            { name: 'Evan Engram', position: 'TE', team: 'JAX' },
            { name: 'Kyle Pitts', position: 'TE', team: 'ATL' },
            { name: 'T.J. Hockenson', position: 'TE', team: 'MIN' },
            
            // Kickers
            { name: 'Justin Tucker', position: 'K', team: 'BAL' },
            { name: 'Harrison Butker', position: 'K', team: 'KC' },
            { name: 'Tyler Bass', position: 'K', team: 'BUF' },
            { name: 'Brandon McManus', position: 'K', team: 'JAX' },
            
            // Defense
            { name: 'San Francisco 49ers', position: 'DEF', team: 'SF' },
            { name: 'Dallas Cowboys', position: 'DEF', team: 'DAL' },
            { name: 'Buffalo Bills', position: 'DEF', team: 'BUF' },
            { name: 'Pittsburgh Steelers', position: 'DEF', team: 'PIT' }
        ];
        
        // Create players array with realistic data
        const players = [];
        
        // Add all real players first
        realPlayers.forEach((playerData, index) => {
            players.push({
                player_id: `player_${index + 1}`,
                full_name: playerData.name,
                position: playerData.position,
                team: playerData.team,
                rank: index + 1,
                adp: (index * 3 + Math.random() * 10 + 1).toFixed(1),
                status: 'available',
                tier: Math.ceil((index + 1) / 12), // Group into tiers
                bye_week: Math.floor(Math.random() * 8) + 5, // Bye weeks 5-12
                injury_status: Math.random() > 0.9 ? 'Questionable' : null,
                years_exp: Math.floor(Math.random() * 10) + 1
            });
        });
        
        // Fill remaining slots with generic players if needed
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
        const teams = ['BUF', 'MIA', 'NE', 'NYJ', 'BAL', 'CIN', 'CLE', 'PIT', 'HOU', 'IND', 'JAX', 'TEN'];
        
        for (let i = players.length; i < 200; i++) {
            const position = positions[Math.floor(Math.random() * positions.length)];
            const team = teams[Math.floor(Math.random() * teams.length)];
            
            players.push({
                player_id: `player_${i + 1}`,
                full_name: `${position} Player ${i + 1 - realPlayers.length}`,
                position: position,
                team: team,
                rank: i + 1,
                adp: (Math.random() * 200 + realPlayers.length).toFixed(1),
                status: 'available',
                tier: Math.ceil((i + 1) / 12),
                bye_week: Math.floor(Math.random() * 8) + 5,
                injury_status: Math.random() > 0.95 ? 'Questionable' : null,
                years_exp: Math.floor(Math.random() * 10) + 1
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
     * Create position tabs based on available positions in the data
     */
    createPositionTabs() {
        const tabsContainer = document.getElementById('position-tabs');
        if (!tabsContainer) return;
        
        // Get unique positions from players
        const positions = new Set();
        this.state.players.forEach(player => {
            positions.add(player.position);
        });
        
        console.log('🔍 Available positions in data:', Array.from(positions));
        
        // Define base tab order with multi-position groups
        const baseTabOrder = [
            { key: 'ALL', label: 'All Players', filter: () => true, priority: 0 },
            { key: 'SUPER_FLEX', label: 'Super Flex', filter: (p) => ['QB', 'RB', 'WR', 'TE'].includes(p.position), priority: 1 },
            { key: 'FLEX', label: 'Flex', filter: (p) => ['RB', 'WR', 'TE'].includes(p.position), priority: 2 }
        ];
        
        // Add individual position tabs dynamically
        const individualPositions = Array.from(positions).sort();
        individualPositions.forEach((pos, index) => {
            // Determine priority based on common position order
            let priority = 10; // Default priority for uncommon positions
            
            if (pos === 'QB') priority = 3;
            else if (pos === 'RB') priority = 4;
            else if (pos === 'WR') priority = 5;
            else if (pos === 'TE') priority = 6;
            else if (pos === 'K') priority = 7;
            else if (pos === 'DEF') priority = 8;
            else if (pos.includes('/')) priority = 9; // Hybrid positions like WR/TE, RB/WR
            
            // Create human-readable label for hybrid positions
            let label = pos;
            if (pos.includes('/')) {
                // Convert "WR/TE" to "WR/TE", "RB/WR" to "RB/WR", etc.
                label = pos.split('/').join('/');
            } else {
                // Standard position labels
                const positionLabels = {
                    'QB': 'QB',
                    'RB': 'RB', 
                    'WR': 'WR',
                    'TE': 'TE',
                    'K': 'K',
                    'DEF': 'DEF'
                };
                label = positionLabels[pos] || pos;
            }
            
            baseTabOrder.push({
                key: pos,
                label: label,
                filter: (p) => p.position === pos,
                priority: priority
            });
        });
        
        // Only show tabs that have players (except ALL which always shows)
        const availableTabs = baseTabOrder.filter(tab => {
            if (tab.key === 'ALL') return true;
            return this.state.players.some(tab.filter);
        });
        
        // Sort by priority
        availableTabs.sort((a, b) => a.priority - b.priority);
        
        tabsContainer.innerHTML = availableTabs.map((tab, index) => `
            <button class="position-tab ${index === 0 ? 'active' : ''}" data-position="${tab.key}">
                ${tab.label}
            </button>
        `).join('');
        
        // Add click handlers
        tabsContainer.querySelectorAll('.position-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const position = tab.dataset.position;
                this.filterByPosition(position);
            });
        });
        
        // Set initial filter
        this.state.currentPosition = 'ALL';
        this.state.filteredPlayers = this.state.players;
        
        console.log('✅ Created position tabs:', availableTabs.map(t => `${t.key} (${t.label})`));
    }
    
    /**
     * Filter players by position (enhanced for hybrid positions)
     */
    filterByPosition(position) {
        console.log('🔍 Filtering by position:', position);
        
        // Update active tab
        document.querySelectorAll('.position-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-position="${position}"]`)?.classList.add('active');
        
        // Filter players based on position
        switch (position) {
            case 'ALL':
                this.state.filteredPlayers = this.state.players;
                break;
            case 'SUPER_FLEX':
                this.state.filteredPlayers = this.state.players.filter(player => 
                    ['QB', 'RB', 'WR', 'TE'].includes(player.position)
                );
                break;
            case 'FLEX':
                this.state.filteredPlayers = this.state.players.filter(player => 
                    ['RB', 'WR', 'TE'].includes(player.position)
                );
                break;
            default:
                // Handle both standard positions and hybrid positions like WR/TE, RB/WR
                if (position.includes('/')) {
                    // For hybrid positions, show players that match the exact hybrid position
                    this.state.filteredPlayers = this.state.players.filter(player => 
                        player.position === position
                    );
                } else {
                    // Standard single position filter
                    this.state.filteredPlayers = this.state.players.filter(player => 
                        player.position === position
                    );
                }
        }
        
        // Maintain ranking sort order within filtered results (all players have rankings now)
        this.state.filteredPlayers.sort((a, b) => {
            return a.ranking.overall_rank - b.ranking.overall_rank;
        });
        
        this.state.currentPosition = position;
        
        // Re-render players
        this.renderPlayersList();
    }
    
    /**
     * Render players with tabs layout
     */
    renderPlayers() {
        // Create tabs first
        this.createPositionTabs();
        
        // Then render the player list
        this.renderPlayersList();
        
        console.log('✅ Rendered players with tabs for', this.state.players.length, 'total players');
    }
    
    /**
     * Render the actual players list
     */
    renderPlayersList() {
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        if (this.state.filteredPlayers.length === 0) {
            playersList.innerHTML = `
                <div class="loading-players">
                    <sl-icon name="hourglass"></sl-icon>
                    Loading players...
                </div>
            `;
            return;
        }
        
        playersList.innerHTML = this.state.filteredPlayers.map(player => {
            const injuryStatus = player.injury_status ? ` (${player.injury_status})` : '';
            
            // Handle hybrid positions for CSS classes
            const positionClass = player.position.replace('/', '-'); // WR/TE becomes WR-TE
            
            // Get ranking information
            // Get ranking information (all players have this now)
            const ranking = player.ranking;
            const rankDisplay = ranking.overall_rank;
            const posRankDisplay = ranking.position_rank;
            const tierDisplay = ranking.tier ? `T${ranking.tier}` : '';
            const byeDisplay = ranking.bye_week ? `${ranking.bye_week}` : '';
            
            // Value shows 0 if no value specified in CSV
            const valueDisplay = ranking.value || ranking.overall_rank || 0;
            
            // Position display with rank in same line and color
            const positionDisplay = posRankDisplay ? 
                `${player.position} ${posRankDisplay}` : 
                player.position;
            
            // Status shows "Bye Week" if player is on bye, otherwise availability
            const statusDisplay = byeDisplay && byeDisplay !== '' ? 
                'Bye Week' : 
                (player.status === 'available' ? 'Available' : 'Drafted');
            
            return `
                <div class="player-row position-${player.position} ${player.status}" data-player-id="${player.player_id}">
                    <div class="player-rank">${rankDisplay}</div>
                    <div class="player-name">
                        ${player.full_name}${injuryStatus}
                        ${tierDisplay ? `<span class="tier-badge">${tierDisplay}</span>` : ''}
                    </div>
                    <div class="player-position ${player.position}" data-position="${player.position}">
                        ${positionDisplay}
                    </div>
                    <div class="player-team">${player.team}</div>
                    <div class="player-value">${valueDisplay}</div>
                    <div class="player-bye">${byeDisplay}</div>
                    <div class="player-status">
                        <span class="status-${player.status}">${statusDisplay}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers for player selection
        playersList.querySelectorAll('.player-row').forEach(row => {
            if (!row.classList.contains('drafted')) {
                row.addEventListener('click', () => {
                    const playerId = row.dataset.playerId;
                    this.handlePlayerSelect(playerId);
                });
            }
        });
        
        console.log('✅ Rendered', this.state.filteredPlayers.length, 'players for position:', this.state.currentPosition);
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
    
    /**
     * Wait for Shoelace components to be fully loaded
     */
    async waitForShoelaceComponents() {
        return new Promise((resolve) => {
            // Check if Shoelace components are defined
            const checkComponents = () => {
                if (customElements.get('sl-select') && customElements.get('sl-option')) {
                    resolve();
                } else {
                    setTimeout(checkComponents, 50);
                }
            };
            checkComponents();
        });
    }
    
    /**
     * Initialize rankings selector
     */
    async initializeRankingsSelector() {
        try {
            console.log('🏈 Initializing rankings selector...');
            
            const rankingsSelect = document.getElementById('rankings-select');
            if (!rankingsSelect) {
                console.warn('⚠️ Rankings selector not found');
                return;
            }
            
            // Load available rankings
            const rankings = await this.rankingsService.getAvailableRankings();
            
            // Clear existing options by setting innerHTML
            rankingsSelect.innerHTML = '';
            
            // Create options HTML string instead of DOM manipulation
            let optionsHTML = '<sl-option value="">Select Rankings</sl-option>';
            
            // Group rankings by type
            const builtInRankings = rankings.filter(r => r.type === 'built-in');
            const customRankings = rankings.filter(r => r.type === 'custom');
            
            // Add built-in rankings
            if (builtInRankings.length > 0) {
                optionsHTML += '<sl-option-group label="Built-in Rankings">';
                builtInRankings.forEach(ranking => {
                    const displayName = `${ranking.name} (${ranking.scoring} - ${ranking.format})`;
                    optionsHTML += `<sl-option value="${ranking.id}">${displayName}</sl-option>`;
                });
                optionsHTML += '</sl-option-group>';
            }
            
            // Add custom rankings
            if (customRankings.length > 0) {
                optionsHTML += '<sl-option-group label="Custom Rankings">';
                customRankings.forEach(ranking => {
                    optionsHTML += `<sl-option value="${ranking.id}">${ranking.name}</sl-option>`;
                });
                optionsHTML += '</sl-option-group>';
            }
            
            // Set the HTML and let Shoelace handle the component updates
            rankingsSelect.innerHTML = optionsHTML;
            
            // Wait for Shoelace to process the new options
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Auto-select first built-in ranking if available
            if (builtInRankings.length > 0) {
                rankingsSelect.value = builtInRankings[0].id;
                
                // Trigger the change event manually since we set the value programmatically
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.handleRankingSelection(builtInRankings[0].id);
            }
            
            console.log(`✅ Rankings selector initialized with ${rankings.length} options`);
            
        } catch (error) {
            console.error('❌ Error initializing rankings selector:', error);
        }
    }
    
    /**
     * Handle ranking selection
     */
    async handleRankingSelection(rankingId) {
        try {
            if (!rankingId) {
                this.state.currentRankings = null;
                console.log('🏈 Cleared ranking selection');
                return;
            }
            
            console.log(`🏈 Loading rankings: ${rankingId}`);
            
            // Load ranking data
            const rankingData = await this.rankingsService.getRankingData(rankingId);
            this.state.currentRankings = rankingData;
            
            // Update player list with rankings
            this.updatePlayersWithRankings();
            
            console.log(`✅ Rankings loaded: ${rankingData.totalPlayers} players`);
            
        } catch (error) {
            console.error('❌ Error loading rankings:', error);
            this.uiUtils?.showError?.('Failed to load rankings: ' + error.message);
        }
    }
    
    /**
     * Create players from CSV rankings data
     */
    createPlayersFromRankings() {
        if (!this.state.currentRankings) {
            console.warn('⚠️ No rankings loaded, cannot create players');
            return [];
        }
        
        console.log('🏈 Creating players from CSV rankings...');
        
        const players = [];
        const rankingsData = this.rankingsService.getCurrentRankingsData();
        
        if (!rankingsData || !rankingsData.length) {
            console.warn('⚠️ No rankings data available');
            return [];
        }
        
        // Create player objects directly from CSV data
        rankingsData.forEach((rankingEntry, index) => {
            const player = {
                player_id: `csv_player_${index + 1}`,
                full_name: rankingEntry.player_name,
                position: rankingEntry.position,
                team: rankingEntry.team || 'UNK', // Some CSVs might not have team
                rank: rankingEntry.overall_rank,
                adp: rankingEntry.overall_rank.toString(),
                status: 'available',
                ranking: {
                    overall_rank: rankingEntry.overall_rank,
                    position_rank: rankingEntry.position_rank,
                    tier: rankingEntry.tier,
                    bye_week: rankingEntry.bye_week,
                    value: rankingEntry.value || 0 // Default to 0 if no value specified
                }
            };
            
            players.push(player);
        });
        
        // Sort by overall rank
        players.sort((a, b) => a.ranking.overall_rank - b.ranking.overall_rank);
        
        console.log(`✅ Created ${players.length} players from CSV rankings`);
        return players;
    }
    
    /**
     * Update players with ranking data (legacy method - now creates from CSV)
     */
    updatePlayersWithRankings() {
        if (!this.state.currentRankings) {
            return;
        }
        
        console.log('🏈 Creating players from CSV rankings...');
        
        // Create players directly from CSV instead of matching mock players
        const csvPlayers = this.createPlayersFromRankings();
        
        // Update state with CSV-generated players
        this.state.players = csvPlayers;
        this.state.filteredPlayers = [...csvPlayers];
        
        // Re-filter and display players
        this.filterByPosition(this.state.currentPosition);
        
        console.log('✅ Players created from CSV rankings and displayed');
    }
    
    /**
     * Show upload dialog
     */
    showUploadDialog() {
        const dialog = document.getElementById('upload-dialog');
        if (dialog) {
            dialog.show();
        }
    }
    
    /**
     * Setup upload dialog handlers
     */
    setupUploadDialogHandlers() {
        const dialog = document.getElementById('upload-dialog');
        const fileInput = document.getElementById('ranking-file');
        const nameInput = document.getElementById('ranking-name');
        const scoringSelect = document.getElementById('scoring-type');
        const formatSelect = document.getElementById('format-type');
        const cancelBtn = document.getElementById('cancel-upload');
        const confirmBtn = document.getElementById('confirm-upload');
        const previewDiv = document.getElementById('upload-preview');
        const previewContent = document.getElementById('preview-content');
        
        if (!dialog) return;
        
        // File selection handler
        if (fileInput) {
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    try {
                        const preview = await this.rankingsService.parseCSVFile(file);
                        this.showFilePreview(preview, previewDiv, previewContent);
                        if (confirmBtn) confirmBtn.disabled = false;
                    } catch (error) {
                        console.error('❌ Error parsing CSV:', error);
                        this.uiUtils?.showError?.('Invalid CSV file: ' + error.message);
                        if (confirmBtn) confirmBtn.disabled = true;
                    }
                }
            });
        }
        
        // Cancel button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.resetUploadDialog();
                dialog.hide();
            });
        }
        
        // Confirm upload button
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                await this.handleFileUpload();
                dialog.hide();
            });
        }
    }
    
    /**
     * Show file preview
     */
    showFilePreview(preview, previewDiv, previewContent) {
        if (!previewDiv || !previewContent) return;
        
        let html = `<strong>Headers:</strong> ${preview.headers.join(', ')}<br><br>`;
        html += `<strong>Sample Data (${preview.previewRows.length} of ${preview.totalRows} rows):</strong><br>`;
        
        preview.previewRows.forEach((row, index) => {
            html += `<br><strong>Row ${index + 1}:</strong><br>`;
            Object.entries(row).forEach(([key, value]) => {
                html += `  ${key}: ${value}<br>`;
            });
        });
        
        previewContent.innerHTML = html;
        previewDiv.style.display = 'block';
    }
    
    /**
     * Handle file upload
     */
    async handleFileUpload() {
        try {
            const fileInput = document.getElementById('ranking-file');
            const nameInput = document.getElementById('ranking-name');
            const scoringSelect = document.getElementById('scoring-type');
            const formatSelect = document.getElementById('format-type');
            
            if (!fileInput?.files[0]) {
                throw new Error('No file selected');
            }
            
            const file = fileInput.files[0];
            const metadata = {
                name: nameInput?.value || '',
                scoring: scoringSelect?.value || 'custom',
                format: formatSelect?.value || 'custom'
            };
            
            console.log('📤 Uploading ranking file...');
            
            const result = await this.rankingsService.uploadRanking(file, metadata);
            
            console.log('✅ File uploaded successfully:', result);
            
            // Refresh rankings selector
            await this.initializeRankingsSelector();
            
            // Auto-select the uploaded ranking
            const rankingsSelect = document.getElementById('rankings-select');
            if (rankingsSelect && result.id) {
                rankingsSelect.value = result.id;
                await this.handleRankingSelection(result.id);
            }
            
            this.resetUploadDialog();
            this.uiUtils?.showSuccess?.('Rankings uploaded successfully!');
            
        } catch (error) {
            console.error('❌ Error uploading file:', error);
            this.uiUtils?.showError?.('Failed to upload file: ' + error.message);
        }
    }
    
    /**
     * Reset upload dialog
     */
    resetUploadDialog() {
        const fileInput = document.getElementById('ranking-file');
        const nameInput = document.getElementById('ranking-name');
        const scoringSelect = document.getElementById('scoring-type');
        const formatSelect = document.getElementById('format-type');
        const confirmBtn = document.getElementById('confirm-upload');
        const previewDiv = document.getElementById('upload-preview');
        
        if (fileInput) fileInput.value = '';
        if (nameInput) nameInput.value = '';
        if (scoringSelect) scoringSelect.value = 'custom';
        if (formatSelect) formatSelect.value = 'custom';
        if (confirmBtn) confirmBtn.disabled = true;
        if (previewDiv) previewDiv.style.display = 'none';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftHandlers;
}
