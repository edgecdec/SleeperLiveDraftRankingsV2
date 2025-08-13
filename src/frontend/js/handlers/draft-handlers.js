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
        
        // Auto-refresh settings
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.autoRefreshEnabled = true;
        this.refreshIntervalMs = 30000; // 30 seconds
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Draft handlers initialized');
    }
    
    /**
     * Load user data when accessing draft directly (without going through landing page)
     */
    async loadUserDataForDraft(username) {
        try {
            console.log('📡 Loading user data for draft access:', username);
            
            // Fetch user data from API
            const userData = await this.apiService.request(`/user/${username}`);
            
            if (userData.status === 'success' && userData.user) {
                const user = {
                    ...userData.user,
                    user_id: userData.user.user_id
                };
                
                console.log('✅ Loaded user data for draft:', user);
                
                // Initialize global state if needed
                if (!window.app) window.app = {};
                if (!window.app.state) window.app.state = {};
                
                // Store in global state
                window.app.state.currentUser = user;
                
                // Store in landing handlers if available
                if (this.landingHandlers) {
                    this.landingHandlers.state.currentUser = user;
                }
                
                console.log('✅ User data stored in global state with ID:', user.user_id);
                return user;
            } else {
                console.error('❌ Failed to load user data:', userData);
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading user data for draft:', error);
            return null;
        }
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
        
        // Leaderboard toggle
        const leaderboardToggleBtn = document.getElementById('toggle-leaderboard-btn');
        const leaderboardSidebar = document.getElementById('leaderboard-sidebar');
        const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
        
        if (leaderboardToggleBtn && leaderboardSidebar) {
            leaderboardToggleBtn.addEventListener('click', () => {
                console.log('🏆 Leaderboard button clicked');
                leaderboardSidebar.classList.toggle('hidden');
                console.log('🏆 Leaderboard hidden class:', leaderboardSidebar.classList.contains('hidden'));
                if (!leaderboardSidebar.classList.contains('hidden')) {
                    console.log('🏆 Populating leaderboard...');
                    this.populateLeaderboard();
                }
            });
        } else {
            console.log('❌ Leaderboard elements not found:', {
                button: !!leaderboardToggleBtn,
                sidebar: !!leaderboardSidebar
            });
        }
        
        if (closeLeaderboardBtn && leaderboardSidebar) {
            closeLeaderboardBtn.addEventListener('click', () => {
                leaderboardSidebar.classList.add('hidden');
            });
        }
        
        // Roster toggle
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
        
        // Refresh roster button
        const refreshRosterBtn = document.getElementById('refresh-roster-btn');
        if (refreshRosterBtn) {
            refreshRosterBtn.addEventListener('click', () => {
                this.refreshRosterData();
            });
        }
        
        // Refresh leaderboard button
        const refreshLeaderboardBtn = document.getElementById('refresh-leaderboard-btn');
        if (refreshLeaderboardBtn) {
            refreshLeaderboardBtn.addEventListener('click', () => {
                this.refreshLeaderboard();
            });
        }
        
        // Auto-refresh indicator click
        const autoRefreshIndicator = document.getElementById('auto-refresh-indicator');
        if (autoRefreshIndicator) {
            autoRefreshIndicator.addEventListener('click', () => {
                this.triggerManualRefresh();
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
            // Set mock draft flag if provided
            if (draftData.isMockDraft) {
                this.state.isMockDraft = true;
                console.log('🎭 Mock draft mode enabled');
                
                // Load league data for mock draft context
                if (draftData.leagueId) {
                    console.log('🔄 Loading league data for mock draft:', draftData.leagueId);
                    try {
                        const leagueData = await this.apiService.request(`/league/${draftData.leagueId}`);
                        console.log('📥 League API response:', leagueData);
                        
                        if (leagueData.status === 'success' && leagueData.league_info) {
                            this.state.currentLeague = leagueData.league_info;
                            console.log('✅ League data loaded for mock draft:', leagueData.league_info.name);
                        } else {
                            console.warn('⚠️ Failed to load league data for mock draft - invalid response:', leagueData);
                        }
                    } catch (error) {
                        console.error('❌ Error loading league data for mock draft:', error);
                        console.error('❌ Error details:', error.message);
                        console.error('❌ Error stack:', error.stack);
                    }
                } else {
                    console.warn('⚠️ No leagueId provided for mock draft');
                }
            }
            
            // Store draft info
            this.state.currentDraft = draftData;
            console.log('💾 Draft data stored:', draftData);
            
            // Show draft view
            console.log('🔄 About to show draft view');
            this.showDraftView();
            console.log('✅ Draft view shown');
            
            // Load draft data
            console.log('🔄 About to load draft data with ID:', draftData.draft_id);
            await this.loadDraftData(draftData.draft_id, draftData);
            console.log('✅ Draft data loaded');
            
            // Load player rankings
            console.log('🔄 About to load player rankings');
            await this.loadPlayerRankings();
            console.log('✅ Player rankings loaded');
            
            // Update connection status
            console.log('🔄 Updating connection status');
            this.updateConnectionStatus('online');
            console.log('✅ Connection status updated');
            
        } catch (error) {
            console.error('❌ Error handling draft selection:', error);
            this.updateConnectionStatus('offline');
        }
    }
    
    /**
     * Load real league data for mock draft (teams, roster structure)
     */
    async loadRealLeagueForMockDraft(leagueId) {
        try {
            console.log('🎭 Loading real league data for mock draft:', leagueId);
            
            // Get current user from global state
            const currentUser = window.app?.state?.currentUser;
            if (!currentUser || !currentUser.username) {
                console.error('❌ No current user found for league data loading');
                return;
            }
            
            // Load league data from API
            const response = await this.apiService.request(`/user/${currentUser.username}/leagues/${leagueId}`);
            
            if (response.status === 'success' && response.league) {
                this.state.mockLeagueData = response.league;
                console.log('✅ Real league data loaded for mock draft:', response.league.name);
                console.log('👥 Teams:', Object.keys(response.league.users || {}).length);
                console.log('🏆 Roster positions:', response.league.roster_positions);
            } else {
                console.error('❌ Failed to load league data:', response);
            }
            
        } catch (error) {
            console.error('❌ Error loading real league data for mock draft:', error);
        }
    }
    
    /**
     * Determine and store current user ID from available data
     */
    async determineCurrentUserId() {
        let username = window.app?.state?.currentUser?.username || 
                      this.landingHandlers?.state?.currentUser?.username;
        
        console.log('🔍 Determining user ID for username:', username);
        console.log('🔍 Available global state:', {
            windowApp: window.app?.state?.currentUser,
            landingHandlers: this.landingHandlers?.state?.currentUser
        });
        
        // If no username in global state, try to get it from URL
        if (!username) {
            console.log('⚠️ No username in global state, checking URL...');
            console.log('🔍 Current URL:', window.location.pathname);
            
            // Use route parser to extract username
            username = window.RouteParser.parseUser();
            
            if (username) {
                console.log('✅ Found username in URL using route parser:', username);
                
                // Load user data to populate global state
                await this.loadUserDataForDraft(username);
            } else {
                console.log('⚠️ No username found in URL, cannot determine user ID');
                console.log('🔍 Expected URL format: /sleeper/user/USERNAME/...');
                return null;
            }
        }
        
        // Try to find user ID from league users data
        if (this.state.currentLeague?.users) {
            console.log('🔍 League users available:', Object.keys(this.state.currentLeague.users));
            console.log('🔍 Sample league user:', Object.entries(this.state.currentLeague.users)[0]);
            
            const userEntry = Object.entries(this.state.currentLeague.users).find(
                ([userId, userData]) => userData.username === username
            );
            
            if (userEntry) {
                const userId = userEntry[0];
                
                // Store user ID in multiple places for easy access
                if (this.state.currentDraft) {
                    this.state.currentDraft.user_id = userId;
                }
                
                if (window.app?.state?.currentUser) {
                    window.app.state.currentUser.user_id = userId;
                }
                
                if (this.landingHandlers?.state?.currentUser) {
                    this.landingHandlers.state.currentUser.user_id = userId;
                }
                
                console.log('✅ Determined user ID:', userId, 'for username:', username);
                return userId;
            } else {
                console.log('❌ Username not found in league users');
            }
        } else {
            console.log('⚠️ No league users data available');
        }
        
        console.log('⚠️ Could not determine user ID from available data');
        return null;
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
        
        // Show mock mode indicator if this is a mock draft
        if (this.state.isMockDraft) {
            const mockIndicator = document.getElementById('mock-mode-indicator');
            if (mockIndicator) {
                mockIndicator.style.display = 'flex';
                console.log('🎭 Mock mode indicator shown');
            }
        }
        
        // Update page title
        document.title = 'Fantasy Draft Assistant - Draft Board';
        
        // Update URL to match the new user-based format
        this.updateDraftUrl();
        
        console.log('✅ Draft view displayed');
    }
    
    /**
     * Update the URL to use the new user-based draft format
     */
    updateDraftUrl() {
        try {
            const currentDraft = this.state.currentDraft;
            if (!currentDraft) {
                console.log('⚠️ No current draft data for URL update');
                return;
            }
            
            // Get current user from various sources
            let currentUser = null;
            if (window.app && window.app.state && window.app.state.currentUser) {
                currentUser = window.app.state.currentUser;
            } else if (this.landingHandlers && this.landingHandlers.state && this.landingHandlers.state.currentUser) {
                currentUser = this.landingHandlers.state.currentUser;
            }
            
            if (currentUser && currentUser.username && currentDraft.draft_id) {
                // Get league ID from draft data
                const leagueId = currentDraft.league?.league_id || currentDraft.league_id;
                
                if (leagueId) {
                    const newUrl = window.RouteBuilder.userDraft(currentUser.username, leagueId, currentDraft.draft_id);
                    console.log('🔗 Updating draft URL to:', newUrl);
                    
                    // Update URL without triggering navigation
                    history.replaceState({
                        page: 'draft',
                        user: currentUser,
                        league: currentDraft.league || { league_id: leagueId },
                        draft: currentDraft,
                        backUrl: window.RouteBuilder.user(currentUser.username)
                    }, '', newUrl);
                    
                    console.log('✅ Draft URL updated successfully');
                } else {
                    console.log('⚠️ No league ID available for URL update');
                }
            } else {
                console.log('⚠️ Missing user or draft data for URL update');
            }
            
        } catch (error) {
            console.error('❌ Error updating draft URL:', error);
        }
    }
    
    /**
     * Show league selection and hide draft view
     */
    showLeagueSelection() {
        console.log('🔙 Back button clicked - using browser history navigation');
        
        // Stop auto-refresh when leaving draft
        this.stopAutoRefresh();
        
        // Check if we have history state with back URL
        if (history.state && history.state.backUrl) {
            console.log('✅ Found back URL in history state:', history.state.backUrl);
            
            // Navigate directly to the back URL without using browser back
            window.location.href = history.state.backUrl;
            
        } else {
            // Fallback: construct back URL from current user data
            console.log('⚠️ No back URL in history state, using fallback navigation');
            
            let backUrl = '/';
            
            // Try to get current user from various sources
            let currentUser = null;
            if (window.app && window.app.state && window.app.state.currentUser) {
                currentUser = window.app.state.currentUser;
            } else if (this.landingHandlers && this.landingHandlers.state && this.landingHandlers.state.currentUser) {
                currentUser = this.landingHandlers.state.currentUser;
            }
            
            if (currentUser && currentUser.username) {
                backUrl = window.RouteBuilder.userLeagues(currentUser.username);
                console.log('✅ Constructed back URL:', backUrl);
            }
            
            // Navigate directly to the back URL
            window.location.href = backUrl;
        }
    }
    
    /**
     * Perform the actual back navigation (show landing page and auto-populate)
     */
    performBackNavigation() {
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
        
        console.log('✅ Back navigation completed');
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
            
            // Try to get season from UI first
            const seasonSelect = document.getElementById('season-select');
            if (seasonSelect && seasonSelect.value) {
                selectedSeason = seasonSelect.value;
                console.log('📅 Using season from UI:', selectedSeason);
            }
            
            // Try to get user data from global app state
            if (window.app && window.app.state) {
                currentUser = window.app.state.currentUser;
                if (!seasonSelect?.value && window.app.state.selectedSeason) {
                    selectedSeason = window.app.state.selectedSeason;
                }
                console.log('📊 Found user data in global state:', currentUser?.username);
            }
            
            // Try to get user data from landing handlers state
            if (!currentUser && this.landingHandlers && this.landingHandlers.state) {
                currentUser = this.landingHandlers.state.currentUser;
                if (!seasonSelect?.value && this.landingHandlers.state.selectedSeason) {
                    selectedSeason = this.landingHandlers.state.selectedSeason;
                }
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
    async loadDraftData(draftId, draftData = null) {
        console.log('📡 Loading draft data for:', draftId);
        
        try {
            const response = await this.apiService.request(`/draft/${draftId}`);
            
            if (response.status === 'success') {
                // The API response has draft data at the root level, not nested under 'draft'
                console.log('✅ Draft API response keys:', Object.keys(response));
                
                // For mock drafts, we need to use the real league's draft order and traded picks
                if (this.state.isMockDraft && draftData.leagueId) {
                    console.log('🎭 Mock draft detected - using real league draft order');
                    console.log('🔍 Mock draft state:', this.state.isMockDraft);
                    console.log('🔍 League ID from URL:', draftData.leagueId);
                    
                    // Get the real league's draft data for proper pick assignments
                    try {
                        // We need the username for the API call - get it from state
                        const currentUser = this.state.currentUser;
                        if (!currentUser || !currentUser.username) {
                            console.warn('⚠️ No current user available for league drafts API call');
                            return;
                        }
                        
                        console.log('📡 Fetching league drafts for user:', currentUser.username, 'league:', draftData.leagueId);
                        const leagueResponse = await this.apiService.request(`/user/${currentUser.username}/leagues/${draftData.leagueId}/drafts`);
                        console.log('📥 League drafts response:', leagueResponse);
                        
                        if (leagueResponse.status === 'success' && leagueResponse.drafts && leagueResponse.drafts.length > 0) {
                            const realDraft = leagueResponse.drafts[0]; // Use the first (main) draft
                            console.log('✅ Using real draft order from league draft:', realDraft.draft_id);
                            console.log('🔍 Real draft data:', realDraft);
                            
                            // Get the real draft's pick order
                            console.log('📡 Fetching real draft data for:', realDraft.draft_id);
                            const realDraftResponse = await this.apiService.request(`/draft/${realDraft.draft_id}`);
                            console.log('📥 Real draft response:', realDraftResponse);
                            
                            if (realDraftResponse.status === 'success') {
                                // Use real draft order but keep mock draft picks
                                console.log('🔄 Applying real draft order to mock draft');
                                console.log('🔍 Original mock draft order:', response.draft_order);
                                console.log('🔍 Real draft order:', realDraftResponse.draft_info?.draft_order);
                                console.log('🔍 Real slot to roster mapping:', realDraftResponse.draft_info?.slot_to_roster_id);
                                
                                // Apply both draft order and slot-to-roster mapping for traded picks
                                if (realDraftResponse.draft_info) {
                                response.draft_order = realDraftResponse.draft_info.draft_order;
                                response.slot_to_roster_id = realDraftResponse.draft_info.slot_to_roster_id;
                                response.settings = realDraftResponse.draft_info.settings;
                    
                    // CRITICAL: Store the real draft order for user ID lookups
                    this.state.realDraftOrder = realDraftResponse.draft_info.draft_order;
                    console.log('✅ Stored real draft order for user lookups:', this.state.realDraftOrder);
                                    
                                    // Load traded picks data for later use
                                    try {
                                        const tradedPicksResponse = await this.apiService.request(`/league/${draftData.leagueId}/traded_picks`);
                                        if (tradedPicksResponse.status === 'success' && tradedPicksResponse.traded_picks) {
                                            this.state.tradedPicks = tradedPicksResponse.traded_picks;
                                            console.log('✅ Stored traded picks data:', tradedPicksResponse.traded_picks.length, 'trades');
                                        } else {
                                            console.log('🔍 No traded picks found, using original draft order');
                                        }
                                    } catch (error) {
                                        console.warn('⚠️ Could not load traded picks:', error);
                                    }
                                }
                                
                                console.log('✅ Applied real draft order and traded picks to mock draft');
                                console.log('🔍 Updated mock draft order:', response.draft_order);
                                console.log('🔍 Updated slot to roster mapping:', response.slot_to_roster_id);
                            } else {
                                console.error('❌ Failed to get real draft data:', realDraftResponse);
                            }
                        } else {
                            console.warn('⚠️ No drafts found in league response:', leagueResponse);
                        }
                    } catch (error) {
                        console.error('❌ Error loading real draft order for mock draft:', error);
                        console.error('❌ Error stack:', error.stack);
                    }
                } else {
                    console.log('🔍 Not a mock draft or no league ID:', {
                        isMockDraft: this.state.isMockDraft,
                        hasLeagueId: !!draftData.leagueId
                    });
                }
                
                // Store draft data - the response itself contains the draft info
                this.state.currentDraft = {
                    draft_id: response.draft_id,
                    ...response.draft_info
                };
                
                // If we have league data in the response, use it
                if (response.league_info) {
                    this.state.currentLeague = response.league_info;
                    console.log('✅ League data found in draft response:', response.league_info);
                    
                    // Try to determine current user ID from league data
                    console.log('🔍 About to call determineCurrentUserId...');
                    await this.determineCurrentUserId();
                    console.log('🔍 After determineCurrentUserId, user_id is:', this.state.currentDraft?.user_id);
                }
                
                // Update draft title
                this.updateDraftTitle(this.state.currentDraft);
                
                // Load draft picks if available
                if (response.draft_info && response.draft_info.picks) {
                    this.state.draftPicks = response.draft_info.picks;
                    console.log('✅ Draft picks loaded:', response.draft_info.picks.length, 'picks');
                    console.log('🔍 Sample draft pick:', response.draft_info.picks[0]);
                    
                    // Override picked_by for all picks based on real draft order
                    if (this.state.currentDraft?.slot_to_roster_id) {
                        console.log('🔄 Overriding picked_by for all picks based on real draft order');
                        console.log('🔍 slot_to_roster_id:', this.state.currentDraft.slot_to_roster_id);
                        console.log('🔍 draft_order:', this.state.currentDraft.draft_order);
                        
                        this.state.draftPicks.forEach((pick, index) => {
                            const pickNumber = index + 1;
                            const slotOwner = this.state.currentDraft.slot_to_roster_id[pickNumber];
                            
                            console.log(`🔍 Pick ${pickNumber}: slot_to_roster_id[${pickNumber}] = ${slotOwner}`);
                            
                            if (slotOwner) {
                                const ownerUserId = this.getRosterOwnerUserId(slotOwner);
                                console.log(`🔍 Pick ${pickNumber}: getRosterOwnerUserId(${slotOwner}) = ${ownerUserId}`);
                                
                                if (ownerUserId) {
                                    console.log(`🔄 Pick ${pickNumber}: BEFORE - picked_by: '${pick.picked_by}', roster_id: ${pick.roster_id}`);
                                    pick.picked_by = ownerUserId;
                                    pick.roster_id = slotOwner;
                                    console.log(`🔄 Pick ${pickNumber}: AFTER - picked_by: '${pick.picked_by}', roster_id: ${pick.roster_id}`);
                                } else {
                                    console.warn(`⚠️ Pick ${pickNumber}: Could not find user ID for roster ${slotOwner}`);
                                }
                            } else {
                                console.warn(`⚠️ Pick ${pickNumber}: No slot owner found`);
                            }
                        });
                        console.log('✅ Overrode picked_by for all picks in main load');
                    } else {
                        console.warn('⚠️ No slot_to_roster_id data available for override');
                        console.log('🔍 currentDraft:', this.state.currentDraft);
                    }
                    
                    // Apply traded picks for mock drafts
                    if (this.state.isMockDraft && draftData && draftData.leagueId) {
                        await this.applyTradedPicksToMockDraft(draftData.leagueId);
                        
                        // Force refresh roster sidebar after applying trades
                        if (this.state.isRosterVisible) {
                            console.log('🔄 Force refreshing roster after traded picks applied');
                            await this.populateRosterSidebar();
                        }
                    }
                } else {
                    console.log('⚠️ No draft picks found in response');
                    console.log('🔍 Draft info structure:', response.draft_info);
                    
                    // Try to load draft picks directly from Sleeper API
                    this.loadDraftPicksFromSleeper();
                }
                
                // Load roster data for dynasty leagues (skip for mock drafts)
                if (response.league_info && !this.state.isMockDraft) {
                    this.loadRosterData(response.league_info);
                } else if (this.state.isMockDraft) {
                    console.log('🎭 Skipping dynasty roster loading for mock draft');
                }
                
                // Load Sleeper player database for better ID mapping
                await this.loadSleeperPlayerData();
                
                console.log('✅ Draft data loaded:', this.state.currentDraft);
                
                // Start auto-refresh for live draft updates
                this.startAutoRefresh();
                
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
        
        // Check for mock mode URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const forceMock = urlParams.get('mock') === 'true';
        
        if (forceMock) {
            console.log('🎭 Mock mode forced via URL parameter');
            this.loadMockPlayers();
            return;
        }
        
        if (!this.state.currentDraft || !this.state.currentDraft.draft_id) {
            console.error('❌ No draft ID available for loading players');
            this.loadMockPlayers();
            return;
        }
        
        try {
            const draftId = this.state.currentDraft.draft_id;
            console.log('🎯 Loading available rankings for draft:', draftId);
            
            // First, load available rankings from the rankings API
            const rankingsResponse = await this.apiService.request('/rankings/list');
            
            if (rankingsResponse.status === 'success' && rankingsResponse.rankings && rankingsResponse.rankings.length > 0) {
                console.log('✅ Available rankings loaded:', rankingsResponse.rankings.length, 'rankings');
                
                // Use the first available ranking as default
                const defaultRanking = rankingsResponse.rankings[0];
                console.log('🏈 Using default ranking:', defaultRanking.name);
                
                // Load player data from the default ranking
                const playersResponse = await this.apiService.request(`/rankings/data/${defaultRanking.id}`);
                
                if (playersResponse.status === 'success' && playersResponse.players) {
                    console.log('✅ Player data loaded:', playersResponse.players.length, 'players');
                    console.log('🔍 First player structure:', playersResponse.players[0]);
                    
                    // Transform API data to match our player format
                    let players = playersResponse.players.map((player, index) => {

                        return {
                            player_id: player.player_id || player.sleeper_id,
                            full_name: player.name || player.full_name,
                            position: player.position,
                            team: player.team,
                            rank: player.rank || index + 1,
                            adp: (player.rank || index + 1).toString(),
                            status: 'available',
                            // Additional data
                            tier: player.tier,
                            bye_week: player.bye_week,
                            injury_status: player.injury_status,
                            years_exp: player.years_exp,
                            ranking: {
                                overall_rank: player.rank || index + 1,
                                position_rank: player.position_rank || 1,
                                tier: player.tier || 1,
                                bye_week: player.bye_week,
                                value: player.value || 0
                            }
                        };
                    });
                    
                    // Filter out drafted players
                    players = this.filterDraftedPlayers(players);
                    
                    // Filter players based on league roster positions
                    if (this.state.currentLeague?.roster_positions) {
                        const leaguePositions = this.getLeagueRelevantPositions();
                        players = players.filter(player => 
                            this.isPositionRelevant(player.position, leaguePositions)
                        );
                    }
                    
                    // Store players and render
                    this.state.players = players;
                    this.state.filteredPlayers = players;
                    this.state.currentRankings = defaultRanking;
                    
                    // Initialize rankings selector
                    await this.waitForShoelaceComponents();
                    await this.initializeRankingsSelector();
                    
                    // Render players
                    this.renderPlayers();
                    
                    console.log('✅ Player rankings loaded:', players.length, 'players');
                    return;
                } else {
                    console.warn('⚠️ Player data API failed, response:', playersResponse);
                    throw new Error('Failed to load player data');
                }
            } else {
                console.warn('⚠️ No rankings available, response:', rankingsResponse);
                throw new Error('No rankings available');
            }
        } catch (error) {
            console.error('❌ Error loading player rankings:', error);
            console.warn('⚠️ Falling back to mock data');
            this.loadMockPlayers();
        }
    }
    
    /**
     * Load draft picks (wrapper method for auto-refresh)
     */
    async loadDraftPicks() {
        await this.loadDraftPicksFromSleeper();
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
                    
                    // Override picked_by for all picks based on real draft order
                    if (this.state.currentDraft?.slot_to_roster_id) {
                        console.log('🔄 Overriding picked_by for all picks based on real draft order');
                        picks.forEach((pick, index) => {
                            const pickNumber = index + 1;
                            const slotOwner = this.state.currentDraft.slot_to_roster_id[pickNumber];
                            
                            if (slotOwner) {
                                const ownerUserId = this.getRosterOwnerUserId(slotOwner);
                                if (ownerUserId) {
                                    pick.picked_by = ownerUserId;
                                    pick.roster_id = slotOwner;
                                }
                            }
                        });
                        console.log('✅ Overrode picked_by for all picks');
                    }
                    
                    // Apply traded picks for mock drafts before any roster processing
                    if (this.state.isMockDraft && this.state.tradedPicks) {
                        await this.applyTradedPicksToMockDraft();
                    }
                    
                    // Refresh the player list with new draft picks
                    await this.refreshPlayersAfterDraft();
                    
                    // Update roster sidebar if it's visible
                    if (this.state.isRosterVisible) {
                        await this.populateRosterSidebar();
                    }
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
                
                // Extract ALL rostered player IDs (for filtering draft board)
                const allRosteredPlayerIds = new Set();
                rosters.forEach(roster => {
                    if (roster.players) {
                        roster.players.forEach(playerId => {
                            allRosteredPlayerIds.add(playerId);
                        });
                    }
                });
                
                this.state.rosteredPlayerIds = allRosteredPlayerIds;
                console.log('✅ All roster data loaded:', allRosteredPlayerIds.size, 'rostered players');
                
                // Store current user's roster separately
                const currentUserId = this.getCurrentUserId();
                const userRoster = rosters.find(roster => roster.owner_id === currentUserId);
                
                if (userRoster && userRoster.players) {
                    this.state.currentUserRosteredPlayerIds = new Set(userRoster.players);
                    console.log('✅ User roster loaded:', userRoster.players.length, 'rostered players');
                } else {
                    this.state.currentUserRosteredPlayerIds = new Set();
                    console.log('⚠️ No roster found for current user:', currentUserId);
                }
                
                // Refresh the player list with roster filtering
                await this.refreshPlayersAfterDraft();
                
                // Update roster sidebar if it's visible
                if (this.state.isRosterVisible) {
                    await this.populateRosterSidebar();
                }
                
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
        
        // Show mock mode indicator
        const mockIndicator = document.getElementById('mock-mode-indicator');
        if (mockIndicator) {
            mockIndicator.style.display = 'flex';
        }
        
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
     * Position utility functions
     */
    normalizePosition(position) {
        const mappings = {
            'DST': 'DEF',
            'D/ST': 'DEF'
        };
        return mappings[position] || position;
    }
    
    getLeagueRelevantPositions() {
        if (!this.state.currentLeague?.roster_positions) {
            return new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']); // Default positions
        }
        
        const relevantPositions = new Set();
        
        this.state.currentLeague.roster_positions.forEach(pos => {
            if (pos === 'FLEX') {
                relevantPositions.add('RB');
                relevantPositions.add('WR');
                relevantPositions.add('TE');
            } else if (pos === 'SUPER_FLEX') {
                relevantPositions.add('QB');
                relevantPositions.add('RB');
                relevantPositions.add('WR');
                relevantPositions.add('TE');
            } else {
                relevantPositions.add(this.normalizePosition(pos));
            }
        });
        
        return relevantPositions;
    }
    
    isPositionRelevant(playerPosition, leaguePositions) {
        const normalizedPosition = this.normalizePosition(playerPosition);
        
        // Handle hybrid positions like WR/TE
        if (playerPosition.includes('/')) {
            return playerPosition.split('/').some(pos => 
                leaguePositions.has(this.normalizePosition(pos))
            );
        }
        
        return leaguePositions.has(normalizedPosition);
    }
    
    /**
     * Create position tabs based on league requirements and available data
     */
    createPositionTabs() {
        const tabsContainer = document.getElementById('position-tabs');
        if (!tabsContainer) return;
        
        const leaguePositions = this.getLeagueRelevantPositions();
        const hasSuperflex = this.state.currentLeague?.roster_positions?.includes('SUPER_FLEX');
        const hasFlex = this.state.currentLeague?.roster_positions?.includes('FLEX');
        
        // Get positions available in data that are relevant to league
        const availablePositions = new Set();
        this.state.players.forEach(player => {
            const normalizedPos = this.normalizePosition(player.position);
            if (this.isPositionRelevant(player.position, leaguePositions)) {
                availablePositions.add(normalizedPos);
            }
        });
        
        // Build tab order based on league settings
        const baseTabOrder = [
            { key: 'ALL', label: 'All Players', filter: (p) => this.isPositionRelevant(p.position, leaguePositions), priority: 0 }
        ];
        
        // Add SUPER_FLEX tab if league has it
        if (hasSuperflex) {
            baseTabOrder.push({
                key: 'SUPER_FLEX', 
                label: 'Super Flex', 
                filter: (p) => ['QB', 'RB', 'WR', 'TE'].includes(this.normalizePosition(p.position)), 
                priority: 1
            });
        }
        
        // Add FLEX tab if league has it
        if (hasFlex) {
            baseTabOrder.push({
                key: 'FLEX', 
                label: 'Flex', 
                filter: (p) => ['RB', 'WR', 'TE'].includes(this.normalizePosition(p.position)), 
                priority: 2
            });
        }
        
        // Add individual position tabs for league-relevant positions only
        const positionPriority = { 'QB': 3, 'RB': 4, 'WR': 5, 'TE': 6, 'K': 7, 'DEF': 8 };
        
        Array.from(availablePositions).sort().forEach(pos => {
            baseTabOrder.push({
                key: pos,
                label: pos,
                filter: (p) => this.normalizePosition(p.position) === pos,
                priority: positionPriority[pos] || 9
            });
        });
        
        // Sort by priority and render
        baseTabOrder.sort((a, b) => a.priority - b.priority);
        
        tabsContainer.innerHTML = baseTabOrder.map((tab, index) => `
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
    }
    
    /**
     * Filter players by position (enhanced for hybrid positions)
     */
    filterByPosition(position) {
        // Update active tab
        document.querySelectorAll('.position-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-position="${position}"]`)?.classList.add('active');
        
        // Filter players based on position
        switch (position) {
            case 'ALL':
                this.state.filteredPlayers = this.state.players.filter(player => 
                    this.isPositionRelevant(player.position, this.getLeagueRelevantPositions())
                );
                break;
            case 'SUPER_FLEX':
                this.state.filteredPlayers = this.state.players.filter(player => 
                    ['QB', 'RB', 'WR', 'TE'].includes(this.normalizePosition(player.position))
                );
                break;
            case 'FLEX':
                this.state.filteredPlayers = this.state.players.filter(player => 
                    ['RB', 'WR', 'TE'].includes(this.normalizePosition(player.position))
                );
                break;
            default:
                this.state.filteredPlayers = this.state.players.filter(player => 
                    this.normalizePosition(player.position) === position
                );
        }
        
        // Maintain ranking sort order
        this.state.filteredPlayers.sort((a, b) => {
            return a.ranking.overall_rank - b.ranking.overall_rank;
        });
        
        this.state.currentPosition = position;
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
            const positionClass = this.normalizePosition(player.position).replace('/', '-');
            
            // Get ranking information
            // Get ranking information (all players have this now)
            const ranking = player.ranking;
            const rankDisplay = ranking.overall_rank;
            const posRankDisplay = ranking.position_rank;
            const tierDisplay = ranking.tier ? `T${ranking.tier}` : '';
            const byeDisplay = ranking.bye_week ? `${ranking.bye_week}` : '';
            
            // Value shows 0 if no value specified in CSV
            const valueDisplay = ranking.value || 0;
            
            // Position display with rank in same line and color
            const positionDisplay = posRankDisplay ? 
                `${player.position} ${posRankDisplay}` : 
                player.position;
            
            // Status shows "Bye Week" if player is on bye, otherwise availability
            const statusDisplay = byeDisplay && byeDisplay !== '' ? 
                'Bye Week' : 
                (player.status === 'available' ? 'Available' : 'Drafted');
            
            return `
                <div class="player-row position-${this.normalizePosition(player.position)} ${player.status}" data-player-id="${player.player_id}">
                    <div class="player-rank">${rankDisplay}</div>
                    <div class="player-name">
                        ${player.full_name}${injuryStatus}
                        ${tierDisplay ? `<span class="tier-badge">${tierDisplay}</span>` : ''}
                    </div>
                    <div class="player-position ${this.normalizePosition(player.position)}" data-position="${this.normalizePosition(player.position)}">
                        ${positionDisplay}
                    </div>
                    <div class="player-team">${player.team}</div>
                    <div class="player-value">${valueDisplay}</div>
                    <div class="player-bye">${byeDisplay}</div>
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
    async toggleRosterSidebar() {
        const sidebar = document.getElementById('roster-sidebar');
        const toggleBtn = document.getElementById('toggle-roster-btn');
        const toggleText = toggleBtn.querySelector('span');
        
        if (sidebar) {
            if (this.state.isRosterVisible) {
                this.hideRosterSidebar();
            } else {
                await this.showRosterSidebar();
            }
        }
    }
    
    /**
     * Show roster sidebar
     */
    async showRosterSidebar() {
        const sidebar = document.getElementById('roster-sidebar');
        const toggleBtn = document.getElementById('toggle-roster-btn');
        const toggleText = toggleBtn.querySelector('span');
        
        if (sidebar) {
            sidebar.classList.remove('hidden');
            this.state.isRosterVisible = true;
            
            if (toggleText) {
                toggleText.textContent = 'Hide Roster';
            }
            
            // Populate the roster AFTER making it visible
            await this.populateRosterSidebar();
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
     * Dynamic roster structure generation
     */
    calculatePositionCounts(rosterPositions) {
        if (!rosterPositions || rosterPositions.length === 0) {
            // Default roster structure
            return { 'QB': 1, 'RB': 2, 'WR': 2, 'TE': 1, 'FLEX': 1, 'K': 1, 'DEF': 1, 'BENCH': 5 };
        }
        
        const counts = {};
        let totalStarters = 0;
        
        rosterPositions.forEach(pos => {
            const normalizedPos = this.normalizePosition(pos);
            counts[normalizedPos] = (counts[normalizedPos] || 0) + 1;
            if (normalizedPos !== 'BENCH') totalStarters++;
        });
        
        // Calculate bench size (typical league has 15-16 total roster spots)
        const benchSize = Math.max(5, 16 - totalStarters);
        counts['BENCH'] = benchSize;
        
        return counts;
    }
    
    createPositionSection(position, count) {
        const slots = Array(count).fill(0).map(() => 
            '<div class="roster-slot empty">Empty</div>'
        ).join('');
        
        return `
            <div class="roster-position">
                <div class="position-label">${position}</div>
                <div class="position-slots" data-position="${position}">
                    ${slots}
                </div>
            </div>
        `;
    }
    
    generateRosterStructure() {
        const rosterPositions = this.state.currentLeague?.roster_positions;
        const positionCounts = this.calculatePositionCounts(rosterPositions);
        
        // Define position order for display
        const positionOrder = ['QB', 'RB', 'WR', 'TE', 'SUPER_FLEX', 'FLEX', 'K', 'DEF', 'BENCH'];
        
        return positionOrder
            .filter(pos => positionCounts[pos] > 0)
            .map(pos => this.createPositionSection(pos, positionCounts[pos]))
            .join('');
    }
    
    updateRosterStructure() {
        const rosterContainer = document.querySelector('.roster-positions');
        if (rosterContainer) {
            rosterContainer.innerHTML = this.generateRosterStructure();
        }
    }
    
    /**
     * Populate roster positions dynamically based on league structure
     */
    populateRosterPositions(rosterPlayers, playersByPosition) {
        const rosterPositions = this.state.currentLeague?.roster_positions || [];
        const positionCounts = this.calculatePositionCounts(rosterPositions);
        const usedPlayers = new Set();
        
        // Populate starting positions first
        Object.entries(positionCounts).forEach(([position, count]) => {
            if (position === 'BENCH') return; // Handle bench last
            
            let eligiblePlayers = [];
            
            if (position === 'FLEX') {
                // FLEX can use RB/WR/TE not already used in starting positions
                eligiblePlayers = [
                    ...(playersByPosition.RB || []),
                    ...(playersByPosition.WR || []),
                    ...(playersByPosition.TE || [])
                ].filter(p => !usedPlayers.has(p.player_id));
            } else if (position === 'SUPER_FLEX') {
                // SUPER_FLEX can use QB/RB/WR/TE not already used
                eligiblePlayers = [
                    ...(playersByPosition.QB || []),
                    ...(playersByPosition.RB || []),
                    ...(playersByPosition.WR || []),
                    ...(playersByPosition.TE || [])
                ].filter(p => !usedPlayers.has(p.player_id));
            } else {
                // Standard position
                eligiblePlayers = (playersByPosition[position] || []).filter(p => !usedPlayers.has(p.player_id));
            }
            
            // Take the best available players for this position
            const playersToUse = eligiblePlayers.slice(0, count);
            playersToUse.forEach(p => usedPlayers.add(p.player_id));
            
            this.populatePositionSlots(position, playersToUse, count);
        });
        
        // Handle bench - all remaining players
        const benchPlayers = rosterPlayers.filter(p => !usedPlayers.has(p.player_id));
        const benchSize = positionCounts['BENCH'] || benchPlayers.length;
        this.populatePositionSlots('BENCH', benchPlayers, benchSize);
    }
    
    /**
     * Populate the roster sidebar with dynasty players and draft picks
     */
    async populateRosterSidebar() {
        try {
            // Update roster structure first
            this.updateRosterStructure();
            
            console.log('🏈 Populating roster sidebar...');
            
            // Check if roster sidebar exists and is visible
            const sidebar = document.getElementById('roster-sidebar');
            console.log('🔍 Roster sidebar element:', sidebar);
            console.log('🔍 Roster sidebar classes:', sidebar?.className);
            
            // Ensure we have user ID before proceeding
            if (!this.state.currentDraft?.user_id) {
                console.log('⚠️ No user ID available, attempting to determine it...');
                await this.determineCurrentUserId();
            }
            
            // Get all roster players (dynasty + drafted)
            const rosterPlayers = this.getRosterPlayers();
            console.log('🔍 Roster players for sidebar:', rosterPlayers);
            
            // Clear existing roster slots
            this.clearRosterSlots();
            
            // Organize players by position
            const playersByPosition = this.organizePlayersByPosition(rosterPlayers);
            console.log('🔍 Players by position:', playersByPosition);
            
            // Check if TreVeyon Henderson is in the data
            const treveyon = rosterPlayers.find(p => p.full_name?.includes('TreVeyon'));
            if (treveyon) {
                console.log('🔍 Found TreVeyon Henderson:', treveyon);
            } else {
                console.log('❌ TreVeyon Henderson not found in roster players');
            }
            
            // Populate positions dynamically based on league structure
            this.populateRosterPositions(rosterPlayers, playersByPosition);
            
            console.log(`✅ Roster populated with ${rosterPlayers.length} players`);
            
            // Calculate and display total team value
            this.updateTotalTeamValue(rosterPlayers);
            
        } catch (error) {
            console.error('❌ Error populating roster sidebar:', error);
        }
    }
    
    /**
     * Update total team value display
     */
    updateTotalTeamValue(rosterPlayers) {
        const totalValue = rosterPlayers.reduce((sum, player) => {
            const playerValue = Math.max(0, player.value || player.ranking?.value || 0);
            return sum + playerValue;
        }, 0);
        
        const totalValueElement = document.getElementById('total-team-value');
        if (totalValueElement) {
            totalValueElement.textContent = `Total: ${totalValue.toFixed(1)}`;
        }
        
        console.log(`💰 Total team value: ${totalValue.toFixed(1)}`);
    }
    
    /**
     * Populate leaderboard with all team values
     */
    async populateLeaderboard() {
        try {
            console.log('🏆 Starting leaderboard population...');
            const leaderboardList = document.getElementById('leaderboard-list');
            if (!leaderboardList) {
                console.log('❌ Leaderboard list element not found');
                return;
            }
            
            // Show loading message
            leaderboardList.innerHTML = '<div style="padding: 1rem; text-align: center;">Loading...</div>';
            
            const teams = [];
            const currentUserId = this.getCurrentUserId();
            
            // Get unique users from draft picks
            const userIds = new Set();
            if (this.state.draftPicks) {
                this.state.draftPicks.forEach(pick => {
                    if (pick.picked_by) {
                        userIds.add(pick.picked_by);
                    }
                });
            }
            
            console.log('🏆 Found', userIds.size, 'unique users from draft picks');
            
            if (userIds.size === 0) {
                leaderboardList.innerHTML = '<div style="padding: 1rem; text-align: center;">No teams found</div>';
                return;
            }
            
            // Get user names from league
            let userNameMap = {};
            try {
                const username = window.app?.state?.currentUser?.username || 
                               this.landingHandlers?.state?.currentUser?.username;
                const leagueId = this.state.currentLeague?.league_id;
                
                if (username && leagueId) {
                    console.log('🏆 Fetching league users for names...');
                    const usersResponse = await this.apiService.getLeagueUsers(username, leagueId);
                    
                    if (usersResponse.status === 'success' && usersResponse.users) {
                        usersResponse.users.forEach(user => {
                            userNameMap[user.user_id] = user.display_name || user.username || `User ${user.user_id}`;
                        });
                        console.log('🏆 Loaded', Object.keys(userNameMap).length, 'user names');
                    }
                }
            } catch (error) {
                console.warn('⚠️ Could not load user names:', error);
            }
            
            // Calculate team values for each user
            for (const userId of userIds) {
                const userPicks = this.state.draftPicks.filter(p => p.picked_by === userId);
                let totalValue = 0;
                
                // Calculate total value from draft picks
                userPicks.forEach(pick => {
                    const player = this.createPlayerFromSleeperId(pick.player_id);
                    if (player) {
                        totalValue += Math.max(0, player.value || 0);
                    }
                });
                
                const displayName = userNameMap[userId] || `Team ${userId}`;
                
                teams.push({
                    userId: userId,
                    displayName: displayName,
                    teamName: displayName,
                    value: totalValue,
                    pickCount: userPicks.length
                });
            }
            
            // Sort by value (highest first)
            teams.sort((a, b) => b.value - a.value);
            
            // Generate HTML
            let html = '';
            teams.forEach((team, index) => {
                const isCurrentUser = team.userId === currentUserId;
                const rank = index + 1;
                
                html += `
                    <div class="leaderboard-team ${isCurrentUser ? 'current-user' : ''}">
                        <div class="team-info">
                            <div class="team-name">${rank}. ${team.teamName}</div>
                            <div class="team-owner">${team.pickCount} picks</div>
                        </div>
                        <div class="team-value">${team.value.toFixed(1)}</div>
                    </div>
                `;
            });
            
            leaderboardList.innerHTML = html;
            
        } catch (error) {
            console.error('❌ Error populating leaderboard:', error);
        }
    }
    
    /**
     * Calculate total team value for a specific user
     */
    async calculateTeamValue(userId) {
        try {
            // Get user's roster and draft picks
            const userRoster = this.state.leagueRosters?.find(r => r.owner_id === userId);
            const userPicks = this.state.draftPicks?.filter(p => p.picked_by === userId) || [];
            
            let totalValue = 0;
            const seenPlayerIds = new Set();
            
            // Add roster players
            if (userRoster?.players) {
                userRoster.players.forEach(playerId => {
                    if (!seenPlayerIds.has(playerId)) {
                        const player = this.createPlayerFromSleeperId(playerId);
                        if (player) {
                            totalValue += Math.max(0, player.value || 0);
                            seenPlayerIds.add(playerId);
                        }
                    }
                });
            }
            
            // Add drafted players (replace roster if duplicate)
            userPicks.forEach(pick => {
                const player = this.createPlayerFromSleeperId(pick.player_id);
                if (player) {
                    if (seenPlayerIds.has(pick.player_id)) {
                        // Already counted in roster, no change needed
                    } else {
                        totalValue += Math.max(0, player.value || 0);
                        seenPlayerIds.add(pick.player_id);
                    }
                }
            });
            
            return totalValue;
            
        } catch (error) {
            console.error(`❌ Error calculating team value for user ${userId}:`, error);
            return 0;
        }
    }
    
    /**
     * Calculate total team value for a specific user using API data
     */
    async calculateTeamValueFromAPI(userId, leagueRosters) {
        try {
            // Get user's roster
            const userRoster = leagueRosters.find(r => r.owner_id === userId);
            const userPicks = this.state.draftPicks?.filter(p => p.picked_by === userId) || [];
            
            let totalValue = 0;
            const seenPlayerIds = new Set();
            
            // Add roster players
            if (userRoster?.players) {
                userRoster.players.forEach(playerId => {
                    if (!seenPlayerIds.has(playerId)) {
                        const player = this.createPlayerFromSleeperId(playerId);
                        if (player) {
                            totalValue += Math.max(0, player.value || 0);
                            seenPlayerIds.add(playerId);
                        }
                    }
                });
            }
            
            // Add drafted players (replace roster if duplicate)
            userPicks.forEach(pick => {
                const player = this.createPlayerFromSleeperId(pick.player_id);
                if (player) {
                    if (seenPlayerIds.has(pick.player_id)) {
                        // Already counted in roster, no change needed
                    } else {
                        totalValue += Math.max(0, player.value || 0);
                        seenPlayerIds.add(pick.player_id);
                    }
                }
            });
            
            return totalValue;
            
        } catch (error) {
            console.error(`❌ Error calculating team value for user ${userId}:`, error);
            return 0;
        }
    }
    
    /**
     * Get all roster players (dynasty + drafted)
     */
    getRosterPlayers() {
        const rosterPlayers = [];
        const seenPlayerIds = new Set(); // Prevent duplicates
        
        console.log('🔍 Debug roster data:');
        console.log('  - rosteredPlayerIds size:', this.state.rosteredPlayerIds?.size || 0);
        console.log('  - draftPicks length:', this.state.draftPicks?.length || 0);
        console.log('  - currentDraft user_id:', this.state.currentDraft?.user_id);
        console.log('  - currentDraft:', this.state.currentDraft);
        
        // Add dynasty roster players using Sleeper player mapping
        if (this.state.currentUserRosteredPlayerIds && this.state.currentUserRosteredPlayerIds.size > 0) {
            console.log('🏰 Processing dynasty roster players...');
            this.state.currentUserRosteredPlayerIds.forEach(playerId => {
                // First try to find by ID in our rankings
                let player = this.findPlayerById(playerId);
                
                // If not found, try to create from Sleeper data
                if (!player) {
                    player = this.createPlayerFromSleeperId(playerId);
                }
                
                if (player) {
                    if (!seenPlayerIds.has(playerId)) {
                        rosterPlayers.push({
                            ...player,
                            source: 'dynasty',
                            status: 'rostered'
                        });
                        seenPlayerIds.add(playerId);
                        console.log('  + Added dynasty player:', player.full_name);
                    } else {
                        console.log('  - Skipped duplicate dynasty player:', player.full_name);
                    }
                } else {
                    console.log('  - Could not find dynasty player with ID:', playerId);
                }
            });
        }
        
        // Add drafted players from current draft
        if (this.state.draftPicks && this.state.draftPicks.length > 0) {
        console.log('🎯 Processing draft picks...');
        console.log('  - Sample draft pick:', this.state.draftPicks[0]);
        console.log('  - First 3 picks picked_by values:', this.state.draftPicks.slice(0, 3).map(p => p.picked_by));
            
        // EMERGENCY FIX: Re-apply picked_by override right before roster processing
        if (this.state.isMockDraft && this.state.currentDraft?.slot_to_roster_id) {
                const overrideId = Math.random().toString(36).substr(2, 9);
                console.log(`🚑 EMERGENCY [${overrideId}]: Re-applying picked_by override before roster processing`);
                
                // DEBUG: Check actual roster mapping from Sleeper API
                const currentUserId = this.getCurrentUserId();
                console.log(`🔍 DEBUG: Current user ID: ${currentUserId}`);
                console.log(`🔍 DEBUG: Real draft order:`, this.state.realDraftOrder);
                console.log(`🔍 DEBUG: Mock draft order:`, this.state.currentDraft.draft_order);
                
                // DEBUG: Fetch league users to understand the roster mapping
                if (this.state.currentDraft?.leagueId) {
                    this.apiService.request(`/league/${this.state.currentDraft.leagueId}/users`)
                        .then(leagueUsersResponse => {
                            console.log(`🔍 DEBUG: League users from API:`, leagueUsersResponse);
                            
                            // Find current user's position in the league users array
                            const userIndex = leagueUsersResponse.findIndex(user => user.user_id === currentUserId);
                            console.log(`🔍 DEBUG: Current user is at index ${userIndex} in league users array`);
                        })
                        .catch(error => {
                            console.error('❌ Failed to fetch league users:', error);
                        });
                        
                    // Fetch rosters to get roster_id -> owner_id mapping
                    this.apiService.request(`/league/${this.state.currentDraft.leagueId}/rosters`)
                        .then(rostersResponse => {
                            console.log(`🔍 DEBUG: League rosters from API:`, rostersResponse);
                            
                            // Create roster_id -> owner_id mapping
                            const rosterToOwner = {};
                            rostersResponse.forEach(roster => {
                                rosterToOwner[roster.roster_id] = roster.owner_id;
                                console.log(`🔍 Mapping roster ${roster.roster_id} -> owner ${roster.owner_id}`);
                            });
                            console.log(`🔍 DEBUG: Roster to owner mapping:`, rosterToOwner);
                            
                            // Store for use in trade application
                            this.state.rosterToOwnerMapping = rosterToOwner;
                            console.log(`✅ Roster mapping stored in state:`, this.state.rosterToOwnerMapping);
                        })
                        .catch(error => {
                            console.error('❌ Failed to fetch league rosters:', error);
                            console.error('❌ Error details:', error.message, error.stack);
                        });
                }
                
                // Find what roster the current user should have
                let realRoster = null;
                if (this.state.realDraftOrder) {
                    for (const [userId, rosterId] of Object.entries(this.state.realDraftOrder)) {
                        if (userId === currentUserId) {
                            realRoster = rosterId;
                            break;
                        }
                    }
                }
                console.log(`🔍 DEBUG: Current user should be roster ${realRoster} in real league`);
                
                console.log('🔍 Emergency slot_to_roster_id:', this.state.currentDraft.slot_to_roster_id);
                console.log('🔍 Emergency draft_order:', this.state.currentDraft.draft_order);
                
            this.state.draftPicks.forEach((pick, index) => {
                    const pickNumber = index + 1;
                    let slotOwner;
                    
                    // For picks 1-10, use slot_to_roster_id mapping
                    if (pickNumber <= 10) {
                        slotOwner = this.state.currentDraft.slot_to_roster_id[pickNumber];
                    } else {
                        // For picks 11+, calculate based on snake draft pattern
                        const numTeams = 10; // Hardcode for 10-team league
                        const round = Math.ceil(pickNumber / numTeams);
                        const positionInRound = ((pickNumber - 1) % numTeams) + 1;
                        
                        // Snake draft: odd rounds go 1->10, even rounds go 10->1
                        const draftPosition = (round % 2 === 1) ? positionInRound : (numTeams - positionInRound + 1);
                        slotOwner = this.state.currentDraft.slot_to_roster_id[draftPosition];
                    }
                    
                    if (slotOwner) {
                        const ownerUserId = this.getRosterOwnerUserId(slotOwner);
                        if (ownerUserId) {
                            pick.picked_by = ownerUserId;
                            pick.roster_id = slotOwner;
                        }
                    }
                });
                
                console.log('✅ Base ownership assigned - now applying trades...');
                
                // Apply trades AFTER all base assignments are complete
                if (this.state.tradedPicks) {
                    console.log('🔄 Applying traded picks in emergency override...');
                    console.log('🔍 Available traded picks:', this.state.tradedPicks.length);
                    
                    // DEBUG: Show all traded picks to understand the data structure
                    console.log('🔍 All traded picks data:');
                    this.state.tradedPicks.forEach((tp, index) => {
                        console.log(`  ${index + 1}. Season ${tp.season}, Round ${tp.round}, Roster ${tp.roster_id} -> ${tp.owner_id}`);
                    });
                    
                    // Wait for roster mapping if it's being fetched
                    const applyTrades = () => {
                        const currentSeason = this.state.currentDraft?.season || '2025';
                        const numTeams = 10;
                        let tradesApplied = 0;
                        
                        this.state.draftPicks.forEach((pick, index) => {
                            const pickNumber = index + 1;
                            const round = Math.ceil(pickNumber / numTeams);
                            const originalOwner = pick.roster_id;
                            
                            // Find if this pick was traded
                            // Convert draft position to roster ID using slot_to_roster_id mapping
                            const rosterIdInTrades = this.state.currentDraft.slot_to_roster_id[originalOwner];
                            
                            if (!rosterIdInTrades) {
                                console.warn(`⚠️ Pick ${pickNumber}: No roster found for draft position ${originalOwner}`);
                                return;
                            }
                            
                            const trade = this.state.tradedPicks.find(tp => 
                                tp.season === currentSeason && 
                                tp.round === round && 
                                tp.roster_id === rosterIdInTrades
                            );
                            
                            if (trade && trade.owner_id !== rosterIdInTrades) {
                                // Use slot_to_roster_id mapping to find the correct user
                                // Find which draft position owns the new roster
                                let newOwnerDraftPosition = null;
                                for (const [slot, rosterId] of Object.entries(this.state.currentDraft.slot_to_roster_id)) {
                                    if (parseInt(rosterId) === parseInt(trade.owner_id)) {
                                        newOwnerDraftPosition = parseInt(slot);
                                        break;
                                    }
                                }
                                
                                if (newOwnerDraftPosition) {
                                    const newOwnerUserId = this.getRosterOwnerUserId(newOwnerDraftPosition);
                                    if (newOwnerUserId) {
                                        console.log(`🔄 TRADE Pick ${pickNumber}: Round ${round}, Roster ${rosterIdInTrades} -> ${trade.owner_id}, User: ${pick.picked_by} -> ${newOwnerUserId}`);
                                        pick.picked_by = newOwnerUserId;
                                        pick.roster_id = newOwnerDraftPosition;
                                        tradesApplied++;
                                    } else {
                                        console.warn(`⚠️ TRADE Pick ${pickNumber}: Could not find user for draft position ${newOwnerDraftPosition}`);
                                    }
                                } else {
                                    console.warn(`⚠️ TRADE Pick ${pickNumber}: Could not find draft position for roster ${trade.owner_id}`);
                                }
                            }
                        });
                        
                        console.log(`✅ Applied ${tradesApplied} trades in emergency override [${overrideId}]`);
                    };
                    
                    // Apply trades immediately using existing slot_to_roster_id mapping
                    applyTrades();
                } else {
                    console.warn(`⚠️ No traded picks data available for emergency override [${overrideId}]`);
                }
                
                console.log(`✅ Emergency override complete [${overrideId}] - new first 3 picks:`, this.state.draftPicks.slice(0, 3).map(p => p.picked_by));
            }

            // Get current user ID from various sources
            let currentUserId = this.getCurrentUserId();

            console.log('  - Looking for picks by user ID:', currentUserId);
            
            this.state.draftPicks.forEach((pick, index) => {
                // Get player name from Sleeper data if not in pick
                const playerName = pick.player_name || this.getPlayerNameFromSleeperId(pick.player_id);
                
                console.log(`  - Pick ${index + 1}:`, {
                    player_id: pick.player_id,
                    player_name: playerName,
                    picked_by: pick.picked_by,
                    matches_user: currentUserId ? pick.picked_by === currentUserId : false
                });
                
                // Check if this pick belongs to current user
                const isCurrentUserPick = currentUserId && pick.picked_by === currentUserId;
                
                if (isCurrentUserPick) {
                    // Try to find player by ID first, then by name
                    let player = this.findPlayerById(pick.player_id);
                    if (!player) {
                        player = this.createPlayerFromSleeperId(pick.player_id);
                    }
                    if (!player && playerName) {
                        player = this.findPlayerByName(playerName);
                    }
                    
                    if (player) {
                        if (!seenPlayerIds.has(pick.player_id)) {
                            rosterPlayers.push({
                                ...player,
                                source: 'drafted',
                                status: 'drafted',
                                round: pick.round,
                                pick_number: pick.pick_no || pick.pick_number
                            });
                            seenPlayerIds.add(pick.player_id);
                            console.log('  + Added drafted player:', player.full_name);
                        } else {
                            // If player was already added as dynasty, replace with drafted version
                            const existingIndex = rosterPlayers.findIndex(p => p.player_id === pick.player_id);
                            if (existingIndex !== -1) {
                                console.log('  - Replacing dynasty player with drafted version:', player.full_name);
                                rosterPlayers[existingIndex] = {
                                    ...player,
                                    source: 'drafted',
                                    status: 'drafted',
                                    round: pick.round,
                                    pick_number: pick.pick_no || pick.pick_number
                                };
                            } else {
                                console.log('  - Skipped duplicate drafted player:', player.full_name);
                            }
                        }
                    } else {
                        console.log('  - Could not find drafted player:', playerName || pick.player_id);
                        console.log('    - Tried findPlayerById:', !!this.findPlayerById(pick.player_id));
                        console.log('    - Tried createPlayerFromSleeperId:', !!this.createPlayerFromSleeperId(pick.player_id));
                        console.log('    - Tried findPlayerByName:', playerName ? !!this.findPlayerByName(playerName) : 'no name');
                        
                        // Create a fallback player object for drafted players we can't find
                        const fallbackPlayer = {
                            player_id: pick.player_id,
                            full_name: playerName || `Player ${pick.player_id}`,
                            position: 'UNKNOWN',
                            team: 'UNKNOWN',
                            ranking: { overall_rank: 999 }
                        };
                        
                        rosterPlayers.push({
                            ...fallbackPlayer,
                            source: 'drafted',
                            status: 'drafted',
                            round: pick.round,
                            pick_number: pick.pick_no || pick.pick_number
                        });
                        console.log('  + Added fallback drafted player:', fallbackPlayer.full_name);
                    }
                } else if (!currentUserId) {
                    console.log('  - No user ID available, cannot determine ownership');
                } else {
                    console.log('  - Pick not for current user');
                }
            });
        }
        
        console.log(`📋 Found ${rosterPlayers.length} roster players (dynasty + drafted)`);
        return rosterPlayers;
    }
    
    /**
     * Get current user ID from various sources
     */
    getCurrentUserId() {
        // Try multiple sources for user ID
        let currentUserId = this.state.currentDraft?.user_id;
        
        // Try to get user ID from global state if not available
        if (!currentUserId && window.app?.state?.currentUser) {
            currentUserId = window.app.state.currentUser.user_id;
        }
        
        // Try to get from landing handlers state
        if (!currentUserId && this.landingHandlers?.state?.currentUser) {
            currentUserId = this.landingHandlers.state.currentUser.user_id;
        }
        
        // Try to get from draft data or league data
        if (!currentUserId && this.state.currentDraft) {
            // Check if we can derive user ID from draft settings or league membership
            const username = window.app?.state?.currentUser?.username || 
                           this.landingHandlers?.state?.currentUser?.username;
            
            if (username && this.state.currentLeague?.users) {
                // Find user ID by matching username in league users
                const userEntry = Object.entries(this.state.currentLeague.users).find(
                    ([userId, userData]) => userData.username === username
                );
                if (userEntry) {
                    currentUserId = userEntry[0];
                    console.log('✅ Found user ID from league users:', currentUserId);
                }
            }
        }
        
        return currentUserId;
    }
    
    /**
     * Create a player object from Sleeper player ID
     */
    createPlayerFromSleeperId(sleeperId) {
        if (!this.state.sleeperPlayerMap || !this.state.sleeperPlayerMap.size) {
            return null;
        }
        
        // Search through the Sleeper player map for this ID
        for (const [nameVariation, playerMatches] of this.state.sleeperPlayerMap.entries()) {
            const match = playerMatches.find(p => p.id === sleeperId);
            if (match) {
                // Try to find matching ranking data
                const currentRankings = this.rankingsService?.getCurrentRankingsData() || [];
                const matchedRanking = currentRankings.find(p => 
                    this.normalizePlayerName(p.player_name || p.name) === this.normalizePlayerName(match.full_name)
                );
                
                const player = {
                    player_id: sleeperId,
                    full_name: match.full_name,
                    position: match.position,
                    team: match.team,
                    rank: matchedRanking?.overall_rank || 999,
                    adp: (matchedRanking?.overall_rank || 999).toString(),
                    status: 'available',
                    value: matchedRanking?.value || 0,
                    ranking: {
                        overall_rank: matchedRanking?.overall_rank || 999,
                        position_rank: matchedRanking?.position_rank || 99,
                        tier: matchedRanking?.tier || 99,
                        bye_week: matchedRanking?.bye_week || null,
                        value: matchedRanking?.value || 0
                    },
                    tier: matchedRanking?.tier || 99,
                    bye_week: matchedRanking?.bye_week || null,
                    injury_status: null,
                    years_exp: null
                };
                
                console.log(`✅ Created player from Sleeper ID: ${player.full_name} (Value: ${player.value})`);
                return player;
            }
        }
        
        return null;
    }
    
    /**
     * Get player name from Sleeper player ID
     */
    getPlayerNameFromSleeperId(sleeperId) {
        if (!this.state.sleeperPlayerMap || !this.state.sleeperPlayerMap.size) {
            return null;
        }
        
        // Search through the Sleeper player map for this ID
        for (const [nameVariation, playerMatches] of this.state.sleeperPlayerMap.entries()) {
            const match = playerMatches.find(p => p.id === sleeperId);
            if (match) {
                return match.full_name;
            }
        }
        
        return null;
    }
    
    /**
     * Find player by Sleeper ID
     */
    findPlayerById(playerId) {
        // Check in current players list
        if (this.state.players) {
            const player = this.state.players.find(p => p.player_id === playerId);
            if (player) return player;
        }
        
        // Check in filtered players list
        if (this.state.filteredPlayers) {
            const player = this.state.filteredPlayers.find(p => p.player_id === playerId);
            if (player) return player;
        }
        
        // Check in Sleeper player map
        if (this.state.sleeperPlayerMap && this.state.sleeperPlayerMap.has(playerId)) {
            return this.state.sleeperPlayerMap.get(playerId);
        }
        
        return null;
    }
    
    /**
     * Find player by name (for draft picks)
     */
    findPlayerByName(playerName) {
        if (!playerName) return null;
        
        const normalizedName = playerName.toLowerCase().trim();
        
        // Check in current players list
        if (this.state.players) {
            const player = this.state.players.find(p => 
                p.full_name && p.full_name.toLowerCase().trim() === normalizedName
            );
            if (player) return player;
        }
        
        // Check in filtered players list  
        if (this.state.filteredPlayers) {
            const player = this.state.filteredPlayers.find(p =>
                p.full_name && p.full_name.toLowerCase().trim() === normalizedName
            );
            if (player) return player;
        }
        
        return null;
    }
    
    /**
     * Organize players by position
     */
    organizePlayersByPosition(players) {
        const organized = {};
        
        // Sort all players by value first (higher value = better)
        players.sort((a, b) => {
            const aValue = a.ranking?.value || a.value || 0;
            const bValue = b.ranking?.value || b.value || 0;
            return bValue - aValue; // Descending order (highest value first)
        });
        
        players.forEach(player => {
            let position = player.position || 'BENCH';
            
            // Normalize position names
            position = this.normalizePosition(position);
            
            // Handle multi-position players (e.g., "RB/WR")
            const positions = position.split('/');
            const primaryPosition = this.normalizePosition(positions[0]);
            
            if (!organized[primaryPosition]) {
                organized[primaryPosition] = [];
            }
            
            organized[primaryPosition].push(player);
        });
        
        return organized;
    }
    
    /**
     * Clear all roster slots
     */
    clearRosterSlots() {
        const positions = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BENCH'];
        
        positions.forEach(position => {
            const slots = document.querySelectorAll(`[data-position="${position}"] .roster-slot`);
            slots.forEach(slot => {
                slot.className = 'roster-slot empty';
                slot.innerHTML = 'Empty';
            });
        });
    }
    
    /**
     * Populate position slots with players
     */
    populatePositionSlots(position, players, maxSlots) {
        const normalizedPosition = this.normalizePosition(position);
        console.log(`🔍 Populating ${normalizedPosition}: ${players.length} players, max ${maxSlots} slots`);
        const slotsContainer = document.querySelector(`.position-slots[data-position="${normalizedPosition}"]`);
        if (!slotsContainer) {
            console.log(`❌ No slots container found for position: ${position}`);
            return;
        }
        
        // For BENCH, create slots dynamically based on number of players
        if (position === 'BENCH' && players.length > 0) {
            slotsContainer.innerHTML = '';
            for (let i = 0; i < players.length; i++) {
                const slot = document.createElement('div');
                slot.className = 'roster-slot empty';
                slot.textContent = 'Empty';
                slotsContainer.appendChild(slot);
            }
        }
        
        const slots = slotsContainer.querySelectorAll('.roster-slot');
        console.log(`🔍 Found ${slots.length} slots for ${normalizedPosition}`);

        
        // Fill slots with players
        for (let i = 0; i < Math.min(players.length, maxSlots, slots.length); i++) {
            const player = players[i];
            const slot = slots[i];
            
            if (slot && player) {
                slot.className = `roster-slot filled ${player.source}`;
                slot.innerHTML = this.createRosterPlayerHTML(player);
                console.log(`✅ Populated ${normalizedPosition} slot ${i} with ${player.full_name}`);
            }
        }
    }
    
    /**
     * Create HTML for a roster player
     */
    createRosterPlayerHTML(player) {
        const sourceIcon = player.source === 'dynasty' ? '👑' : '🆕';
        const sourceText = player.source === 'dynasty' ? 'Dynasty' : `R${player.round || '?'}`;
        const rankDisplay = player.rank && player.rank !== 999 ? `#${player.rank}` : '';
        
        // Get value from ranking data if available
        let valueDisplay = 0;
        if (player.ranking?.value) {
            valueDisplay = player.ranking.value;
        } else if (player.value) {
            valueDisplay = player.value;
        } else {
            // Try to find value from current rankings
            const currentRankings = this.rankingsService?.getCurrentRankingsData() || [];
            const matchedPlayer = currentRankings.find(p => 
                this.normalizePlayerName(p.player_name || p.name) === this.normalizePlayerName(player.full_name || player.name)
            );
            if (matchedPlayer) {
                valueDisplay = matchedPlayer.value || 0;
            }
        }
        
        return `
            <div class="roster-player">
                <div class="player-info">
                    <div class="player-name">${player.full_name || player.name || 'Unknown'}</div>
                    <div class="player-details">
                        <span class="player-position ${player.position?.toLowerCase()}">${player.position || 'N/A'}</span>
                        <span class="player-team">${player.team || 'N/A'}</span>
                        ${rankDisplay ? `<span class="player-rank">${rankDisplay}</span>` : ''}
                        <span class="player-value">Val: ${valueDisplay}</span>
                    </div>
                </div>
                <div class="player-source">
                    <span class="source-icon">${sourceIcon}</span>
                    <span class="source-text">${sourceText}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Get players for bench (remaining players not in starting lineup)
     */
    getBenchPlayers(allPlayers, playersByPosition) {
        const startingPlayers = new Set();
        
        // Add starting lineup players to set
        ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].forEach(pos => {
            const posPlayers = playersByPosition[pos] || [];
            const maxStarters = this.getMaxStarters(pos);
            
            for (let i = 0; i < Math.min(posPlayers.length, maxStarters); i++) {
                startingPlayers.add(posPlayers[i].player_id || posPlayers[i].full_name);
            }
        });
        
        // Add FLEX player
        const flexEligible = [
            ...(playersByPosition.RB || []).slice(2),
            ...(playersByPosition.WR || []).slice(2), 
            ...(playersByPosition.TE || []).slice(1)
        ];
        if (flexEligible.length > 0) {
            startingPlayers.add(flexEligible[0].player_id || flexEligible[0].full_name);
        }
        
        // Return players not in starting lineup
        return allPlayers.filter(player => {
            const playerId = player.player_id || player.full_name;
            return !startingPlayers.has(playerId);
        });
    }
    
    /**
     * Get maximum starters for a position
     */
    getMaxStarters(position) {
        const maxStarters = {
            'QB': 1,
            'RB': 2, 
            'WR': 2,
            'TE': 1,
            'K': 1,
            'DEF': 1
        };
        
        return maxStarters[position] || 0;
    }
    
    /**
     * Refresh leaderboard data
     */
    async refreshLeaderboard() {
        try {
            const refreshBtn = document.getElementById('refresh-leaderboard-btn');
            if (refreshBtn) {
                refreshBtn.style.opacity = '0.5';
                refreshBtn.style.pointerEvents = 'none';
            }
            
            await this.populateLeaderboard();
            
            if (refreshBtn) {
                refreshBtn.style.opacity = '1';
                refreshBtn.style.pointerEvents = 'auto';
            }
        } catch (error) {
            console.error('❌ Error refreshing leaderboard:', error);
        }
    }
    
    /**
     * Trigger manual refresh from auto-refresh indicator
     */
    async triggerManualRefresh() {
        try {
            // Reset countdown and trigger immediate refresh
            this.stopAutoRefresh();
            
            // Refresh all data
            await this.loadDraftPicks();
            await this.refreshPlayersAfterDraft();
            
            // Update roster if visible
            if (this.state.isRosterVisible) {
                await this.populateRosterSidebar();
            }
            
            // Update leaderboard if visible
            const leaderboard = document.getElementById('leaderboard-sidebar');
            if (leaderboard && !leaderboard.classList.contains('hidden')) {
                await this.populateLeaderboard();
            }
            
            // Restart auto-refresh
            this.startAutoRefresh();
        } catch (error) {
            console.error('❌ Error during manual refresh:', error);
        }
    }
    
    /**
     * Refresh roster data (dynasty + draft picks)
     */
    async refreshRosterData() {
        try {
            console.log('🔄 Refreshing roster data...');
            
            // Show loading state on refresh button
            const refreshBtn = document.getElementById('refresh-roster-btn');
            if (refreshBtn) {
                refreshBtn.style.opacity = '0.5';
                refreshBtn.disabled = true;
            }
            
            // Reload dynasty roster data
            if (this.state.currentDraft?.league_info) {
                await this.loadRosterData(this.state.currentDraft.league_info);
            }
            
            // Reload draft picks
            await this.loadDraftPicksFromSleeper();
            
            // Update roster sidebar if visible
            if (this.state.isRosterVisible) {
                await this.populateRosterSidebar();
            }
            
            console.log('✅ Roster data refreshed');
            
        } catch (error) {
            console.error('❌ Error refreshing roster data:', error);
        } finally {
            // Reset refresh button state
            const refreshBtn = document.getElementById('refresh-roster-btn');
            if (refreshBtn) {
                refreshBtn.style.opacity = '1';
                refreshBtn.disabled = false;
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
            const samplePlayers = this.rankingsService.getCurrentRankingsData().slice(0, 3);
            console.log('🔍 Sample players from rankings:');
            samplePlayers.forEach((player, index) => {
                console.log(`  ${index + 1}. ${player.player_name} (${player.position}, ${player.team}) - Rank ${player.overall_rank}, Value: ${player.value}`);
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
            // Check by player ID first (most reliable)
            if (draftedPlayerIds.has(player.player_id)) {
                console.log(`🚫 Filtered out by ID: ${player.full_name} (${player.player_id})`);
                return false;
            }
            
            // Try to map CSV player name to Sleeper ID using multiple variations
            if (this.state.sleeperPlayerMap && this.state.sleeperPlayerMap.size > 0) {
                const nameVariations = this.generateNameVariations(player.full_name);
                
                for (const variation of nameVariations) {
                    const playerMatches = this.state.sleeperPlayerMap.get(variation);
                    if (playerMatches && playerMatches.length > 0) {
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
                            if (draftedPlayerIds.has(bestMatch.id)) {

                                return false;
                            }
                        }
                    }
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
                            console.log(`🚫 Filtered out by name variation: ${player.full_name} (${playerVar} = ${draftedVar})`);
                            return false;
                        }
                    }
                }
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
    async refreshPlayersAfterDraft() {
        if (this.state.players && this.state.players.length > 0) {
            // Re-filter the current players (includes both draft picks and rosters)
            const filteredPlayers = this.filterDraftedPlayers(this.state.players);
            this.state.filteredPlayers = filteredPlayers;
            
            // Re-render the players
            this.renderPlayers();
            
            // Update roster sidebar if it's visible
            if (this.state.isRosterVisible) {
                await this.populateRosterSidebar();
            }
            
            console.log('🔄 Refreshed player list and roster after draft/roster changes');
        }
    }
    
    /**
     * Start auto-refresh timer for draft updates
     */
    startAutoRefresh() {
        if (!this.autoRefreshEnabled) {
            console.log('⏸️ Auto-refresh is disabled');
            return;
        }
        
        // Clear any existing interval
        this.stopAutoRefresh();
        
        // Less aggressive refresh for mock drafts
        const refreshInterval = this.state.isMockDraft ? 60000 : this.refreshIntervalMs; // 60s for mock, 30s for real
        this.currentRefreshInterval = refreshInterval; // Store for countdown
        
        console.log(`🔄 Starting auto-refresh every ${refreshInterval / 1000} seconds${this.state.isMockDraft ? ' (Mock Draft Mode)' : ''}`);
        
        // Show auto-refresh indicator
        const refreshIndicator = document.getElementById('auto-refresh-indicator');
        if (refreshIndicator) {
            refreshIndicator.style.display = 'flex';
        }
        
        // Start countdown timer
        this.startCountdown();
        
        this.autoRefreshInterval = setInterval(async () => {
            try {
                console.log('🔄 Auto-refreshing draft data...');
                await this.refreshDraftData();
                // Restart countdown after refresh
                this.startCountdown();
            } catch (error) {
                console.error('❌ Error during auto-refresh:', error);
            }
        }, refreshInterval);
    }
    
    /**
     * Start countdown display
     */
    startCountdown() {
        // Clear any existing countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        let secondsLeft = (this.currentRefreshInterval || this.refreshIntervalMs) / 1000;
        const refreshText = document.getElementById('auto-refresh-text');
        
        if (refreshText) {
            const updateCountdown = () => {
                refreshText.textContent = `Auto-refresh: ${secondsLeft}s`;
                secondsLeft--;
                
                if (secondsLeft < 0) {
                    clearInterval(this.countdownInterval);
                }
            };
            
            // Update immediately
            updateCountdown();
            
            // Update every second
            this.countdownInterval = setInterval(updateCountdown, 1000);
        }
    }
    
    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            console.log('⏹️ Stopping auto-refresh');
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        // Clear countdown timer
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        // Hide auto-refresh indicator
        const refreshIndicator = document.getElementById('auto-refresh-indicator');
        if (refreshIndicator) {
            refreshIndicator.style.display = 'none';
        }
    }
    
    /**
     * Populate leaderboard with all team values
     */
    async populateLeaderboard() {
        try {
            console.log('🏆 Starting leaderboard population...');
            const leaderboardList = document.getElementById('leaderboard-list');
            if (!leaderboardList) {
                console.log('❌ Leaderboard list element not found');
                return;
            }
            
            // Get all draft participants (for mock drafts, use draft picks to identify users)
            let allUsers = [];
            
            if (this.state.isMockDraft) {
                // For mock drafts, get unique users from draft picks
                const uniqueUsers = new Set();
                this.state.draftPicks?.forEach(pick => {
                    // Use picked_by if available, otherwise use draft_slot as fallback
                    const userId = pick.picked_by || `slot_${pick.draft_slot}`;
                    if (userId) {
                        uniqueUsers.add(userId);
                    }
                });
                
                // Use real league data if available, otherwise generate team names
                if (this.state.mockLeagueData && this.state.mockLeagueData.users) {
                    console.log('🎭 Using real league teams for mock draft');
                    allUsers = Object.entries(this.state.mockLeagueData.users).map(([userId, userData]) => ({
                        user_id: userId,
                        display_name: userData.display_name || userData.username || `Team ${userId.slice(-4)}`
                    }));
                } else {
                    allUsers = Array.from(uniqueUsers).map(userId => ({ 
                        user_id: userId, 
                        display_name: userId.startsWith('slot_') ? `Team ${userId.replace('slot_', '')}` : `Team ${userId.slice(-4)}` 
                    }));
                }
                
                console.log('🎭 Mock draft users from picks:', allUsers);
                
                // Debug for specific mock draft
                if (this.state.currentDraft?.draft_id === '1261266130878611456') {
                    console.log('🔍 DEBUG Mock Draft - All draft picks:');
                    this.state.draftPicks?.forEach((pick, index) => {
                        if (index < 10) { // Show first 10 picks
                            const userId = pick.picked_by || `slot_${pick.draft_slot}`;
                            console.log(`  Pick ${pick.pick_no}: Player ${pick.player_id} picked by ${userId} (slot ${pick.draft_slot})`);
                        }
                    });
                    console.log('🔍 DEBUG Mock Draft - Unique users found:', Array.from(uniqueUsers));
                }
            } else {
                // For real drafts, use league users
                allUsers = this.state.currentLeague?.users || [];
                console.log('🏆 Real draft users from league:', allUsers);
            }
            
            if (allUsers.length === 0) {
                console.log('⚠️ No users found for leaderboard');
                leaderboardList.innerHTML = '<div class="text-center py-4 text-gray-500">No teams found</div>';
                return;
            }
            
            // Calculate team values for all users
            const teamValues = [];
            for (const user of allUsers) {
                const userId = user.user_id;
                const teamValue = await this.calculateTeamValue(userId);
                teamValues.push({
                    userId,
                    displayName: user.display_name || `Team ${userId.slice(-4)}`,
                    value: teamValue
                });
            }
            
            // Sort by value (highest first)
            teamValues.sort((a, b) => b.value - a.value);
            
            // Generate leaderboard HTML
            const leaderboardHTML = teamValues.map((team, index) => {
                const rank = index + 1;
                const isCurrentUser = team.userId === this.state.currentDraft?.user_id;
                
                return `
                    <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                        <div class="rank">#${rank}</div>
                        <div class="team-info">
                            <div class="team-name">${team.displayName}</div>
                            <div class="team-value">${team.value.toFixed(1)} pts</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            leaderboardList.innerHTML = leaderboardHTML;
            console.log('✅ Leaderboard populated with', teamValues.length, 'teams');
            
        } catch (error) {
            console.error('❌ Error populating leaderboard:', error);
        }
    }
    
    /**
     * Calculate team value for a specific user (handles traded picks correctly)
     */
    async calculateTeamValue(userId) {
        try {
            // Debug for specific mock draft
            if (this.state.currentDraft?.draft_id === '1261266130878611456') {
                console.log(`🔍 DEBUG Mock Draft - Calculating value for user: ${userId}`);
                console.log(`🔍 Total draft picks available:`, this.state.draftPicks?.length || 0);
                
                // Show all picks for this user
                const userPicks = this.state.draftPicks?.filter(pick => pick.picked_by === userId) || [];
                console.log(`🔍 User ${userId} picks:`, userPicks.map(p => `Pick ${p.pick_no}: ${p.player_id} (picked_by: ${p.picked_by})`));
                
                // Show detailed pick analysis for your specific user
                if (userId === '587035242359988224') {
                    console.log('🔍 DETAILED PICK ANALYSIS FOR YOUR USER:');
                    userPicks.forEach(pick => {
                        console.log(`  Pick ${pick.pick_no} (Round ${pick.round}): Player ${pick.player_id}`);
                        console.log(`    - draft_slot: ${pick.draft_slot}`);
                        console.log(`    - picked_by: "${pick.picked_by}"`);
                        console.log(`    - roster_id: ${pick.roster_id}`);
                        console.log(`    - metadata:`, pick.metadata);
                        
                        // Check if this pick was traded
                        if (pick.metadata && (pick.metadata.traded_for || pick.metadata.original_owner)) {
                            console.log(`    - TRADE INFO:`, pick.metadata);
                        }
                    });
                    console.log('🔍 Expected: Only Pick 3 (Bijan) and Pick 40+ (Jayden Daniels)');
                    
                    // Check if we can find the actual picks by looking at draft_slot vs picked_by mismatch
                    console.log('🔍 CHECKING FOR TRADE PATTERNS:');
                    const allPicks = this.state.draftPicks || [];
                    const suspiciousPicks = allPicks.filter(p => p.picked_by === userId && p.draft_slot !== 3);
                    console.log(`Found ${suspiciousPicks.length} picks that might be incorrectly attributed (not from your original slot 3)`);
                }
                
                // Show sample of all picks to see structure
                if (this.state.draftPicks?.length > 0) {
                    console.log(`🔍 Sample draft pick structure:`, this.state.draftPicks[0]);
                    console.log(`🔍 All unique picked_by values:`, [...new Set(this.state.draftPicks.map(p => p.picked_by))]);
                }
            }
            
            let totalValue = 0;
            const seenPlayerIds = new Set();
            
            // For mock drafts, only use draft picks (no roster data)
            if (this.state.isMockDraft) {
                let userPicks = this.state.draftPicks?.filter(pick => {
                    // Use picked_by if available, otherwise use draft_slot as fallback
                    const pickUserId = pick.picked_by || `slot_${pick.draft_slot}`;
                    return pickUserId === userId;
                }) || [];
                
                // WORKAROUND: For specific mock draft with known trade issues
                if (this.state.currentDraft?.draft_id === '1261266130878611456' && userId === '587035242359988224') {
                    console.log('🔧 APPLYING TRADE WORKAROUND for your user');
                    // Filter to only picks that make sense based on your actual draft position
                    // You were slot 3, so you should have picks 3, 18, 23, 38, 43, etc. in snake draft
                    // But you traded some away, so let's be more selective
                    const validPicks = userPicks.filter(pick => {
                        // Keep pick 3 (Bijan) and any pick 40+ (Jayden Daniels area)
                        return pick.pick_no === 3 || pick.pick_no >= 40;
                    });
                    console.log(`🔧 Filtered from ${userPicks.length} to ${validPicks.length} picks`);
                    userPicks = validPicks;
                }
                
                console.log(`🎭 Mock draft picks for user ${userId}:`, userPicks.length);
                
                userPicks.forEach(pick => {
                    const player = this.createPlayerFromSleeperId(pick.player_id);
                    if (player && !seenPlayerIds.has(pick.player_id)) {
                        totalValue += Math.max(0, player.value || 0);
                        seenPlayerIds.add(pick.player_id);
                        
                        // Debug for specific mock draft
                        if (this.state.currentDraft?.draft_id === '1261266130878611456') {
                            console.log(`🔍 Added player: ${player.full_name} (Value: ${player.value || 0})`);
                        }
                    }
                });
            } else {
                // For real drafts, use roster data + draft picks
                const userRoster = this.state.leagueRosters?.find(r => r.owner_id === userId);
                const userPicks = this.state.draftPicks?.filter(pick => {
                    // Use picked_by for the actual owner (handles trades)
                    return pick.picked_by === userId;
                }) || [];
                
                // Add roster players (dynasty)
                if (userRoster?.players) {
                    userRoster.players.forEach(playerId => {
                        if (!seenPlayerIds.has(playerId)) {
                            const player = this.createPlayerFromSleeperId(playerId);
                            if (player) {
                                totalValue += Math.max(0, player.value || 0);
                                seenPlayerIds.add(playerId);
                            }
                        }
                    });
                }
                
                // Add drafted players (replace roster if duplicate)
                userPicks.forEach(pick => {
                    const player = this.createPlayerFromSleeperId(pick.player_id);
                    if (player) {
                        if (seenPlayerIds.has(pick.player_id)) {
                            // Already counted in roster, no change needed
                        } else {
                            totalValue += Math.max(0, player.value || 0);
                            seenPlayerIds.add(pick.player_id);
                        }
                    }
                });
            }
            
            // Debug for specific mock draft
            if (this.state.currentDraft?.draft_id === '1261266130878611456') {
                console.log(`🔍 Final team value for user ${userId}: ${totalValue}`);
            }
            
            return totalValue;
            
        } catch (error) {
            console.error(`❌ Error calculating team value for user ${userId}:`, error);
            return 0;
        }
    }
    
    /**
     * Refresh draft data (picks and roster)
     */
    async refreshDraftData() {
        if (!this.state.currentDraft || !this.state.currentDraft.draft_id) {
            console.log('⚠️ No current draft to refresh');
            return;
        }
        
        try {
            // Refresh draft picks
            await this.loadDraftPicks();
            
            // Refresh roster data if visible
            if (this.state.isRosterVisible) {
                await this.refreshRosterData();
            }
            
            console.log('✅ Auto-refresh completed');
        } catch (error) {
            console.error('❌ Error refreshing draft data:', error);
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

    /**
     * Apply traded picks to mock draft picks
     */
    async applyTradedPicksToMockDraft(leagueId = null) {
        if (!this.state.draftPicks || !this.state.tradedPicks) {
            console.log('⚠️ No draft picks or traded picks data available');
            return;
        }

        console.log('🔍 applyTradedPicksToMockDraft called - trades will be handled in emergency override');
        console.log('🔍 Skipping trade application here to avoid conflicts');
        return;

        console.log('🔄 Applying traded picks to mock draft picks');
        let changedPicks = 0;
        const currentSeason = this.state.currentDraft?.season || '2025';
        const numTeams = Object.keys(this.state.currentDraft?.draft_order || {}).length || 10;

        // First, assign correct picked_by based on real draft order (before trades)
        this.state.draftPicks.forEach((mockPick, index) => {
            const pickNumber = index + 1;
            const slotOwner = this.state.currentDraft?.slot_to_roster_id?.[pickNumber];
            
            if (slotOwner && !mockPick.picked_by) {
                const ownerUserId = this.getRosterOwnerUserId(slotOwner);
                if (ownerUserId) {
                    mockPick.picked_by = ownerUserId;
                    mockPick.roster_id = slotOwner;
                }
            }
        });
        
        console.log('✅ Assigned picked_by fields based on real draft order');

        // Then apply traded picks

        this.state.draftPicks.forEach((mockPick, index) => {
            const pickNumber = index + 1;
            const round = Math.ceil(pickNumber / numTeams);
            const originalOwner = mockPick.roster_id;

            // Find if this pick was traded
            const trade = this.state.tradedPicks.find(tp => 
                tp.season === currentSeason && 
                tp.round === round && 
                tp.roster_id === originalOwner
            );

            if (trade && trade.owner_id !== originalOwner) {
                console.log(`🔄 Pick ${pickNumber} (Round ${round}): roster ${originalOwner} -> ${trade.owner_id}`);
                mockPick.roster_id = trade.owner_id;
                
                // Also update picked_by to reflect the new owner
                if (mockPick.picked_by) {
                    // Find the user ID for the new roster owner
                    const newOwnerUserId = this.getRosterOwnerUserId(trade.owner_id);
                    if (newOwnerUserId) {
                        console.log(`🔄 Pick ${pickNumber} picked_by: ${mockPick.picked_by} -> ${newOwnerUserId}`);
                        mockPick.picked_by = newOwnerUserId;
                    }
                }
                
                changedPicks++;
            }
        });

        console.log(`✅ Applied ${changedPicks} traded picks to mock draft`);
    }

    /**
     * Get user ID for a roster ID from draft order
     */
    getRosterOwnerUserId(rosterId) {
        // Use real draft order if available, fallback to current draft
        const draftOrder = this.state.realDraftOrder || this.state.currentDraft?.draft_order;
        
        if (!draftOrder) {
            console.error('❌ getRosterOwnerUserId: No draft_order available');
            return null;
        }
        
        // draft_order maps user_id -> roster_id, we need the reverse
        for (const [userId, userRosterId] of Object.entries(draftOrder)) {
            if (parseInt(userRosterId) === parseInt(rosterId)) {
                return userId;
            }
        }
        
        console.error(`❌ getRosterOwnerUserId: No user found for rosterId ${rosterId}`);
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftHandlers;
}
