/**
 * Fantasy Football Draft Assistant V2 - Main Application
 * 
 * This is the main application file that coordinates all modules
 */

class DraftAssistantApp {
    constructor() {
        // Initialize application state
        this.state = {
            currentUser: null,
            userLeagues: [],
            selectedLeague: null,
            selectedDraft: null
        };
        
        // Initialize services
        this.apiService = new ApiService();
        this.uiUtils = new UIUtils();
        this.mobileEnhancements = new MobileEnhancements(this.uiUtils);
        this.draftBoard = new DraftBoard(this.apiService, this.uiUtils);
        this.queueManager = new QueueManager(this.apiService, this.uiUtils);
        this.teamAnalysis = new TeamAnalysis(this.apiService, this.uiUtils);
        this.customRankings = new CustomRankings(this.apiService, this.uiUtils);
        this.eventHandlers = new EventHandlers(this.apiService, this.uiUtils, this.draftBoard, this.queueManager, this.teamAnalysis, this.customRankings, this.mobileEnhancements);
        this.keyboardShortcuts = new KeyboardShortcuts(this.uiUtils, this.eventHandlers);
        
        // Initialize when Shoelace is ready
        this.initializeWhenReady();
    }
    
    /**
     * Wait for Shoelace components to be ready, then initialize
     */
    async initializeWhenReady() {
        console.log('🎨 Waiting for Shoelace components to load...');
        
        try {
            // Wait for key Shoelace components to be defined
            console.log('⏳ Waiting for sl-button...');
            await customElements.whenDefined('sl-button');
            console.log('✅ sl-button ready');
            
            console.log('⏳ Waiting for sl-card...');
            await customElements.whenDefined('sl-card');
            console.log('✅ sl-card ready');
            
            console.log('⏳ Waiting for sl-input...');
            await customElements.whenDefined('sl-input');
            console.log('✅ sl-input ready');
            
            console.log('⏳ Waiting for sl-badge...');
            await customElements.whenDefined('sl-badge');
            console.log('✅ sl-badge ready');
            
            console.log('🎨 All Shoelace components loaded successfully');
            
            // Add a small delay to ensure components are fully rendered
            setTimeout(() => {
                this.eventHandlers.setupEventListeners();
                this.init();
            }, 500);
            
        } catch (error) {
            console.error('❌ Error loading Shoelace components:', error);
            
            // Try to setup event listeners anyway
            setTimeout(() => {
                this.eventHandlers.setupEventListeners();
                this.init();
            }, 1000);
        }
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Fantasy Football Draft Assistant V2');
        
        try {
            // Test API connection
            await this.apiService.testConnection();
            this.uiUtils.updateConnectionStatus(true);
            
            // Load version info
            this.loadVersionInfo();
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.uiUtils.updateConnectionStatus(false);
            
            // Show user-friendly error message
            this.uiUtils.showNotification(
                'Backend server not running. Click "Test Connection" to retry or start the server.', 
                'warning',
                10000
            );
            
            // Still load version info even if API fails
            this.loadVersionInfo();
        }
    }
    
    /**
     * Load version info
     */
    loadVersionInfo() {
        try {
            const versionElement = document.getElementById('version-info');
            if (versionElement) {
                versionElement.textContent = 'v2.0.0-refactored';
            }
        } catch (error) {
            console.error('Failed to load version info:', error);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM Content Loaded - Initializing refactored app...');
    console.log('🔍 Checking for Shoelace components...');
    
    // Check if Shoelace is loaded
    if (typeof customElements !== 'undefined') {
        console.log('✅ Custom Elements API available');
        
        // Check specific Shoelace components
        setTimeout(() => {
            console.log('🔍 Checking Shoelace component definitions...');
            console.log('sl-button defined:', customElements.get('sl-button') !== undefined);
            console.log('sl-card defined:', customElements.get('sl-card') !== undefined);
            console.log('sl-icon defined:', customElements.get('sl-icon') !== undefined);
        }, 1000);
    } else {
        console.error('❌ Custom Elements API not available');
    }
    
    // Add immediate debug event listeners to test button functionality
    const getStartedBtn = document.getElementById('get-started-btn');
    const testConnectionBtn = document.getElementById('test-connection-btn');
    
    console.log('🔍 Button elements found:');
    console.log('get-started-btn:', getStartedBtn);
    console.log('test-connection-btn:', testConnectionBtn);
    
    if (getStartedBtn) {
        console.log('✅ Found get-started-btn, adding debug click listener');
        getStartedBtn.addEventListener('click', (e) => {
            console.log('🔥 Get Started button clicked! (Debug listener)');
        });
    }
    
    if (testConnectionBtn) {
        console.log('✅ Found test-connection-btn, adding debug click listener');
        testConnectionBtn.addEventListener('click', (e) => {
            console.log('🔥 Test Connection button clicked! (Debug listener)');
        });
    }
    
    // Wait for Shoelace to load, then initialize the main app
    setTimeout(() => {
        console.log('🚀 Initializing refactored main app...');
        try {
            window.app = new DraftAssistantApp();
            console.log('✅ Refactored app initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize refactored app:', error);
        }
    }, 2000);
});
