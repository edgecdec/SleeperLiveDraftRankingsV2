/**
 * Navigation Handlers Module
 * 
 * Handles URL management, tab navigation, and general navigation
 */

class NavigationHandlers {
    constructor(apiService, uiUtils) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        this.urlManager = new URLManager();
        
        // Setup URL navigation handler
        this.urlManager.setupPopstateHandler((params) => {
            this.handleUrlNavigation(params);
        });
    }

    /**
     * Initialize navigation handlers
     */
    init() {
        this.setupTabNavigation();
        
        // Check for auto-load from URL on initialization
        setTimeout(() => {
            this.checkAutoLoadFromUrl();
        }, 1000);
    }

    /**
     * Check if we should auto-load from URL parameters
     */
    async checkAutoLoadFromUrl() {
        const params = this.urlManager.getParams();
        
        if (params.username) {
            console.log('🔗 Auto-loading from URL:', params);
            
            // Auto-fill username and trigger search
            const usernameInput = document.getElementById('username-input');
            const seasonSelect = document.getElementById('season-select');
            
            if (usernameInput) {
                usernameInput.value = params.username;
                
                if (seasonSelect && params.season) {
                    seasonSelect.value = params.season;
                }
                
                // Trigger the search
                const searchEvent = new Event('submit', { bubbles: true });
                const form = document.getElementById('user-search-form');
                if (form) {
                    form.dispatchEvent(searchEvent);
                }
            }
        }
    }

    /**
     * Handle URL navigation changes
     */
    async handleUrlNavigation(params) {
        console.log('🔗 URL navigation:', params);
        
        if (params.username) {
            // Navigate to user's leagues
            await this.navigateToUser(params.username, params.season);
        } else {
            // Navigate to landing page
            this.navigateToLanding();
        }
    }

    /**
     * Navigate to user leagues
     */
    async navigateToUser(username, season = '2025') {
        try {
            // Show user setup section
            this.uiUtils.showSection('welcome');
            
            // Fill in the form and trigger search
            const usernameInput = document.getElementById('username-input');
            const seasonSelect = document.getElementById('season-select');
            
            if (usernameInput) {
                usernameInput.value = username;
            }
            
            if (seasonSelect) {
                seasonSelect.value = season;
            }
            
            // Trigger search via event
            if (window.app && window.app.landingHandlers) {
                await window.app.landingHandlers.handleUserSearch(username, season);
            }
            
        } catch (error) {
            console.error('❌ Failed to navigate to user:', error);
            this.navigateToLanding();
        }
    }

    /**
     * Navigate to landing page
     */
    navigateToLanding() {
        this.uiUtils.showSection('welcome');
        this.urlManager.clearParams();
    }

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const tabGroup = document.querySelector('sl-tab-group');
        if (tabGroup) {
            console.log('✅ Setting up tab-group listener');
            tabGroup.addEventListener('sl-tab-show', (event) => {
                this.handleTabChange(event.detail.name);
            });
        }
    }

    /**
     * Handle tab changes in draft view
     */
    handleTabChange(tabName) {
        console.log('📑 Tab changed to:', tabName);
        
        // Update URL to reflect current tab
        const params = this.urlManager.getParams();
        params.tab = tabName;
        this.urlManager.updateParams(params);
        
        // Handle tab-specific logic
        switch (tabName) {
            case 'available-players':
                this.handleAvailablePlayersTab();
                break;
            case 'best-available':
                this.handleBestAvailableTab();
                break;
            case 'draft-board':
                this.handleDraftBoardTab();
                break;
            case 'my-queue':
                this.handleQueueTab();
                break;
            case 'team-analysis':
                this.handleTeamAnalysisTab();
                break;
            case 'custom-rankings':
                this.handleCustomRankingsTab();
                break;
        }
    }

    /**
     * Handle available players tab
     */
    handleAvailablePlayersTab() {
        if (window.app && window.app.playerHandlers) {
            window.app.playerHandlers.loadAvailablePlayers();
        }
    }

    /**
     * Handle best available tab
     */
    handleBestAvailableTab() {
        if (window.app && window.app.playerHandlers) {
            window.app.playerHandlers.loadBestAvailable();
        }
    }

    /**
     * Handle draft board tab
     */
    handleDraftBoardTab() {
        if (window.app && window.app.draftHandlers) {
            window.app.draftHandlers.loadDraftBoard();
        }
    }

    /**
     * Handle queue tab
     */
    handleQueueTab() {
        if (window.app && window.app.playerHandlers) {
            window.app.playerHandlers.loadQueue();
        }
    }

    /**
     * Handle team analysis tab
     */
    handleTeamAnalysisTab() {
        if (window.app && window.app.teamAnalysis) {
            window.app.teamAnalysis.loadAnalysis();
        }
    }

    /**
     * Handle custom rankings tab
     */
    handleCustomRankingsTab() {
        if (window.app && window.app.customRankings) {
            window.app.customRankings.loadRankings();
        }
    }

    /**
     * Navigate to draft view
     */
    navigateToDraft(league, draft) {
        // Update URL
        const params = {
            username: window.app?.state?.currentUser?.username,
            league: league.league_id,
            draft: draft.draft_id
        };
        this.urlManager.updateParams(params);
        
        // Show draft section
        if (window.app && window.app.draftHandlers) {
            window.app.draftHandlers.showDraftSection();
        }
    }

    /**
     * Get current navigation state
     */
    getCurrentState() {
        return {
            params: this.urlManager.getParams(),
            section: this.getCurrentSection()
        };
    }

    /**
     * Get current visible section
     */
    getCurrentSection() {
        const sections = ['welcome-section', 'user-setup-section', 'league-select-section', 'draft-section'];
        
        for (const sectionId of sections) {
            const section = document.getElementById(sectionId);
            if (section && section.style.display !== 'none') {
                return sectionId.replace('-section', '');
            }
        }
        
        return 'welcome';
    }
}

// Export for use in other modules
window.NavigationHandlers = NavigationHandlers;
