/**
 * Navigation Handlers for Fantasy Football Draft Assistant V2
 * 
 * Handles navigation between different pages and sections of the app
 */

class NavigationHandlers {
    constructor() {
        this.currentPage = 'landing';
        this.setupEventListeners();
        console.log('✅ Navigation handlers initialized');
    }
    
    /**
     * Setup navigation event listeners
     */
    setupEventListeners() {
        // Tab navigation on landing page
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        console.log('✅ Navigation event listeners setup complete');
    }
    
    /**
     * Switch between tabs on landing page
     */
    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update active tab pane
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        console.log('🔄 Switched to tab:', tabName);
    }
    
    /**
     * Navigate to draft page
     */
    showDraftPage() {
        document.getElementById('landing-section').style.display = 'none';
        document.getElementById('draft-section').style.display = 'flex';
        this.currentPage = 'draft';
        console.log('🎯 Navigated to draft page');
    }
    
    /**
     * Navigate back to landing page
     */
    showLandingPage() {
        document.getElementById('draft-section').style.display = 'none';
        document.getElementById('landing-section').style.display = 'flex';
        this.currentPage = 'landing';
        console.log('🏠 Navigated to landing page');
    }
    
    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }
}

// Export for use in other modules
window.NavigationHandlers = NavigationHandlers;
