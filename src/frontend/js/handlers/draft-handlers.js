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
            rosteredPlayerIds: new Set(),
            sleeperPlayerMap: new Map(),
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
        
        // Auto-populate league selection if we have user data
        this.autoPopulateLeagueSelection();
        
        // Reset state
        this.state.currentDraft = null;
        this.state.currentLeague = null;
        this.state.players = [];
        this.state.filteredPlayers = [];
        
        console.log('✅ Returned to league selection');
    }
    
    /**
     * Auto-populate league selection when returning from draft view
     */
    async autoPopulateLeagueSelection() {
        console.log('🔄 Auto-populating league selection...');
        
        try {
            // Check if we have current user data in global state
            let currentUser = null;
            let selectedSeason = '2025';
            
            // Try to get user data from global app state
            if (window.app && window.app.state) {
                currentUser = window.app.state.currentUser;
                selectedSeason = window.app.state.selectedSeason || '2025';
                console.log('📊 Found user data in global state:', currentUser?.username);
            }
            
            // Try to get user data from landing handlers state
            if (!currentUser && this.landingHandlers && this.landingHandlers.state) {
                currentUser = this.landingHandlers.state.currentUser;
                selectedSeason = this.landingHandlers.state.selectedSeason || '2025';
                console.log('📊 Found user data in landing handlers state:', currentUser?.username);
            }
            
            // If we have user data, trigger league reload
            if (currentUser && currentUser.username && this.landingHandlers) {
                console.log('✅ Auto-populating leagues for user:', currentUser.username, 'season:', selectedSeason);
                
                // Call the landing handlers to reload the user's leagues
                await this.landingHandlers.handleUserSearch(currentUser.username, selectedSeason);
                
                console.log('✅ League selection auto-populated successfully');
            } else {
                console.log('ℹ️ No user data available for auto-population');
                
                // Show the user setup section if no user data is available
                const userSetupSection = document.getElementById('user-setup-section');
                const leaguesSection = document.getElementById('leagues-section');
                
                if (userSetupSection) {
                    userSetupSection.style.display = 'block';
                    console.log('✅ Showing user setup section');
                }
                
                if (leaguesSection) {
                    leaguesSection.style.display = 'none';
                    console.log('✅ Hiding leagues section');
                }
            }
            
        } catch (error) {
            console.error('❌ Error auto-populating league selection:', error);
            
            // Fallback: show user setup section
            const userSetupSection = document.getElementById('user-setup-section');
            if (userSetupSection) {
                userSetupSection.style.display = 'block';
            }
        }
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
                    console.log('🔍 Sample draft pick:', response.draft_info.picks[0]);
                } else {
                    console.log('⚠️ No draft picks found in response');
                    console.log('🔍 Draft info structure:', response.draft_info);
                    
                    // Try to load draft picks directly from Sleeper API
                    this.loadDraftPicksFromSleeper();
                }
                
                // Load roster data for dynasty leagues
                if (response.league_info) {
                    this.loadRosterData(response.league_info);
                }
                
                // Load Sleeper player database for better ID mapping
                await this.loadSleeperPlayerData();
                
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
                
                // Filter out drafted players
                players = this.filterDraftedPlayers(players);
                
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
     * Load draft picks directly from Sleeper API as fallback
     */
    async loadDraftPicksFromSleeper() {
        if (!this.state.currentDraft || !this.state.currentDraft.draft_id) {
            console.log('⚠️ No draft ID available for loading picks');
            return;
        }
        
        try {
            console.log('📡 Loading draft picks directly from Sleeper API...');
            const draftId = this.state.currentDraft.draft_id;
            
            // Call Sleeper API directly
            const response = await fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`);
            
            if (response.ok) {
                const picks = await response.json();
                this.state.draftPicks = picks || [];
                console.log('✅ Draft picks loaded from Sleeper:', picks.length, 'picks');
                
                if (picks.length > 0) {
                    console.log('🔍 Sample Sleeper pick:', picks[0]);
                    // Refresh the player list with new draft picks
                    this.refreshPlayersAfterDraft();
                }
            } else {
                console.log('⚠️ Failed to load draft picks from Sleeper API');
            }
        } catch (error) {
            console.error('❌ Error loading draft picks from Sleeper:', error);
        }
    }
    
    /**
     * Load roster data for dynasty leagues
     */
    async loadRosterData(leagueInfo) {
        if (!leagueInfo || !leagueInfo.league_id) {
            console.log('⚠️ No league ID available for loading rosters');
            return;
        }
        
        try {
            console.log('📡 Loading roster data for dynasty league...');
            const leagueId = leagueInfo.league_id;
            
            // Call Sleeper API to get all rosters
            const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
            
            if (response.ok) {
                const rosters = await response.json();
                
                // Extract all rostered player IDs
                const rosteredPlayerIds = new Set();
                rosters.forEach(roster => {
                    if (roster.players) {
                        roster.players.forEach(playerId => {
                            rosteredPlayerIds.add(playerId);
                        });
                    }
                });
                
                this.state.rosteredPlayerIds = rosteredPlayerIds;
                console.log('✅ Roster data loaded:', rosteredPlayerIds.size, 'rostered players');
                console.log('🔍 Sample rostered player IDs:', Array.from(rosteredPlayerIds).slice(0, 10));
                
                // Debug: Check if problematic players are in roster
                const problematicPlayerIds = ['4881', '5859', '4866']; // Common IDs for Lamar, DJ Moore, Montgomery
                console.log('🔍 Checking if problematic players are rostered:');
                problematicPlayerIds.forEach(id => {
                    if (rosteredPlayerIds.has(id)) {
                        console.log(`  ✅ Player ID ${id} IS rostered`);
                    } else {
                        console.log(`  ❌ Player ID ${id} NOT rostered`);
                    }
                });
                
                // Refresh the player list with roster filtering
                this.refreshPlayersAfterDraft();
                
            } else {
                console.log('⚠️ Failed to load roster data from Sleeper API');
            }
        } catch (error) {
            console.error('❌ Error loading roster data from Sleeper:', error);
        }
    }
    
    /**
     * Load mock players as fallback
     */
    async loadMockPlayers() {
        console.log('📡 Loading mock player data...');
        
        let mockPlayers = this.generateMockPlayers();
        
        // Filter out drafted players
        mockPlayers = this.filterDraftedPlayers(mockPlayers);
        
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
                ranking: {
                    overall_rank: index + 1,
                    position_rank: Math.floor(index / 5) + 1,
                    tier: Math.ceil((index + 1) / 12),
                    bye_week: Math.floor(Math.random() * 8) + 5,
                    value: index + 1
                },
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
                ranking: {
                    overall_rank: i + 1,
                    position_rank: Math.floor((i - realPlayers.length) / 5) + 1,
                    tier: Math.ceil((i + 1) / 12),
                    bye_week: Math.floor(Math.random() * 8) + 5,
                    value: i + 1
                },
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
            
            // Debug: Show ranking info
            console.log(`✅ Rankings loaded: ${rankingData.totalPlayers} players`);
            console.log(`📊 Ranking ID: ${rankingId}`);
            
            // Show sample of players for debugging
            const samplePlayers = this.rankingsService.getCurrentRankingsData().slice(0, 10);
            console.log('🔍 Sample players from rankings:');
            samplePlayers.forEach((player, index) => {
                console.log(`  ${index + 1}. ${player.player_name} (${player.position}, ${player.team}) - Rank ${player.overall_rank}`);
            });
            
            // Update player list with rankings
            this.updatePlayersWithRankings();
            
            console.log(`✅ Rankings applied: ${rankingId}`);
            
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
        
        let players = [];
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
        
        // Filter out drafted players
        players = this.filterDraftedPlayers(players);
        
        console.log(`✅ Created ${players.length} players from CSV rankings`);
        return players;
    }
    
    /**
     * Filter out players who have already been drafted or are on rosters (dynasty)
     */
    filterDraftedPlayers(players) {
        const hasDraftPicks = this.state.draftPicks && this.state.draftPicks.length > 0;
        const hasRosteredPlayers = this.state.rosteredPlayerIds && this.state.rosteredPlayerIds.size > 0;
        
        if (!hasDraftPicks && !hasRosteredPlayers) {
            console.log('📋 No draft picks or roster data to filter against');
            return players;
        }
        
        // Get list of drafted player IDs and names
        const draftedPlayerIds = new Set();
        const draftedPlayerNames = new Set();
        
        // Add draft picks
        if (hasDraftPicks) {
            this.state.draftPicks.forEach(pick => {
                // Handle Sleeper API format
                if (pick.player_id) {
                    draftedPlayerIds.add(pick.player_id);
                }
                
                // Handle different metadata formats
                if (pick.metadata) {
                    // Format 1: first_name + last_name
                    if (pick.metadata.first_name && pick.metadata.last_name) {
                        const fullName = `${pick.metadata.first_name} ${pick.metadata.last_name}`;
                        draftedPlayerNames.add(fullName.toLowerCase());
                    }
                    // Format 2: full_name
                    if (pick.metadata.full_name) {
                        draftedPlayerNames.add(pick.metadata.full_name.toLowerCase());
                    }
                }
                
                // Handle direct player name in pick object
                if (pick.player_name) {
                    draftedPlayerNames.add(pick.player_name.toLowerCase());
                }
            });
        }
        
        // Add rostered players (dynasty leagues)
        if (hasRosteredPlayers) {
            this.state.rosteredPlayerIds.forEach(playerId => {
                draftedPlayerIds.add(playerId);
            });
        }
        
        console.log('🚫 Draft picks to filter:', this.state.draftPicks?.length || 0);
        console.log('🚫 Rostered players to filter:', this.state.rosteredPlayerIds?.size || 0);
        console.log('🚫 Total player IDs to filter:', draftedPlayerIds.size);
        console.log('🚫 Player names to filter:', draftedPlayerNames.size);
        
        // Filter out drafted/rostered players
        const availablePlayers = players.filter(player => {
            // Debug specific problematic players
            const isProblematicPlayer = ['lamar jackson', 'dj moore', 'd.j. moore', 'david montgomery'].includes(player.full_name.toLowerCase());
            
            if (isProblematicPlayer) {
                console.log(`🔍 Debugging ${player.full_name}:`);
                console.log(`  Player ID: ${player.player_id}`);
                console.log(`  Position: ${player.position}`);
                console.log(`  Team: ${player.team}`);
            }
            
            // Check by player ID first (most reliable)
            if (draftedPlayerIds.has(player.player_id)) {
                if (isProblematicPlayer) {
                    console.log(`  ✅ Filtered by direct ID match: ${player.player_id}`);
                }
                console.log(`🚫 Filtered out by ID: ${player.full_name} (${player.player_id})`);
                return false;
            }
            
            // Try to map CSV player name to Sleeper ID using multiple variations
            if (this.state.sleeperPlayerMap && this.state.sleeperPlayerMap.size > 0) {
                const nameVariations = this.generateNameVariations(player.full_name);
                
                if (isProblematicPlayer) {
                    console.log(`  Name variations:`, nameVariations);
                }
                
                for (const variation of nameVariations) {
                    const playerMatches = this.state.sleeperPlayerMap.get(variation);
                    if (playerMatches && playerMatches.length > 0) {
                        if (isProblematicPlayer) {
                            console.log(`  Found ${playerMatches.length} matches for ${variation}:`);
                            playerMatches.forEach(match => {
                                console.log(`    - ${match.full_name} (${match.position}, ${match.team}) [ID: ${match.id}]`);
                            });
                        }
                        
                        // Find the best match based on position and team
                        let bestMatch = null;
                        
                        // First, try to match by position and team
                        if (player.position && player.team) {
                            bestMatch = playerMatches.find(match => 
                                match.position === player.position && match.team === player.team
                            );
                        }
                        
                        // If no exact match, try position only
                        if (!bestMatch && player.position) {
                            bestMatch = playerMatches.find(match => match.position === player.position);
                        }
                        
                        // If still no match, use the first one (fallback)
                        if (!bestMatch) {
                            bestMatch = playerMatches[0];
                        }
                        
                        if (bestMatch) {
                            if (isProblematicPlayer) {
                                console.log(`  Best match: ${bestMatch.full_name} (${bestMatch.position}, ${bestMatch.team}) [ID: ${bestMatch.id}]`);
                                console.log(`  Is ${bestMatch.id} in draftedPlayerIds?`, draftedPlayerIds.has(bestMatch.id));
                            }
                            
                            if (draftedPlayerIds.has(bestMatch.id)) {
                                if (isProblematicPlayer) {
                                    console.log(`  ✅ Should be filtered by mapped ID!`);
                                }
                                console.log(`🚫 Filtered out by mapped ID: ${player.full_name} (${variation}) -> ${bestMatch.id} (${bestMatch.position}, ${bestMatch.team})`);
                                return false;
                            }
                        }
                    }
                }
                
                if (isProblematicPlayer) {
                    console.log(`  ❌ No matching rostered ID found - player is available`);
                }
            }
            
            // Check by name variations (fallback)
            const playerNameVariations = this.generateNameVariations(player.full_name);
            for (const draftedName of draftedPlayerNames) {
                const draftedNameVariations = this.generateNameVariations(draftedName);
                
                // Check if any variation of the player name matches any variation of drafted names
                for (const playerVar of playerNameVariations) {
                    for (const draftedVar of draftedNameVariations) {
                        if (playerVar === draftedVar) {
                            if (isProblematicPlayer) {
                                console.log(`  ✅ Filtered by name variation: ${playerVar} = ${draftedVar}`);
                            }
                            console.log(`🚫 Filtered out by name variation: ${player.full_name} (${playerVar} = ${draftedVar})`);
                            return false;
                        }
                    }
                }
            }
            
            if (isProblematicPlayer) {
                console.log(`  ✅ Player passes all filters - showing as available`);
            }
            
            return true;
        });
        
        const filteredCount = players.length - availablePlayers.length;
        if (filteredCount > 0) {
            console.log(`🚫 Filtered out ${filteredCount} drafted/rostered players (${availablePlayers.length} available)`);
        } else {
            console.log(`📋 No players filtered - all ${players.length} players still available`);
        }
        
        return availablePlayers;
    }
    
    /**
     * Normalize player name for better matching
     */
    normalizePlayerName(name) {
        if (!name) return '';
        
        let normalized = name
            .toLowerCase()
            .trim()
            // Remove common suffixes
            .replace(/\s+(jr\.?|sr\.?|iii?|iv)$/i, '')
            // Remove periods and apostrophes
            .replace(/[.']/g, '')
            // Replace multiple spaces with single space
            .replace(/\s+/g, ' ');
        
        // Handle common nickname variations
        const nicknameMap = {
            // Common nicknames
            'mike': 'michael',
            'bob': 'robert',
            'bill': 'william',
            'tom': 'thomas',
            'jim': 'james',
            'dave': 'david',
            'chris': 'christopher',
            'matt': 'matthew',
            'dan': 'daniel',
            'steve': 'steven',
            'joe': 'joseph',
            'tony': 'anthony',
            'rick': 'richard',
            'rob': 'robert',
            'tim': 'timothy',
            'pat': 'patrick',
            'nick': 'nicholas',
            'alex': 'alexander',
            'ben': 'benjamin',
            'sam': 'samuel',
            
            // NFL-specific nickname mappings
            'cam': 'cameron',
            'hollywood': 'marquise',
            'hollywood brown': 'marquise brown',
            'marquise brown': 'hollywood brown', // Bidirectional
            'cameron skattebo': 'cam skattebo', // Bidirectional
            'cam skattebo': 'cameron skattebo',
            
            // Other common NFL nicknames
            'ceedee': 'cedarian',
            'dk': 'decaylin',
            'aj': 'allen',
            'tj': 'thomas',
            'cj': 'calvin',
            'dj': 'david',
            'rj': 'ronald',
            'jj': 'justin',
            'oj': 'orenthal',
            'pj': 'paul',
            'kj': 'kevin',
            'mj': 'michael',
            'lj': 'larry',
            'bj': 'bobby',
            'jk': 'john',
            'ck': 'calvin',
            'dk metcalf': 'decaylin metcalf',
            'ceedee lamb': 'cedarian lamb',
            'aj brown': 'allen brown',
            'dj moore': 'david moore',
            'cj stroud': 'calvin stroud',
            'tj watt': 'thomas watt'
        };
        
        // Apply nickname mappings
        for (const [nickname, fullName] of Object.entries(nicknameMap)) {
            if (normalized === nickname) {
                normalized = fullName;
                break;
            }
            // Also check if the nickname is part of the name
            if (normalized.includes(nickname)) {
                normalized = normalized.replace(nickname, fullName);
            }
        }
        
        return normalized;
    }
    
    /**
     * Generate multiple name variations for better matching
     */
    generateNameVariations(name) {
        if (!name) return [];
        
        const variations = new Set();
        
        // Start with original name (basic normalization)
        let baseName = name.toLowerCase().trim()
            .replace(/\s+(jr\.?|sr\.?|iii?|iv)$/i, '') // Remove suffixes
            .replace(/\s+/g, ' '); // Normalize spaces
        
        variations.add(baseName);
        
        // Handle periods in initials (D.J. Moore -> DJ Moore, D J Moore, David Moore)
        let noPeriods = baseName.replace(/\./g, ''); // D.J. Moore -> DJ Moore
        variations.add(noPeriods);
        
        let spacedInitials = baseName.replace(/\./g, ' ').replace(/\s+/g, ' '); // D.J. Moore -> D J Moore
        variations.add(spacedInitials);
        
        // Split name and try different combinations
        const parts = noPeriods.split(' ');
        if (parts.length >= 2) {
            const firstName = parts[0];
            const lastName = parts[parts.length - 1];
            
            // Try first + last only
            variations.add(`${firstName} ${lastName}`);
            
            // Handle specific NFL player mappings
            const specificMappings = {
                // D.J. Moore variations (the WR is actually "DJ Moore" in Sleeper)
                'dj moore': ['david moore', 'dj moore', 'd j moore', 'dj moore'],
                'david moore': ['dj moore', 'd j moore', 'david moore'],
                'd j moore': ['dj moore', 'david moore', 'd j moore'],
                'd.j. moore': ['dj moore', 'david moore', 'd j moore'],
                
                // Other common D.J./DJ players
                'dj chark': ['david chark', 'dj chark', 'd j chark'],
                'david chark': ['dj chark', 'd j chark', 'david chark'],
                
                // A.J. variations
                'aj brown': ['allen brown', 'aj brown', 'a j brown'],
                'allen brown': ['aj brown', 'a j brown', 'allen brown'],
                'aj green': ['adriel green', 'aj green', 'a j green'],
                'adriel green': ['aj green', 'a j green', 'adriel green'],
                
                // T.J. variations  
                'tj watt': ['thomas watt', 'tj watt', 't j watt'],
                'thomas watt': ['tj watt', 't j watt', 'thomas watt'],
                'tj hockenson': ['thomas hockenson', 'tj hockenson', 't j hockenson'],
                'thomas hockenson': ['tj hockenson', 't j hockenson', 'thomas hockenson'],
                
                // C.J. variations
                'cj stroud': ['calvin stroud', 'cj stroud', 'c j stroud'],
                'calvin stroud': ['cj stroud', 'c j stroud', 'calvin stroud'],
                'cj anderson': ['calvin anderson', 'cj anderson', 'c j anderson'],
                'calvin anderson': ['cj anderson', 'c j anderson', 'calvin anderson'],
                
                // David/Dave variations
                'david montgomery': ['dave montgomery', 'david montgomery'],
                'dave montgomery': ['david montgomery', 'dave montgomery'],
                'david johnson': ['dave johnson', 'david johnson'],
                'dave johnson': ['david johnson', 'dave johnson'],
                
                // Cameron/Cam variations
                'cameron skattebo': ['cam skattebo', 'cameron skattebo'],
                'cam skattebo': ['cameron skattebo', 'cam skattebo'],
                'cameron newton': ['cam newton', 'cameron newton'],
                'cam newton': ['cameron newton', 'cam newton'],
                'cameron akers': ['cam akers', 'cameron akers'],
                'cam akers': ['cameron akers', 'cam akers'],
                
                // Marquise/Hollywood variations
                'marquise brown': ['hollywood brown', 'marquise brown'],
                'hollywood brown': ['marquise brown', 'hollywood brown'],
                
                // Other common variations
                'michael thomas': ['mike thomas', 'michael thomas'],
                'mike thomas': ['michael thomas', 'mike thomas'],
                'christopher godwin': ['chris godwin', 'christopher godwin'],
                'chris godwin': ['christopher godwin', 'chris godwin'],
                'matthew stafford': ['matt stafford', 'matthew stafford'],
                'matt stafford': ['matthew stafford', 'matt stafford'],
                'daniel jones': ['danny jones', 'dan jones', 'daniel jones'],
                'danny jones': ['daniel jones', 'dan jones', 'danny jones'],
                'dan jones': ['daniel jones', 'danny jones', 'dan jones']
            };
            
            // Add specific mappings
            const normalizedFullName = `${firstName} ${lastName}`;
            if (specificMappings[normalizedFullName]) {
                specificMappings[normalizedFullName].forEach(variation => {
                    variations.add(variation);
                });
            }
            
            // Try common nickname variations for first name
            const nicknameMap = {
                'cameron': 'cam', 'cam': 'cameron',
                'david': 'dave', 'dave': 'david',
                'michael': 'mike', 'mike': 'michael',
                'christopher': 'chris', 'chris': 'christopher',
                'matthew': 'matt', 'matt': 'matthew',
                'daniel': 'dan', 'dan': 'daniel', 'danny': 'daniel',
                'thomas': 'tom', 'tom': 'thomas',
                'james': 'jim', 'jim': 'james',
                'robert': 'bob', 'bob': 'robert',
                'william': 'bill', 'bill': 'william',
                'steven': 'steve', 'steve': 'steven',
                'anthony': 'tony', 'tony': 'anthony',
                'richard': 'rick', 'rick': 'richard',
                'timothy': 'tim', 'tim': 'timothy',
                'patrick': 'pat', 'pat': 'patrick',
                'nicholas': 'nick', 'nick': 'nicholas',
                'alexander': 'alex', 'alex': 'alexander',
                'benjamin': 'ben', 'ben': 'benjamin',
                'samuel': 'sam', 'sam': 'samuel',
                'joseph': 'joe', 'joe': 'joseph'
            };
            
            if (nicknameMap[firstName]) {
                variations.add(`${nicknameMap[firstName]} ${lastName}`);
            }
        }
        
        // Remove empty strings and return unique variations
        return Array.from(variations).filter(v => v && v.trim());
    }
    
    /**
     * Get Sleeper player data to map names to IDs
     */
    async loadSleeperPlayerData() {
        try {
            console.log('📡 Loading Sleeper player database for ID mapping...');
            
            // Load Sleeper's player database
            const response = await fetch('https://api.sleeper.app/v1/players/nfl');
            
            if (response.ok) {
                const players = await response.json();
                
                // Create name-to-ID mapping with multiple variations
                // Handle multiple players with same name by storing arrays of IDs
                const nameToIdsMap = new Map();
                
                Object.entries(players).forEach(([playerId, playerData]) => {
                    const names = [];
                    
                    // Collect all possible names
                    if (playerData.full_name) {
                        names.push(playerData.full_name);
                    }
                    
                    if (playerData.first_name && playerData.last_name) {
                        names.push(`${playerData.first_name} ${playerData.last_name}`);
                    }
                    
                    // Generate variations for each name
                    names.forEach(name => {
                        const variations = this.generateNameVariations(name);
                        variations.forEach(variation => {
                            if (!nameToIdsMap.has(variation)) {
                                nameToIdsMap.set(variation, []);
                            }
                            nameToIdsMap.get(variation).push({
                                id: playerId,
                                position: playerData.position,
                                team: playerData.team,
                                full_name: playerData.full_name || `${playerData.first_name} ${playerData.last_name}`
                            });
                        });
                    });
                });
                
                this.state.sleeperPlayerMap = nameToIdsMap;
                console.log('✅ Sleeper player database loaded:', nameToIdsMap.size, 'name variations mapped');
                
                // Debug specific problematic players
                const problematicPlayers = [
                    'lamar jackson', 'dj moore', 'd.j. moore', 'david moore', 'david montgomery', 'dave montgomery'
                ];
                
                console.log('🔍 Debugging problematic players:');
                problematicPlayers.forEach(name => {
                    const variations = this.generateNameVariations(name);
                    console.log(`  ${name}:`, variations);
                    
                    variations.forEach(variation => {
                        const playerMatches = nameToIdsMap.get(variation);
                        if (playerMatches && playerMatches.length > 0) {
                            console.log(`    ✅ ${variation} -> ${playerMatches.length} matches:`);
                            playerMatches.forEach(match => {
                                console.log(`      - ${match.full_name} (${match.position}, ${match.team}) [ID: ${match.id}]`);
                            });
                        }
                    });
                });
                
                return nameToIdsMap;
            } else {
                console.log('⚠️ Failed to load Sleeper player database');
                return new Map();
            }
        } catch (error) {
            console.error('❌ Error loading Sleeper player database:', error);
            return new Map();
        }
    }
    
    /**
     * Refresh the player list after draft picks or roster changes
     */
    refreshPlayersAfterDraft() {
        if (this.state.players && this.state.players.length > 0) {
            // Re-filter the current players (includes both draft picks and rosters)
            const filteredPlayers = this.filterDraftedPlayers(this.state.players);
            this.state.filteredPlayers = filteredPlayers;
            
            // Re-render the players
            this.renderPlayers();
            
            console.log('🔄 Refreshed player list after draft/roster changes');
        }
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
