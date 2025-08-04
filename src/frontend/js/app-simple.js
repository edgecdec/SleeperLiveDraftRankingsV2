/**
 * Simplified App for V1-Style User Search
 */

class SimpleApp {
    constructor() {
        this.apiService = new ApiService();
        this.landingHandlers = new LandingHandlers(this.apiService, null);
        
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
            
            // Fill in the form and trigger search
            const usernameInput = document.getElementById('username-input');
            const seasonSelect = document.getElementById('season-select');
            
            if (usernameInput && seasonSelect) {
                usernameInput.value = username;
                seasonSelect.value = season;
                
                // Trigger the search automatically
                console.log('🔄 Auto-triggering search for:', { username, season });
                this.landingHandlers.handleUserSearch(username, season);
            }
        }
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
    
    // Wait for Shoelace components to be ready
    setTimeout(() => {
        console.log('🚀 Starting Simple App...');
        window.app = new SimpleApp();
    }, 1000);
});
