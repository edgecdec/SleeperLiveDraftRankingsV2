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
            // Test API connection
            await this.apiService.testConnection();
            console.log('✅ API connection successful');
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Check for URL parameters and auto-load user
            this.checkUrlForAutoLoad();
            
            console.log('✅ Simple app initialized successfully');
        } catch (error) {
            console.error('❌ Simple app initialization failed:', error);
        }
    }
    
    /**
     * Check URL for auto-loading user data
     */
    checkUrlForAutoLoad() {
        // Prevent multiple attempts
        if (this.autoLoadAttempted) {
            console.log('⚠️ Auto-load already attempted, skipping');
            return;
        }
        
        const path = window.location.pathname;
        console.log('🔍 Checking URL path:', path);
        
        // Check if we're on a user page: /user/username
        const userMatch = path.match(/^\/user\/([^\/]+)$/);
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
                setTimeout(() => {
                    if (!this.autoLoadAttempted) {
                        this.checkUrlForAutoLoad();
                    }
                }, 1000);
            }
            return;
        }
        
        // Check for draft URLs: /sleeper/league/{league_id}/draft/{draft_id}
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
            this.draftHandlers.selectDraft(mockDraft);
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
            // Navigate to draft view
            window.location.href = `/sleeper/league/${leagueId}/draft/${draftId}`;
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
