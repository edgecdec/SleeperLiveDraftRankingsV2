/**
 * Simplified App for V1-Style User Search
 */
class SimpleApp {
    constructor() {
        this.apiService = new ApiService();
        this.navigationHandlers = new NavigationHandlers();
        this.landingHandlers = new LandingHandlers(this.apiService, this.navigationHandlers);
        this.draftHandlers = new DraftHandlers(this.apiService, this.navigationHandlers);
        this.autoLoadAttempted = false; // Prevent multiple auto-load attempts
        
        // Set up cross-references
        this.landingHandlers.setDraftHandlers(this.draftHandlers);
        this.draftHandlers.setLandingHandlers(this.landingHandlers);
        
        // Global state
        this.state = {
            currentUser: null,
            userLeagues: [],
            selectedLeague: null,
            selectedDraft: null
        };
        
        // Initialize when ready
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Simple V1-Style App');
        
        try {
            // Initialize route migration first
            window.RouteMigration.init();
            
            // Test API connection
            await this.apiService.testConnection();
            console.log('✅ API connection successful');
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Setup browser history navigation
            this.setupHistoryNavigation();
            
            // Check for URL parameters and auto-load user
            await this.checkUrlForAutoLoad();
            
            console.log('✅ Simple app initialized successfully');
        } catch (error) {
            console.error('❌ Simple app initialization failed:', error);
        }
    }
    
    /**
     * Check URL for auto-loading user data
     */
    async checkUrlForAutoLoad() {
        // Prevent multiple attempts
        if (this.autoLoadAttempted) {
            console.log('⚠️ Auto-load already attempted, skipping');
            return;
        }
        
        const path = window.location.pathname;
        console.log('🔍 Checking URL path:', path);
        
        // Check if we're on a user page: /sleeper/user/username
        const userMatch = path.match(/^\/sleeper\/user\/([^\/]+)$/);
        if (userMatch) {
            const username = userMatch[1];
            console.log('🎯 Found username in URL:', username);
            
            // Get season from URL params or default to 2025
            const urlParams = new URLSearchParams(window.location.search);
            const season = urlParams.get('season') || '2025';
            
            console.log('📋 Auto-load parameters:', { username, season });
            
            // Fill in the form elements
            const usernameInput = document.getElementById('username-input');
            const seasonSelect = document.getElementById('season-select');
            
            console.log('🔍 Form elements found:', {
                usernameInput: !!usernameInput,
                seasonSelect: !!seasonSelect,
                usernameInputValue: usernameInput?.value,
                seasonSelectValue: seasonSelect?.value
            });
            
            if (usernameInput && seasonSelect) {
                // Mark as attempted
                this.autoLoadAttempted = true;
                
                // Set the values
                usernameInput.value = username;
                seasonSelect.value = season;
                
                console.log('✅ Form values set:', {
                    username: usernameInput.value,
                    season: seasonSelect.value
                });
                
                // Trigger the search automatically
                console.log('🔄 Auto-triggering search for:', { username, season });
                this.landingHandlers.handleUserSearch(username, season);
            } else {
                console.log('⚠️ Form elements not found, retrying in 1 second...');
                // Retry after a short delay if elements aren't ready
                setTimeout(async () => {
                    if (!this.autoLoadAttempted) {
                        await this.checkUrlForAutoLoad();
                    }
                }, 1000);
            }
            return;
        }
        
        // Check for user-based draft URLs: /sleeper/user/{username}/league/{league_id}/draft/{draft_id}
        const userDraftMatch = path.match(/^\/sleeper\/user\/([^\/]+)\/league\/([^\/]+)\/draft\/([^\/]+)$/);
        if (userDraftMatch) {
            const username = userDraftMatch[1];
            const leagueId = userDraftMatch[2];
            const draftId = userDraftMatch[3];
            
            console.log('🎯 Found user-based draft URL:', { username, leagueId, draftId });
            
            // Mark as attempted
            this.autoLoadAttempted = true;
            
            // Load user data first, then navigate to draft
            console.log('🔄 Loading user data before draft navigation');
            await this.loadUserThenDraft(username, leagueId, draftId);
            return;
        }
        
        // Check for user-based mock draft URLs: /sleeper/user/{username}/league/{league_id}/draft/{draft_id}/mock/{mock_draft_id}
        const userMockDraftMatch = path.match(/^\/sleeper\/user\/([^\/]+)\/league\/([^\/]+)\/draft\/([^\/]+)\/mock\/([^\/]+)$/);
        if (userMockDraftMatch) {
            const username = userMockDraftMatch[1];
            const leagueId = userMockDraftMatch[2];
            const draftId = userMockDraftMatch[3];
            const mockDraftId = userMockDraftMatch[4];
            
            console.log('🎭 Found user-based mock draft URL:', { username, leagueId, draftId, mockDraftId });
            
            // Mark as attempted
            this.autoLoadAttempted = true;
            
            // Load user data first, then navigate to mock draft
            console.log('🔄 Loading user data before mock draft navigation');
            await this.loadUserThenMockDraft(username, leagueId, draftId, mockDraftId);
            return;
        }
        
        // Check for legacy mock draft URLs: /sleeper/mock/{draft_id}
        const mockDraftMatch = path.match(/^\/sleeper\/mock\/([^\/]+)$/);
        if (mockDraftMatch) {
            const draftId = mockDraftMatch[1];
            
            console.log('🎭 Found legacy mock draft URL:', { draftId });
            
            // Mark as attempted
            this.autoLoadAttempted = true;
            
            // Set mock draft flag
            this.state.isMockDraft = true;
            
            // Load mock draft using existing draft loading logic
            console.log('🚀 Loading legacy mock draft from URL:', { draftId });
            this.draftHandlers.handleDraftSelected({
                draft_id: draftId,
                isMockDraft: true
            });
            return;
        }
        
        // Check for legacy draft URLs: /sleeper/league/{league_id}/draft/{draft_id}
        const draftMatch = path.match(/^\/sleeper\/league\/([^\/]+)\/draft\/([^\/]+)$/);
        if (draftMatch) {
            const leagueId = draftMatch[1];
            const draftId = draftMatch[2];
            
            console.log('🎯 Found draft URL:', { leagueId, draftId });
            
            // Mark as attempted
            this.autoLoadAttempted = true;
            
            // Load draft directly
            console.log('🚀 Loading draft from URL:', { leagueId, draftId });
            
            // Create a mock draft object for the handlers
            const mockDraft = {
                draft_id: draftId,
                type: 'snake', // Default type
                status: 'drafting', // Default status
                league: {
                    league_id: leagueId
                }
            };
            
            // Trigger direct draft selection
            console.log('🎯 Triggering direct draft selection with:', mockDraft);
            this.draftHandlers.handleDraftSelected(mockDraft);
            return;
        }
        
        console.log('ℹ️ No auto-load pattern found in URL');
    }
    
