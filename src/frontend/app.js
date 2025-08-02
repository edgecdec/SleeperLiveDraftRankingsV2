/**
 * Fantasy Football Draft Assistant V2 - Enhanced Application with Shoelace
 * 
 * This enhanced version uses Shoelace web components for a modern UI experience
 * while maintaining the same functionality as the original application.
 */

class EnhancedDraftAssistantApp {
    constructor() {
        this.apiBase = '/api';
        this.state = {
            connected: false,
            loading: false,
            currentSection: 'welcome',
            apiInfo: null,
            currentUser: null,
            userLeagues: [],
            selectedLeague: null,
            selectedDraft: null,
            autoRefreshEnabled: false,
            autoRefreshInterval: null,
            lastUpdate: 0,
            draftUpdates: null
        };
        
        // DOM elements
        this.elements = {
            statusIndicator: document.getElementById('status-indicator'),
            welcomeSection: document.getElementById('welcome-section'),
            userSetupSection: document.getElementById('user-setup-section'),
            draftSection: document.getElementById('draft-section'),
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            loadingProgress: document.getElementById('loading-progress'),
            versionInfo: document.getElementById('version-info'),
            notificationContainer: document.getElementById('notification-container')
        };
        
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
                this.setupEventListeners();
                this.init();
            }, 500);
            
        } catch (error) {
            console.error('❌ Error loading Shoelace components:', error);
            
            // Try to setup event listeners anyway
            setTimeout(() => {
                this.setupEventListeners();
                this.init();
            }, 1000);
        }
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Enhanced Fantasy Football Draft Assistant V2');
        
        try {
            // Test API connection with timeout
            await this.testConnection();
            this.updateConnectionStatus(true);
            
            // Load version info
            await this.loadVersionInfo();
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.updateConnectionStatus(false);
            
            // Show user-friendly error message
            this.showNotification(
                'Backend server not running. Click "Test Connection" to retry or start the server.', 
                'warning',
                10000
            );
            
            // Still load version info even if API fails
            await this.loadVersionInfo();
        }
    }
    
    /**
     * Set up event listeners for Shoelace components
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Button event listeners
        const getStartedBtn = document.getElementById('get-started-btn');
        if (getStartedBtn) {
            console.log('✅ Setting up get-started-btn listener');
            getStartedBtn.addEventListener('click', () => {
                console.log('🚀 Get Started clicked - showing user setup');
                this.showSection('user-setup');
            });
        } else {
            console.error('❌ get-started-btn not found');
        }
        
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            console.log('✅ Setting up test-connection-btn listener');
            testConnectionBtn.addEventListener('click', () => {
                console.log('🔌 Test Connection clicked');
                this.handleTestConnection();
            });
        } else {
            console.error('❌ test-connection-btn not found');
        }
        
        console.log('🎯 Event listeners setup complete');
    }
    
    /**
     * Show a section and hide others
     */
    showSection(sectionName) {
        const sections = ['welcome', 'user-setup', 'draft'];
        
        sections.forEach(section => {
            const element = document.getElementById(`${section}-section`);
            if (element) {
                element.style.display = section === sectionName ? 'block' : 'none';
            }
        });
        
        this.state.currentSection = sectionName;
    }
    
    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
        const indicator = this.elements.statusIndicator;
        if (!indicator) return;
        
        this.state.connected = connected;
        
        if (connected) {
            indicator.variant = 'success';
            indicator.pulse = false;
            indicator.innerHTML = '<sl-icon name="wifi"></sl-icon> Connected';
        } else {
            indicator.variant = 'danger';
            indicator.pulse = true;
            indicator.innerHTML = '<sl-icon name="wifi-off"></sl-icon> Disconnected';
        }
    }
    
    /**
     * Show notification using Shoelace alert
     */
    showNotification(message, variant = 'primary', duration = 5000) {
        const container = this.elements.notificationContainer;
        if (!container) return;
        
        const alert = document.createElement('sl-alert');
        alert.variant = variant;
        alert.closable = true;
        alert.duration = duration;
        
        // Add appropriate icon
        const iconName = this.getIconForVariant(variant);
        alert.innerHTML = `
            <sl-icon slot="icon" name="${iconName}"></sl-icon>
            ${message}
        `;
        
        container.appendChild(alert);
        alert.show();
        
        // Auto-remove after duration
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, duration);
    }
    
    /**
     * Get appropriate icon for alert variant
     */
    getIconForVariant(variant) {
        const icons = {
            primary: 'info-circle',
            success: 'check-circle',
            neutral: 'info-circle',
            warning: 'exclamation-triangle',
            danger: 'exclamation-octagon'
        };
        return icons[variant] || 'info-circle';
    }
    
    /**
     * Make API request with error handling and timeout
     */
    async apiRequest(endpoint, options = {}) {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                signal: controller.signal,
                ...options
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`API request timeout: ${endpoint}`);
                throw new Error('Request timed out - server may not be running');
            }
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }
    
    /**
     * Test API connection
     */
    async testConnection() {
        try {
            const response = await this.apiRequest('/health');
            this.state.apiInfo = response;
            return response;
        } catch (error) {
            throw new Error('Failed to connect to API');
        }
    }
    
    /**
     * Handle test connection button click
     */
    async handleTestConnection() {
        const button = document.getElementById('test-connection-btn');
        if (button) button.loading = true;
        
        try {
            await this.testConnection();
            this.updateConnectionStatus(true);
            this.showNotification('✅ Connection successful! Backend is running.', 'success');
        } catch (error) {
            this.updateConnectionStatus(false);
            
            let errorMessage = 'Connection failed: ';
            if (error.message.includes('timeout')) {
                errorMessage += 'Server not responding (timeout). Make sure the backend is running on port 5000.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Cannot reach server. Start the backend with: python main.py --port 5000';
            } else {
                errorMessage += error.message;
            }
            
            this.showNotification(errorMessage, 'danger', 15000);
        } finally {
            if (button) button.loading = false;
        }
    }
    
    /**
     * Load version info
     */
    async loadVersionInfo() {
        try {
            const versionElement = this.elements.versionInfo;
            if (versionElement) {
                versionElement.textContent = 'v2.0.0-enhanced';
            }
        } catch (error) {
            console.error('Failed to load version info:', error);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM Content Loaded - Initializing app...');
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
        console.log('✅ Found get-started-btn, adding click listener');
        
        // Add multiple event listeners to test
        getStartedBtn.addEventListener('click', (e) => {
            console.log('🔥 Get Started button clicked! Event:', e);
            alert('Get Started button works! (Debug mode)');
        });
        
        // Also try with mousedown for immediate feedback
        getStartedBtn.addEventListener('mousedown', () => {
            console.log('🖱️ Get Started button mousedown detected');
        });
        
    } else {
        console.error('❌ get-started-btn not found');
    }
    
    if (testConnectionBtn) {
        console.log('✅ Found test-connection-btn, adding click listener');
        
        testConnectionBtn.addEventListener('click', (e) => {
            console.log('🔥 Test Connection button clicked! Event:', e);
            alert('Test Connection button works! (Debug mode)');
        });
        
        testConnectionBtn.addEventListener('mousedown', () => {
            console.log('🖱️ Test Connection button mousedown detected');
        });
        
    } else {
        console.error('❌ test-connection-btn not found');
    }
    
    // Wait for Shoelace to load, then initialize the main app
    setTimeout(() => {
        console.log('🚀 Initializing main app after Shoelace load delay...');
        try {
            window.draftApp = new EnhancedDraftAssistantApp();
            console.log('✅ Main app initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize main app:', error);
        }
    }, 2000);
});
