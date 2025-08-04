/**
 * Draft Handlers Module
 * 
 * Handles draft-specific functionality including draft controls, 
 * draft view management, and draft data updates
 */

class DraftHandlers {
    constructor(apiService, uiUtils, draftBoard, queueManager, teamAnalysis) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        this.draftBoard = draftBoard;
        this.queueManager = queueManager;
        this.teamAnalysis = teamAnalysis;
        
        this.state = {
            selectedDraft: null,
            autoRefreshEnabled: false,
            autoRefreshInterval: null,
            lastUpdate: 0,
            draftUpdates: null
        };
    }

    /**
     * Initialize draft handlers
     */
    init() {
        this.setupDraftControls();
        this.setupDraftEventListeners();
    }

    /**
     * Setup draft control interactions
     */
    setupDraftControls() {
        // Manual refresh button
        const manualRefreshBtn = document.getElementById('manual-refresh-btn');
        if (manualRefreshBtn) {
            console.log('✅ Setting up manual-refresh-btn listener');
            manualRefreshBtn.addEventListener('click', () => {
                console.log('🔄 Manual refresh clicked');
                this.refreshDraftData();
            });
        }

        // Auto refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        if (autoRefreshToggle) {
            console.log('✅ Setting up auto-refresh-toggle listener');
            autoRefreshToggle.addEventListener('sl-change', (e) => {
                console.log('🔄 Auto refresh toggled:', e.target.checked);
                this.toggleAutoRefresh(e.target.checked);
            });
        }

        // VBD toggle
        const vbdToggle = document.getElementById('vbd-toggle');
        if (vbdToggle) {
            console.log('✅ Setting up vbd-toggle listener');
            vbdToggle.addEventListener('sl-change', (e) => {
                console.log('📊 VBD toggled:', e.target.checked);
                this.toggleVBD(e.target.checked);
            });
        }
    }

    /**
     * Setup draft-specific event listeners
     */
    setupDraftEventListeners() {
        // Roster toggle
        const rosterToggleBtn = document.getElementById('roster-toggle-btn');
        if (rosterToggleBtn) {
            console.log('✅ Setting up roster-toggle-btn listener');
            rosterToggleBtn.addEventListener('click', () => {
                console.log('👥 Roster toggle clicked');
                this.handleRosterToggle();
            });
        }

        // Draft refresh
        const refreshDraftBtn = document.getElementById('refresh-draft-btn');
        if (refreshDraftBtn) {
            console.log('✅ Setting up refresh-draft-btn listener');
            refreshDraftBtn.addEventListener('click', () => {
                console.log('🔄 Draft refresh clicked');
                this.refreshDraftData();
            });
        }

        // Back to leagues button
        const backToLeaguesBtn = document.getElementById('back-to-leagues-btn');
        if (backToLeaguesBtn) {
            console.log('✅ Setting up back-to-leagues-btn listener');
            backToLeaguesBtn.addEventListener('click', () => {
                console.log('⬅️ Back to leagues clicked');
                this.uiUtils.showSection('league-select');
            });
        }
    }

    /**
     * Handle roster sidebar toggle
     */
    handleRosterToggle() {
        const sidebar = document.getElementById('roster-sidebar');
        const toggleBtn = document.getElementById('roster-toggle-btn');
        const mainContent = document.querySelector('.draft-main-content');
        
        if (sidebar && toggleBtn && mainContent) {
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                sidebar.classList.remove('open');
                toggleBtn.innerHTML = '<sl-icon name="people"></sl-icon> Show Rosters';
                mainContent.classList.remove('sidebar-open');
                localStorage.setItem('rosterSidebarOpen', 'false');
            } else {
                sidebar.classList.add('open');
                toggleBtn.innerHTML = '<sl-icon name="x-lg"></sl-icon> Hide Rosters';
                mainContent.classList.add('sidebar-open');
                localStorage.setItem('rosterSidebarOpen', 'true');
            }
        }
    }

    /**
     * Toggle auto refresh
     */
    toggleAutoRefresh(enabled) {
        this.state.autoRefreshEnabled = enabled;
        
        if (enabled) {
            // Start auto refresh every 30 seconds
            this.state.autoRefreshInterval = setInterval(() => {
                this.refreshDraftData();
            }, 30000);
            this.uiUtils.showNotification('Auto refresh enabled', 'success');
        } else {
            // Stop auto refresh
            if (this.state.autoRefreshInterval) {
                clearInterval(this.state.autoRefreshInterval);
                this.state.autoRefreshInterval = null;
            }
            this.uiUtils.showNotification('Auto refresh disabled', 'info');
        }
    }

    /**
     * Toggle VBD (Value Based Drafting)
     */
    toggleVBD(enabled) {
        this.state.vbdEnabled = enabled;
        
        if (enabled) {
            this.uiUtils.showNotification('VBD calculations enabled', 'success');
            // TODO: Implement VBD calculations
        } else {
            this.uiUtils.showNotification('VBD calculations disabled', 'info');
        }
        
        // Refresh player display with/without VBD
        this.refreshPlayerDisplay();
    }

    /**
     * Refresh draft data
     */
    async refreshDraftData() {
        if (!this.state.selectedDraft) {
            console.warn('No draft selected for refresh');
            return;
        }

        try {
            console.log('🔄 Refreshing draft data...');
            
            // Show loading state
            const refreshBtn = document.getElementById('manual-refresh-btn') || 
                              document.getElementById('refresh-draft-btn');
            if (refreshBtn) {
                refreshBtn.loading = true;
            }

            // Fetch updated draft data
            const response = await this.apiService.getDraftData(this.state.selectedDraft.draft_id);
            
            if (response.status === 'success') {
                this.state.draftUpdates = response.data;
                this.state.lastUpdate = Date.now();
                
                // Update the draft board
                if (this.draftBoard) {
                    this.draftBoard.updateDraftData(response.data);
                }
                
                // Update team analysis
                if (this.teamAnalysis) {
                    this.teamAnalysis.updateAnalysis(response.data);
                }
                
                this.uiUtils.showNotification('Draft data refreshed', 'success');
                console.log('✅ Draft data refreshed successfully');
            } else {
                throw new Error(response.message || 'Failed to refresh draft data');
            }
        } catch (error) {
            console.error('❌ Error refreshing draft data:', error);
            this.uiUtils.showNotification('Failed to refresh draft data', 'danger');
        } finally {
            // Hide loading state
            const refreshBtn = document.getElementById('manual-refresh-btn') || 
                              document.getElementById('refresh-draft-btn');
            if (refreshBtn) {
                refreshBtn.loading = false;
            }
        }
    }

    /**
     * Refresh player display (for VBD toggle)
     */
    refreshPlayerDisplay() {
        // TODO: Implement player display refresh with VBD calculations
        console.log('🔄 Refreshing player display with VBD:', this.state.vbdEnabled);
    }

    /**
     * Show draft section and initialize
     */
    showDraftSection() {
        // Hide other sections
        document.getElementById('welcome-section').style.display = 'none';
        document.getElementById('user-setup-section').style.display = 'none';
        document.getElementById('league-select-section').style.display = 'none';
        
        // Show draft section
        document.getElementById('draft-section').style.display = 'block';
        
        // Initialize roster sidebar state
        const savedState = localStorage.getItem('rosterSidebarOpen');
        if (savedState === 'true') {
            setTimeout(() => this.handleRosterToggle(), 100);
        }
    }

    /**
     * Set selected draft
     */
    setSelectedDraft(draft) {
        this.state.selectedDraft = draft;
        console.log('🎯 Selected draft set:', draft);
    }

    /**
     * Set current user
     */
    setCurrentUser(user) {
        this.state.currentUser = user;
        console.log('👤 Current user set for draft handlers:', user);
    }

    /**
     * Set selected league
     */
    setSelectedLeague(league) {
        this.state.selectedLeague = league;
        console.log('🏆 Selected league set for draft handlers:', league);
    }

    /**
     * Set player handlers reference
     */
    setPlayerHandlers(playerHandlers) {
        this.playerHandlers = playerHandlers;
    }

    /**
     * Get current draft state
     */
    getDraftState() {
        return {
            selectedDraft: this.state.selectedDraft,
            autoRefreshEnabled: this.state.autoRefreshEnabled,
            vbdEnabled: this.state.vbdEnabled,
            lastUpdate: this.state.lastUpdate,
            draftUpdates: this.state.draftUpdates
        };
    }

    /**
     * Cleanup draft handlers
     */
    cleanup() {
        if (this.state.autoRefreshInterval) {
            clearInterval(this.state.autoRefreshInterval);
            this.state.autoRefreshInterval = null;
        }
    }
}

// Export for use in other modules
window.DraftHandlers = DraftHandlers;