    /**
     * Load draft directly from URL parameters
     */
    async loadDraftFromUrl(leagueId, draftId) {
        console.log('🚀 Loading draft from URL:', { leagueId, draftId });
        
        try {
            // Create mock league and draft objects for direct access
            const mockLeague = {
                league_id: leagueId,
                name: 'Loading...',
                total_rosters: 12,
                season: '2025'
            };
            
            const mockDraft = {
                draft_id: draftId,
                type: 'snake',
                status: 'drafting',
                league: mockLeague
            };
            
            // Trigger draft selection directly
            console.log('🎯 Triggering direct draft selection with:', mockDraft);
            
            // Make sure draft handlers exist
            if (!this.draftHandlers) {
                console.error('❌ Draft handlers not initialized!');
                this.showLandingPage();
                return;
            }
            
            await this.draftHandlers.handleDraftSelected(mockDraft);
            
        } catch (error) {
            console.error('❌ Error loading draft from URL:', error);
            // Fall back to showing the landing page
            this.showLandingPage();
        }
    }
    
    /**
     * Load user data first, then navigate to mock draft
     */
    async loadUserThenMockDraft(username, leagueId, draftId, mockDraftId) {
        console.log('🔄 Loading user data then navigating to mock draft:', { username, leagueId, draftId, mockDraftId });
        
        try {
            // Load user data first
            await this.landingHandlers.handleUserSearch(username, '2025');
            
            // Set mock draft flag
            this.state.isMockDraft = true;
            
            // Navigate to mock draft with league context
            console.log('🚀 Loading mock draft with league context:', { username, leagueId, draftId, mockDraftId });
            console.log('🔍 Draft handlers available:', !!this.draftHandlers);
            console.log('🔍 About to call handleDraftSelected');
            
            const result = this.draftHandlers.handleDraftSelected({
                draft_id: draftId,
                mock_draft_id: mockDraftId,
                isMockDraft: true,
                leagueId: leagueId
            });
            
            console.log('🔍 handleDraftSelected result:', result);
            
        } catch (error) {
            console.error('❌ Error loading user data for mock draft:', error);
            console.error('❌ Error stack:', error.stack);
            console.log('⚠️ NOT falling back to landing page - staying on mock draft');
            
            // Don't fallback to landing page for mock drafts - try to load anyway
            this.state.isMockDraft = true;
            this.draftHandlers.handleDraftSelected({
                draft_id: draftId,
                mock_draft_id: mockDraftId,
                isMockDraft: true,
                leagueId: leagueId
            });
        }
    }
    
