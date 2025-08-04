/**
 * UI Handlers Module
 * 
 * Handles general UI interactions including keyboard shortcuts,
 * notifications, modals, and other UI-specific functionality
 */

class UIHandlers {
    constructor(uiUtils, mobileEnhancements) {
        this.uiUtils = uiUtils;
        this.mobileEnhancements = mobileEnhancements;
        
        this.state = {
            activeModal: null,
            keyboardShortcutsEnabled: true
        };
    }

    /**
     * Initialize UI handlers
     */
    init() {
        this.setupKeyboardShortcuts();
        this.setupModalHandlers();
        this.setupNotificationHandlers();
        this.setupMobileEnhancements();
        this.setupGeneralUIHandlers();
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Initialize keyboard shortcuts if available
        if (window.app && window.app.keyboardShortcuts) {
            window.app.keyboardShortcuts.init();
            
            // Setup shortcuts help button
            const shortcutsBtn = document.getElementById('shortcuts-help-btn');
            if (shortcutsBtn) {
                console.log('✅ Setting up shortcuts-help-btn listener');
                shortcutsBtn.addEventListener('click', () => {
                    console.log('⌨️ Keyboard shortcuts help clicked');
                    this.showKeyboardShortcutsModal();
                });
            }
        }

        // Global keyboard event listeners
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });

        // Escape key handler for modals
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Escape' && this.state.activeModal) {
                this.closeActiveModal();
            }
        });
    }

    /**
     * Setup modal handlers
     */
    setupModalHandlers() {
        // Generic modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-close-btn') || e.target.closest('.modal-close-btn')) {
                this.closeActiveModal();
            }

            // Modal backdrop clicks
            if (e.target.matches('.modal-backdrop')) {
                this.closeActiveModal();
            }
        });

        // Settings modal
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                console.log('⚙️ Settings button clicked');
                this.showSettingsModal();
            });
        }

        // Help modal
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                console.log('❓ Help button clicked');
                this.showHelpModal();
            });
        }
    }

    /**
     * Setup notification handlers
     */
    setupNotificationHandlers() {
        // Notification close buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.notification-close') || e.target.closest('.notification-close')) {
                const notification = e.target.closest('.notification');
                if (notification) {
                    this.closeNotification(notification);
                }
            }
        });

        // Auto-close notifications after timeout
        this.setupNotificationAutoClose();
    }

    /**
     * Setup mobile enhancements
     */
    setupMobileEnhancements() {
        if (this.mobileEnhancements) {
            this.mobileEnhancements.init();
        }

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                console.log('📱 Mobile menu toggled');
                this.toggleMobileMenu();
            });
        }

        // Touch gesture handlers
        this.setupTouchGestures();
    }

    /**
     * Setup general UI handlers
     */
    setupGeneralUIHandlers() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('sl-change', (e) => {
                console.log('🎨 Theme toggled:', e.target.checked);
                this.toggleTheme(e.target.checked);
            });
        }

        // Fullscreen toggle
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                console.log('🖥️ Fullscreen toggled');
                this.toggleFullscreen();
            });
        }

        // Print button
        const printBtn = document.getElementById('print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                console.log('🖨️ Print clicked');
                this.handlePrint();
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('📤 Export clicked');
                this.handleExport();
            });
        }
    }

    /**
     * Handle global keydown events
     */
    handleGlobalKeydown(e) {
        if (!this.state.keyboardShortcutsEnabled) return;

        // Prevent shortcuts when typing in inputs
        if (e.target.matches('input, textarea, [contenteditable]')) {
            return;
        }

        switch (e.key) {
            case '?':
                e.preventDefault();
                this.showKeyboardShortcutsModal();
                break;
            case 'Escape':
                if (this.state.activeModal) {
                    e.preventDefault();
                    this.closeActiveModal();
                }
                break;
            case 'f':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.focusSearch();
                }
                break;
        }
    }

    /**
     * Show keyboard shortcuts modal
     */
    showKeyboardShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        if (modal) {
            modal.style.display = 'block';
            this.state.activeModal = modal;
        } else {
            // Create shortcuts modal if it doesn't exist
            this.createKeyboardShortcutsModal();
        }
    }

    /**
     * Create keyboard shortcuts modal
     */
    createKeyboardShortcutsModal() {
        const modal = document.createElement('div');
        modal.id = 'shortcuts-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Keyboard Shortcuts</h3>
                    <button class="modal-close-btn" type="button">
                        <sl-icon name="x-lg"></sl-icon>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-grid">
                        <div class="shortcut-item">
                            <kbd>?</kbd>
                            <span>Show this help</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>Close modal</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl/Cmd + F</kbd>
                            <span>Focus search</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>R</kbd>
                            <span>Refresh data</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Q</kbd>
                            <span>Toggle queue</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        this.state.activeModal = modal;
    }

    /**
     * Show settings modal
     */
    showSettingsModal() {
        // TODO: Implement settings modal
        this.uiUtils.showNotification('Settings modal coming soon', 'info');
    }

    /**
     * Show help modal
     */
    showHelpModal() {
        // TODO: Implement help modal
        this.uiUtils.showNotification('Help modal coming soon', 'info');
    }

    /**
     * Close active modal
     */
    closeActiveModal() {
        if (this.state.activeModal) {
            this.state.activeModal.style.display = 'none';
            this.state.activeModal = null;
        }
    }

    /**
     * Close notification
     */
    closeNotification(notification) {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Setup notification auto-close
     */
    setupNotificationAutoClose() {
        // Observer for new notifications
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        node.classList && node.classList.contains('notification')) {
                        
                        // Auto-close after 5 seconds unless it's an error
                        if (!node.classList.contains('notification-danger')) {
                            setTimeout(() => {
                                this.closeNotification(node);
                            }, 5000);
                        }
                    }
                });
            });
        });

        const notificationContainer = document.getElementById('notification-container');
        if (notificationContainer) {
            observer.observe(notificationContainer, { childList: true });
        }
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.toggle('open');
        }
    }

    /**
     * Setup touch gestures
     */
    setupTouchGestures() {
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Swipe gestures
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    // Swipe right
                    this.handleSwipeRight();
                } else {
                    // Swipe left
                    this.handleSwipeLeft();
                }
            }
        });
    }

    /**
     * Handle swipe right gesture
     */
    handleSwipeRight() {
        // TODO: Implement swipe right action
        console.log('👉 Swipe right detected');
    }

    /**
     * Handle swipe left gesture
     */
    handleSwipeLeft() {
        // TODO: Implement swipe left action
        console.log('👈 Swipe left detected');
    }

    /**
     * Toggle theme
     */
    toggleTheme(isDark) {
        document.body.classList.toggle('dark-theme', isDark);
        localStorage.setItem('darkTheme', isDark.toString());
        
        this.uiUtils.showNotification(
            `Switched to ${isDark ? 'dark' : 'light'} theme`, 
            'success'
        );
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Error entering fullscreen:', err);
                this.uiUtils.showNotification('Fullscreen not supported', 'warning');
            });
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Handle print
     */
    handlePrint() {
        window.print();
    }

    /**
     * Handle export
     */
    handleExport() {
        // TODO: Implement export functionality
        this.uiUtils.showNotification('Export functionality coming soon', 'info');
    }

    /**
     * Focus search input
     */
    focusSearch() {
        const searchInput = document.getElementById('player-search') || 
                           document.getElementById('user-search');
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * Enable/disable keyboard shortcuts
     */
    setKeyboardShortcutsEnabled(enabled) {
        this.state.keyboardShortcutsEnabled = enabled;
    }

    /**
     * Get UI state
     */
    getUIState() {
        return {
            activeModal: this.state.activeModal ? this.state.activeModal.id : null,
            keyboardShortcutsEnabled: this.state.keyboardShortcutsEnabled
        };
    }
}

// Export for use in other modules
window.UIHandlers = UIHandlers;
