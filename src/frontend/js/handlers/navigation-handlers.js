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
        this.landingHandlers = null; // Will be set by main event handler
        
        this.state = {
            currentSection: 'welcome',
            navigationHistory: []
        };
        
        // Setup URL navigation handler
        this.urlManager.setupPopstateHandler((params) => {
            this.handleUrlNavigation(params);
        });
    }

    /**
     * Set reference to landing handlers for cross-communication
     */
    setLandingHandlers(landingHandlers) {
        this.landingHandlers = landingHandlers;
    }

    /**
     * Initialize navigation handlers
     */
    init() {
        this.setupTabNavigation();
        this.setupNavigationButtons();
        
        // Check for auto-load from URL on initialization
        setTimeout(() => {
            this.checkAutoLoadFromUrl();
        }, 1000);
    }

    /**
     * Setup main navigation buttons
     */
    setupNavigationButtons() {
        // Get started button
        const getStartedBtn = document.getElementById('get-started-btn');
        if (getStartedBtn) {
            console.log('✅ Setting up get-started-btn listener');
            getStartedBtn.addEventListener('click', () => {
                console.log('🚀 Get Started clicked - showing user setup');
                this.navigateToSection('user-setup');
            });
        }

        // Back to user button
        const backToUserBtn = document.getElementById('back-to-user-btn');
        if (backToUserBtn) {
            console.log('✅ Setting up back-to-user-btn listener');
            backToUserBtn.addEventListener('click', () => {
                console.log('⬅️ Back to user setup clicked');
                this.navigateToSection('user-setup');
            });
        }

        // Back to leagues button
        const backToLeaguesBtn = document.getElementById('back-to-leagues-btn');
        if (backToLeaguesBtn) {
            console.log('✅ Setting up back-to-leagues-btn listener');
            backToLeaguesBtn.addEventListener('click', () => {
                console.log('⬅️ Back to leagues clicked');
                this.navigateToSection('league-select');
            });
        }
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
     * Navigate to a specific section with coordination
     */
    navigateToSection(section, data = null) {
        console.log(`🧭 Navigating to section: ${section}`);
        
        // Update state
        this.state.navigationHistory.push(this.state.currentSection);
        this.state.currentSection = section;
        
        // Emit navigation event for other handlers
        const navigationEvent = new CustomEvent('navigationRequested', {
            detail: { section, data }
        });
        document.dispatchEvent(navigationEvent);
        
        // Update URL if needed
        this.updateUrlForSection(section, data);
    }

    /**
     * Update URL for current section
     */
    updateUrlForSection(section, data) {
        const params = {};
        
        if (data) {
            if (data.username) params.username = data.username;
            if (data.league_id) params.league_id = data.league_id;
            if (data.draft_id) params.draft_id = data.draft_id;
        }
        
        this.urlManager.updateParams(params);
    }

    /**
     * Go back to previous section
     */
    goBack() {
        if (this.state.navigationHistory.length > 0) {
            const previousSection = this.state.navigationHistory.pop();
            this.navigateToSection(previousSection);
        }
    }

    /**
     * Cleanup navigation handlers
     */
    cleanup() {
        // Clean up any navigation-specific resources
        console.log('🧹 Cleaning up navigation handlers');
    }

    /**
     * Update URL with parameters
     */
    updateUrl(params) {
        console.log('🔗 Updating URL with params:', params);
        this.urlManager.updateParams(params);
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