    /**
     * Load user data first, then navigate to specific draft
     */
    async loadUserThenDraft(username, leagueId, draftId) {
        console.log('🔄 Loading user data then navigating to draft:', { username, leagueId, draftId });
        
        try {
            // Get season from URL params or default to 2025
            const urlParams = new URLSearchParams(window.location.search);
            const season = urlParams.get('season') || '2025';
            
            // Load user data first
            console.log('📡 Loading user leagues for:', username, 'season:', season);
            await this.landingHandlers.handleUserSearch(username, season);
            
            // Wait a moment for the leagues to load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Find the specific league and draft
            const userLeagues = this.state.userLeagues || [];
            const targetLeague = userLeagues.find(league => league.league_id === leagueId);
            
            if (targetLeague) {
                const targetDraft = targetLeague.drafts?.find(draft => draft.draft_id === draftId);
                
                if (targetDraft) {
                    console.log('✅ Found target league and draft, navigating...');
                    await this.landingHandlers.handleDraftSelect(targetLeague, targetDraft);
                } else {
                    console.warn('⚠️ Draft not found in league, creating mock draft');
                    const mockDraft = {
                        draft_id: draftId,
                        type: 'snake',
                        status: 'drafting'
                    };
                    await this.landingHandlers.handleDraftSelect(targetLeague, mockDraft);
                }
            } else {
                console.warn('⚠️ League not found in user leagues, creating mock objects');
                const mockLeague = {
                    league_id: leagueId,
                    name: 'Loading...',
                    total_rosters: 12,
                    season: season
                };
                const mockDraft = {
                    draft_id: draftId,
                    type: 'snake',
                    status: 'drafting'
                };
                await this.landingHandlers.handleDraftSelect(mockLeague, mockDraft);
            }
            
        } catch (error) {
            console.error('❌ Error loading user then draft:', error);
            this.showLandingPage();
        }
    }
    
    /**
     * Load mock draft directly from URL parameters
     */
    async loadMockDraftFromUrl(draftId) {
        console.log('🎭 Loading mock draft from URL:', { draftId });
        
        try {
            // Create mock league and draft objects for mock draft
            const mockLeague = {
                league_id: 'mock',
                name: `Mock Draft ${draftId}`,
                total_rosters: 12,
                season: '2025'
            };
            
            const mockDraft = {
                draft_id: draftId,
                type: 'snake',
                status: 'drafting',
                league: mockLeague
            };
            
            // Set mock draft flag
            this.state.isMockDraft = true;
            
            // Trigger draft selection directly
            console.log('🎯 Triggering mock draft selection with:', mockDraft);
            
            // Make sure draft handlers exist
            if (!this.draftHandlers) {
                console.error('❌ Draft handlers not initialized!');
                this.showLandingPage();
                return;
            }
            
            await this.draftHandlers.handleDraftSelected(mockDraft);
            
        } catch (error) {
            console.error('❌ Error loading mock draft from URL:', error);
            // Fall back to showing the landing page
            this.showLandingPage();
        }
    }
    
