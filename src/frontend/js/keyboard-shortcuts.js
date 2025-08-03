/**
 * Keyboard Shortcuts Module for Fantasy Football Draft Assistant V2
 * 
 * Provides keyboard shortcuts for power users to navigate and interact efficiently
 * Part of Sprint 4: User Experience implementation
 */

class KeyboardShortcuts {
    constructor(uiUtils, eventHandlers) {
        this.uiUtils = uiUtils;
        this.eventHandlers = eventHandlers;
        this.shortcuts = new Map();
        this.isEnabled = true;
        this.helpVisible = false;
        this.activeModifiers = new Set();
        
        // Define keyboard shortcuts
        this.defineShortcuts();
    }
    
    /**
     * Initialize keyboard shortcuts
     */
    init() {
        console.log('⌨️ Initializing keyboard shortcuts...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Create help overlay
        this.createHelpOverlay();
        
        // Show initial help hint
        this.showInitialHint();
        
        console.log('✅ Keyboard shortcuts initialized');
        console.log(`⌨️ ${this.shortcuts.size} shortcuts available`);
    }
    
    /**
     * Define all keyboard shortcuts
     */
    defineShortcuts() {
        // Navigation shortcuts
        this.addShortcut('1', 'Switch to Available Players tab', () => this.switchTab('available-players'));
        this.addShortcut('2', 'Switch to Best Available tab', () => this.switchTab('best-available'));
        this.addShortcut('3', 'Switch to Draft Board tab', () => this.switchTab('draft-board'));
        this.addShortcut('4', 'Switch to My Queue tab', () => this.switchTab('my-queue'));
        this.addShortcut('5', 'Switch to Team Analysis tab', () => this.switchTab('team-analysis'));
        this.addShortcut('6', 'Switch to Custom Rankings tab', () => this.switchTab('custom-rankings'));
        
        // Search and filter shortcuts
        this.addShortcut('/', 'Focus search input', () => this.focusSearch());
        this.addShortcut('Escape', 'Clear search and filters', () => this.clearSearch());
        this.addShortcut('f', 'Toggle position filter', () => this.togglePositionFilter());
        this.addShortcut('v', 'Toggle VBD values', () => this.toggleVBD());
        
        // Draft actions
        this.addShortcut('r', 'Refresh draft data', () => this.refreshDraft());
        this.addShortcut('a', 'Toggle auto-refresh', () => this.toggleAutoRefresh());
        this.addShortcut('q', 'Add first player to queue', () => this.addFirstPlayerToQueue());
        this.addShortcut('Shift+q', 'Clear queue', () => this.clearQueue());
        
        // Position filters (with Alt modifier)
        this.addShortcut('Alt+q', 'Filter by QB', () => this.filterByPosition('QB'));
        this.addShortcut('Alt+r', 'Filter by RB', () => this.filterByPosition('RB'));
        this.addShortcut('Alt+w', 'Filter by WR', () => this.filterByPosition('WR'));
        this.addShortcut('Alt+t', 'Filter by TE', () => this.filterByPosition('TE'));
        this.addShortcut('Alt+k', 'Filter by K', () => this.filterByPosition('K'));
        this.addShortcut('Alt+d', 'Filter by DEF', () => this.filterByPosition('DEF'));
        this.addShortcut('Alt+a', 'Show all positions', () => this.filterByPosition(''));
        
        // Help and utility
        this.addShortcut('?', 'Show/hide keyboard shortcuts help', () => this.toggleHelp());
        this.addShortcut('Shift+?', 'Show keyboard shortcuts help', () => this.showHelp());
        this.addShortcut('h', 'Show keyboard shortcuts help', () => this.showHelp());
        
        // Advanced shortcuts
        this.addShortcut('Ctrl+k', 'Command palette (future)', () => this.showCommandPalette());
        this.addShortcut('j', 'Select next player', () => this.selectNextPlayer());
        this.addShortcut('k', 'Select previous player', () => this.selectPreviousPlayer());
        this.addShortcut('Enter', 'Add selected player to queue', () => this.addSelectedPlayerToQueue());
        this.addShortcut('Space', 'View selected player details', () => this.viewSelectedPlayerDetails());
    }
    
    /**
     * Add a keyboard shortcut
     */
    addShortcut(key, description, action) {
        const normalizedKey = this.normalizeKey(key);
        this.shortcuts.set(normalizedKey, {
            key: key,
            description: description,
            action: action,
            category: this.getShortcutCategory(key)
        });
    }
    
    /**
     * Normalize key for consistent storage
     */
    normalizeKey(key) {
        return key.toLowerCase().replace(/\s+/g, '');
    }
    
    /**
     * Get category for shortcut organization
     */
    getShortcutCategory(key) {
        if (/^[1-6]$/.test(key)) return 'Navigation';
        if (['/', 'Escape', 'f', 'v'].includes(key)) return 'Search & Filters';
        if (['r', 'a', 'q', 'Shift+q'].includes(key)) return 'Draft Actions';
        if (key.startsWith('Alt+')) return 'Position Filters';
        if (['?', 'Shift+?', 'h'].includes(key)) return 'Help';
        return 'Advanced';
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Disable shortcuts when typing in inputs
        document.addEventListener('focusin', (e) => {
            if (this.isInputElement(e.target)) {
                this.isEnabled = false;
            }
        });
        
        document.addEventListener('focusout', (e) => {
            if (this.isInputElement(e.target)) {
                this.isEnabled = true;
            }
        });
    }
    
    /**
     * Handle keydown events
     */
    handleKeyDown(e) {
        if (!this.isEnabled) return;
        
        // Track modifier keys
        if (e.ctrlKey) this.activeModifiers.add('Ctrl');
        if (e.altKey) this.activeModifiers.add('Alt');
        if (e.shiftKey) this.activeModifiers.add('Shift');
        if (e.metaKey) this.activeModifiers.add('Meta');
        
        // Build key combination
        const keyCombo = this.buildKeyCombo(e);
        const normalizedKey = this.normalizeKey(keyCombo);
        
        // Check if shortcut exists
        const shortcut = this.shortcuts.get(normalizedKey);
        if (shortcut) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                shortcut.action();
                this.showShortcutFeedback(shortcut.key, shortcut.description);
            } catch (error) {
                console.error(`❌ Error executing shortcut ${shortcut.key}:`, error);
            }
        }
    }
    
    /**
     * Handle keyup events
     */
    handleKeyUp(e) {
        // Clear modifier keys
        if (!e.ctrlKey) this.activeModifiers.delete('Ctrl');
        if (!e.altKey) this.activeModifiers.delete('Alt');
        if (!e.shiftKey) this.activeModifiers.delete('Shift');
        if (!e.metaKey) this.activeModifiers.delete('Meta');
    }
    
    /**
     * Build key combination string
     */
    buildKeyCombo(e) {
        const parts = [];
        
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        
        // Handle special keys
        let key = e.key;
        if (key === ' ') key = 'Space';
        if (key === 'Escape') key = 'Escape';
        if (key === 'Enter') key = 'Enter';
        if (key === '/') key = '/';
        if (key === '?') key = '?';
        
        parts.push(key);
        
        return parts.join('+');
    }
    
    /**
     * Check if element is an input element
     */
    isInputElement(element) {
        const inputTypes = ['input', 'textarea', 'select'];
        const tagName = element.tagName.toLowerCase();
        
        return inputTypes.includes(tagName) || 
               element.contentEditable === 'true' ||
               element.closest('sl-input, sl-textarea, sl-select');
    }
    
    /**
     * Show shortcut execution feedback
     */
    showShortcutFeedback(key, description) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'shortcut-feedback';
        feedback.innerHTML = `
            <div class="shortcut-key">${key}</div>
            <div class="shortcut-desc">${description}</div>
        `;
        
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--sl-color-primary-600);
            color: white;
            padding: 0.75rem 1rem;
            border-radius: var(--sl-border-radius-medium);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-size: 0.875rem;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(feedback);
        
        // Animate in
        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(0)';
        });
        
        // Remove after delay
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(100%)';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }
    
    /**
     * Create help overlay
     */
    createHelpOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'keyboard-shortcuts-help';
        overlay.className = 'shortcuts-help-overlay';
        overlay.style.display = 'none';
        
        overlay.innerHTML = `
            <div class="shortcuts-help-content">
                <div class="shortcuts-help-header">
                    <h3>Keyboard Shortcuts</h3>
                    <button class="shortcuts-help-close" aria-label="Close help">×</button>
                </div>
                <div class="shortcuts-help-body">
                    ${this.generateHelpContent()}
                </div>
                <div class="shortcuts-help-footer">
                    <p>Press <kbd>?</kbd> or <kbd>h</kbd> to toggle this help</p>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .shortcuts-help-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                backdrop-filter: blur(4px);
            }
            
            .shortcuts-help-content {
                background: white;
                border-radius: var(--sl-border-radius-large);
                max-width: 800px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
            }
            
            .shortcuts-help-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2rem;
                border-bottom: 1px solid var(--sl-color-neutral-200);
                background: var(--sl-color-neutral-50);
            }
            
            .shortcuts-help-header h3 {
                margin: 0;
                color: var(--sl-color-neutral-900);
            }
            
            .shortcuts-help-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--sl-color-neutral-600);
                padding: 0.25rem;
                border-radius: var(--sl-border-radius-small);
                transition: all 0.2s ease;
            }
            
            .shortcuts-help-close:hover {
                background: var(--sl-color-neutral-200);
                color: var(--sl-color-neutral-900);
            }
            
            .shortcuts-help-body {
                padding: 2rem;
                overflow-y: auto;
                flex: 1;
            }
            
            .shortcuts-category {
                margin-bottom: 2rem;
            }
            
            .shortcuts-category h4 {
                margin: 0 0 1rem 0;
                color: var(--sl-color-primary-600);
                font-size: 1.1rem;
                border-bottom: 1px solid var(--sl-color-neutral-200);
                padding-bottom: 0.5rem;
            }
            
            .shortcuts-list {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 0.75rem 1.5rem;
                align-items: center;
            }
            
            .shortcut-key {
                font-family: monospace;
                background: var(--sl-color-neutral-100);
                padding: 0.25rem 0.5rem;
                border-radius: var(--sl-border-radius-small);
                border: 1px solid var(--sl-color-neutral-300);
                font-size: 0.875rem;
                font-weight: 600;
                white-space: nowrap;
            }
            
            .shortcut-description {
                color: var(--sl-color-neutral-700);
                font-size: 0.875rem;
            }
            
            .shortcuts-help-footer {
                padding: 1rem 2rem;
                background: var(--sl-color-neutral-50);
                border-top: 1px solid var(--sl-color-neutral-200);
                text-align: center;
            }
            
            .shortcuts-help-footer p {
                margin: 0;
                color: var(--sl-color-neutral-600);
                font-size: 0.875rem;
            }
            
            .shortcuts-help-footer kbd {
                background: var(--sl-color-neutral-200);
                padding: 0.125rem 0.375rem;
                border-radius: var(--sl-border-radius-small);
                font-family: monospace;
                font-size: 0.8rem;
                border: 1px solid var(--sl-color-neutral-400);
            }
            
            @media (max-width: 768px) {
                .shortcuts-help-overlay {
                    padding: 1rem;
                }
                
                .shortcuts-help-content {
                    max-height: 90vh;
                }
                
                .shortcuts-help-header,
                .shortcuts-help-body,
                .shortcuts-help-footer {
                    padding: 1rem;
                }
                
                .shortcuts-list {
                    grid-template-columns: 1fr;
                    gap: 0.5rem;
                }
                
                .shortcut-key {
                    justify-self: start;
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(overlay);
        
        // Setup close handlers
        overlay.querySelector('.shortcuts-help-close').addEventListener('click', () => this.hideHelp());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.hideHelp();
        });
    }
    
    /**
     * Generate help content HTML
     */
    generateHelpContent() {
        const categories = {};
        
        // Group shortcuts by category
        for (const [key, shortcut] of this.shortcuts) {
            if (!categories[shortcut.category]) {
                categories[shortcut.category] = [];
            }
            categories[shortcut.category].push(shortcut);
        }
        
        // Generate HTML for each category
        let html = '';
        for (const [category, shortcuts] of Object.entries(categories)) {
            html += `
                <div class="shortcuts-category">
                    <h4>${category}</h4>
                    <div class="shortcuts-list">
            `;
            
            shortcuts.forEach(shortcut => {
                html += `
                    <div class="shortcut-key">${shortcut.key}</div>
                    <div class="shortcut-description">${shortcut.description}</div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * Show initial hint about keyboard shortcuts
     */
    showInitialHint() {
        // Only show hint once per session
        if (sessionStorage.getItem('shortcuts-hint-shown')) return;
        
        setTimeout(() => {
            if (this.uiUtils && this.uiUtils.showNotification) {
                this.uiUtils.showNotification(
                    'Press ? or h for keyboard shortcuts', 
                    'neutral', 
                    5000
                );
            }
            sessionStorage.setItem('shortcuts-hint-shown', 'true');
        }, 3000);
    }
    
    // Shortcut action implementations
    
    switchTab(tabName) {
        const tab = document.querySelector(`sl-tab[panel="${tabName}"]`);
        if (tab) {
            tab.click();
        }
    }
    
    focusSearch() {
        const searchInput = document.getElementById('player-search');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    clearSearch() {
        const searchInput = document.getElementById('player-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('sl-input'));
        }
        
        // Clear position filter
        const positionSelect = document.getElementById('position-filter');
        if (positionSelect) {
            positionSelect.value = '';
            positionSelect.dispatchEvent(new Event('sl-change'));
        }
    }
    
    togglePositionFilter() {
        const positionSelect = document.getElementById('position-filter');
        if (positionSelect) {
            positionSelect.focus();
        }
    }
    
    toggleVBD() {
        const vbdToggle = document.getElementById('vbd-toggle');
        if (vbdToggle) {
            vbdToggle.checked = !vbdToggle.checked;
            vbdToggle.dispatchEvent(new Event('sl-change'));
        }
    }
    
    refreshDraft() {
        if (this.eventHandlers && this.eventHandlers.handleManualRefresh) {
            this.eventHandlers.handleManualRefresh();
        }
    }
    
    toggleAutoRefresh() {
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.checked = !autoRefreshToggle.checked;
            autoRefreshToggle.dispatchEvent(new Event('sl-change'));
        }
    }
    
    addFirstPlayerToQueue() {
        const firstPlayerCard = document.querySelector('.player-card');
        if (firstPlayerCard) {
            const queueBtn = firstPlayerCard.querySelector('.add-to-queue-btn');
            if (queueBtn) {
                queueBtn.click();
            }
        }
    }
    
    clearQueue() {
        if (this.eventHandlers && this.eventHandlers.queueManager) {
            this.eventHandlers.queueManager.clearQueue();
        }
    }
    
    filterByPosition(position) {
        const positionSelect = document.getElementById('position-filter');
        if (positionSelect) {
            positionSelect.value = position;
            positionSelect.dispatchEvent(new Event('sl-change'));
        }
    }
    
    toggleHelp() {
        if (this.helpVisible) {
            this.hideHelp();
        } else {
            this.showHelp();
        }
    }
    
    showHelp() {
        const overlay = document.getElementById('keyboard-shortcuts-help');
        if (overlay) {
            overlay.style.display = 'flex';
            this.helpVisible = true;
            
            // Focus the close button for accessibility
            const closeBtn = overlay.querySelector('.shortcuts-help-close');
            if (closeBtn) {
                closeBtn.focus();
            }
        }
    }
    
    hideHelp() {
        const overlay = document.getElementById('keyboard-shortcuts-help');
        if (overlay) {
            overlay.style.display = 'none';
            this.helpVisible = false;
        }
    }
    
    showCommandPalette() {
        // Future feature - command palette
        if (this.uiUtils && this.uiUtils.showNotification) {
            this.uiUtils.showNotification('Command palette coming soon!', 'neutral');
        }
    }
    
    selectNextPlayer() {
        // Future feature - keyboard navigation of player list
        console.log('⌨️ Select next player (coming soon)');
    }
    
    selectPreviousPlayer() {
        // Future feature - keyboard navigation of player list
        console.log('⌨️ Select previous player (coming soon)');
    }
    
    addSelectedPlayerToQueue() {
        // Future feature - add currently selected player to queue
        console.log('⌨️ Add selected player to queue (coming soon)');
    }
    
    viewSelectedPlayerDetails() {
        // Future feature - view details of currently selected player
        console.log('⌨️ View selected player details (coming soon)');
    }
    
    /**
     * Enable/disable keyboard shortcuts
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`⌨️ Keyboard shortcuts ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get all available shortcuts
     */
    getShortcuts() {
        return Array.from(this.shortcuts.values());
    }
    
    /**
     * Get shortcuts by category
     */
    getShortcutsByCategory() {
        const categories = {};
        for (const shortcut of this.shortcuts.values()) {
            if (!categories[shortcut.category]) {
                categories[shortcut.category] = [];
            }
            categories[shortcut.category].push(shortcut);
        }
        return categories;
    }
}