    /**
     * Setup browser history navigation
     */
    setupHistoryNavigation() {
        window.addEventListener('popstate', async (event) => {
            console.log('🔙 Browser back/forward navigation detected:', event.state);
            
            if (event.state) {
                if (event.state.page === 'user') {
                    // Navigate back to user page
                    console.log('📍 Navigating to user page');
                    this.draftHandlers.performBackNavigation();
                    
                } else if (event.state.page === 'draft') {
                    // Navigate to draft page
                    console.log('📍 Navigating to draft page');
                    const { league, draft } = event.state;
                    if (league && draft) {
                        this.landingHandlers.handleDraftSelect(league, draft);
                    }
                }
            } else {
                // No state, check URL
                await this.checkUrlForAutoLoad();
            }
        });
        
        console.log('✅ Browser history navigation setup complete');
    }
    
    /**
     * Show the landing page (fallback)
     */
    showLandingPage() {
        const userSetupPage = document.getElementById('user-setup-page');
        const draftSection = document.getElementById('draft-section');
        
        if (userSetupPage) userSetupPage.style.display = 'block';
        if (draftSection) draftSection.style.display = 'none';
    }
    
    setupEventHandlers() {
        // Setup user search form
        this.landingHandlers.setupUserSearchForm();
        
        // Setup tab navigation
        this.setupTabNavigation();
        
        // Setup global draft select handler
        window.handleDraftSelect = (leagueId, draftId) => {
            console.log('🎯 Draft selected:', { leagueId, draftId });
            
            // Get current user to build proper URL
            const currentUser = this.state.currentUser;
            if (currentUser && currentUser.username) {
                const userDraftUrl = window.RouteBuilder.userDraft(currentUser.username, leagueId, draftId);
                console.log('✅ Navigating to user-based draft URL:', userDraftUrl);
                window.location.href = userDraftUrl;
            } else {
                console.warn('⚠️ No current user available, cannot build user-based URL');
                // Fallback to legacy URL (will be migrated by route migration)
                console.log('🔄 Using legacy URL as fallback');
                window.location.href = `/sleeper/league/${leagueId}/draft/${draftId}`;
            }
        };
    }
    
    setupTabNavigation() {
        const leaguesTabBtn = document.getElementById('leagues-tab-btn');
        const mockDraftTabBtn = document.getElementById('mock-draft-tab-btn');
        const leaguesTabContent = document.getElementById('leagues-tab-content');
        const mockDraftTabContent = document.getElementById('mock-draft-tab-content');
        
        if (leaguesTabBtn && mockDraftTabBtn) {
            leaguesTabBtn.addEventListener('click', () => {
                // Switch to leagues tab
                leaguesTabBtn.classList.add('active');
                mockDraftTabBtn.classList.remove('active');
                
                if (leaguesTabContent) leaguesTabContent.style.display = 'block';
                if (mockDraftTabContent) mockDraftTabContent.style.display = 'none';
            });
            
            mockDraftTabBtn.addEventListener('click', () => {
                // Switch to mock draft tab
                mockDraftTabBtn.classList.add('active');
                leaguesTabBtn.classList.remove('active');
                
                if (mockDraftTabContent) mockDraftTabContent.style.display = 'block';
                if (leaguesTabContent) leaguesTabContent.style.display = 'none';
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 DOM loaded, waiting for Shoelace...');
    
    // Check if Shoelace components are defined
    const checkShoelace = () => {
        const slButton = customElements.get('sl-button');
        const slInput = customElements.get('sl-input');
        const slSelect = customElements.get('sl-select');
        
        console.log('🔍 Checking Shoelace component definitions...');
        console.log('sl-button defined:', !!slButton);
        console.log('sl-input defined:', !!slInput);
        console.log('sl-select defined:', !!slSelect);
        
        if (slButton && slInput && slSelect) {
            console.log('✅ Shoelace components ready, starting app...');
            window.app = new SimpleApp();
            return true;
        }
        return false;
    };
    
    // Try immediately
    if (!checkShoelace()) {
        // If not ready, wait a bit longer
        console.log('⏳ Shoelace not ready, waiting...');
        setTimeout(() => {
            if (!checkShoelace()) {
                // Final attempt after longer delay
                setTimeout(() => {
                    console.log('🚀 Starting app anyway (final attempt)...');
                    window.app = new SimpleApp();
                }, 2000);
            }
        }, 1000);
    }
});
