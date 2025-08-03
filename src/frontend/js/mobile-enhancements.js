/**
 * Mobile Enhancements Module for Fantasy Football Draft Assistant V2
 * 
 * Provides mobile-specific functionality and optimizations
 * Part of Sprint 4: User Experience implementation
 */

class MobileEnhancements {
    constructor(uiUtils) {
        this.uiUtils = uiUtils;
        this.isMobile = this.detectMobile();
        this.isTouch = this.detectTouch();
        this.orientation = this.getOrientation();
        this.viewportHeight = window.innerHeight;
    }
    
    /**
     * Initialize mobile enhancements
     */
    init() {
        console.log('📱 Initializing mobile enhancements...');
        console.log(`📱 Mobile: ${this.isMobile}, Touch: ${this.isTouch}, Orientation: ${this.orientation}`);
        
        if (this.isMobile || this.isTouch) {
            this.setupMobileOptimizations();
            this.setupTouchEnhancements();
            this.setupViewportHandling();
            this.setupOrientationHandling();
            this.setupMobileNavigation();
        }
        
        console.log('✅ Mobile enhancements initialized');
    }
    
    /**
     * Detect if device is mobile
     */
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Check for mobile user agents
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileRegex.test(userAgent);
        
        // Check for small screen size
        const isSmallScreen = window.innerWidth <= 768;
        
        // Check for touch capability
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        return isMobileUA || (isSmallScreen && hasTouch);
    }
    
    /**
     * Detect touch capability
     */
    detectTouch() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               navigator.msMaxTouchPoints > 0;
    }
    
    /**
     * Get current orientation
     */
    getOrientation() {
        if (screen.orientation) {
            return screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape';
        }
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }
    
    /**
     * Setup mobile-specific optimizations
     */
    setupMobileOptimizations() {
        // Add mobile class to body
        document.body.classList.add('mobile-device');
        
        // Disable zoom on form inputs
        this.disableInputZoom();
        
        // Setup pull-to-refresh prevention
        this.preventPullToRefresh();
        
        // Setup mobile-friendly scrolling
        this.setupMobileScrolling();
        
        // Optimize tab switching for mobile
        this.optimizeTabSwitching();
    }
    
    /**
     * Setup touch-specific enhancements
     */
    setupTouchEnhancements() {
        if (!this.isTouch) return;
        
        document.body.classList.add('touch-device');
        
        // Add touch feedback to interactive elements
        this.addTouchFeedback();
        
        // Setup swipe gestures
        this.setupSwipeGestures();
        
        // Improve touch scrolling
        this.improveTouchScrolling();
    }
    
    /**
     * Disable zoom on form inputs (prevents iOS zoom)
     */
    disableInputZoom() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    viewport.setAttribute('content', 
                        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
                    );
                }
            });
            
            input.addEventListener('blur', () => {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    viewport.setAttribute('content', 
                        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
                    );
                }
            });
        });
    }
    
    /**
     * Prevent pull-to-refresh on mobile browsers
     */
    preventPullToRefresh() {
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            
            // Prevent pull-to-refresh when at top of page and pulling down
            if (scrollTop === 0 && currentY > startY) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    /**
     * Setup mobile-friendly scrolling
     */
    setupMobileScrolling() {
        // Add momentum scrolling for iOS
        const scrollableElements = document.querySelectorAll('.players-container, sl-tab-panel, .draft-board-container');
        scrollableElements.forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overflowScrolling = 'touch';
        });
        
        // Prevent body scroll when scrolling in containers
        this.preventBodyScroll();
    }
    
    /**
     * Prevent body scroll when scrolling in containers
     */
    preventBodyScroll() {
        const scrollableContainers = document.querySelectorAll('.players-container, sl-tab-panel');
        
        scrollableContainers.forEach(container => {
            let startY = 0;
            
            container.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
            }, { passive: true });
            
            container.addEventListener('touchmove', (e) => {
                const currentY = e.touches[0].clientY;
                const scrollTop = container.scrollTop;
                const scrollHeight = container.scrollHeight;
                const clientHeight = container.clientHeight;
                
                const isAtTop = scrollTop === 0;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight;
                const isScrollingUp = currentY > startY;
                const isScrollingDown = currentY < startY;
                
                // Prevent body scroll when at container boundaries
                if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
                    e.preventDefault();
                }
            }, { passive: false });
        });
    }
    
    /**
     * Add touch feedback to interactive elements
     */
    addTouchFeedback() {
        const interactiveElements = document.querySelectorAll('.player-card, .team-card, .ranking-item');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.classList.add('touch-active');
            }, { passive: true });
            
            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.classList.remove('touch-active');
                }, 150);
            }, { passive: true });
            
            element.addEventListener('touchcancel', () => {
                element.classList.remove('touch-active');
            }, { passive: true });
        });
    }
    
    /**
     * Setup swipe gestures for tab navigation
     */
    setupSwipeGestures() {
        const tabGroup = document.querySelector('sl-tab-group');
        if (!tabGroup) return;
        
        let startX = 0;
        let startY = 0;
        let isSwipeGesture = false;
        
        tabGroup.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwipeGesture = false;
        }, { passive: true });
        
        tabGroup.addEventListener('touchmove', (e) => {
            if (!isSwipeGesture) {
                const deltaX = Math.abs(e.touches[0].clientX - startX);
                const deltaY = Math.abs(e.touches[0].clientY - startY);
                
                // Determine if this is a horizontal swipe
                if (deltaX > deltaY && deltaX > 30) {
                    isSwipeGesture = true;
                }
            }
        }, { passive: true });
        
        tabGroup.addEventListener('touchend', (e) => {
            if (isSwipeGesture) {
                const endX = e.changedTouches[0].clientX;
                const deltaX = endX - startX;
                
                if (Math.abs(deltaX) > 50) {
                    this.handleTabSwipe(deltaX > 0 ? 'right' : 'left');
                }
            }
        }, { passive: true });
    }
    
    /**
     * Handle tab swipe navigation
     */
    handleTabSwipe(direction) {
        const tabGroup = document.querySelector('sl-tab-group');
        if (!tabGroup) return;
        
        const tabs = Array.from(tabGroup.querySelectorAll('sl-tab'));
        const activeTab = tabGroup.querySelector('sl-tab[active]');
        const currentIndex = tabs.indexOf(activeTab);
        
        let newIndex;
        if (direction === 'left' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (direction === 'right' && currentIndex < tabs.length - 1) {
            newIndex = currentIndex + 1;
        }
        
        if (newIndex !== undefined) {
            tabs[newIndex].click();
        }
    }
    
    /**
     * Improve touch scrolling performance
     */
    improveTouchScrolling() {
        // Add CSS for better touch scrolling
        const style = document.createElement('style');
        style.textContent = `
            .touch-device .players-container,
            .touch-device sl-tab-panel,
            .touch-device .draft-board-container {
                -webkit-overflow-scrolling: touch;
                overflow-scrolling: touch;
                scroll-behavior: smooth;
            }
            
            .touch-active {
                opacity: 0.8;
                transform: scale(0.98);
                transition: opacity 0.1s ease, transform 0.1s ease;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Setup viewport handling for mobile
     */
    setupViewportHandling() {
        // Handle viewport height changes (keyboard, orientation)
        this.handleViewportChanges();
        
        // Setup safe area handling for notched devices
        this.setupSafeAreaHandling();
    }
    
    /**
     * Handle viewport height changes
     */
    handleViewportChanges() {
        let timeout;
        
        const updateViewportHeight = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
                
                // Update container heights
                this.updateContainerHeights();
            }, 100);
        };
        
        window.addEventListener('resize', updateViewportHeight);
        window.addEventListener('orientationchange', updateViewportHeight);
        
        // Initial setup
        updateViewportHeight();
    }
    
    /**
     * Update container heights for mobile
     */
    updateContainerHeights() {
        const draftContainer = document.querySelector('.draft-container');
        if (draftContainer && this.isMobile) {
            const headerHeight = document.querySelector('.app-header')?.offsetHeight || 0;
            const controlsHeight = document.querySelector('.draft-controls')?.offsetHeight || 0;
            const availableHeight = window.innerHeight - headerHeight - controlsHeight;
            
            if (this.orientation === 'portrait') {
                draftContainer.style.height = `${availableHeight}px`;
            }
        }
    }
    
    /**
     * Setup safe area handling for notched devices
     */
    setupSafeAreaHandling() {
        const style = document.createElement('style');
        style.textContent = `
            @supports (padding: max(0px)) {
                .app-header {
                    padding-left: max(1rem, env(safe-area-inset-left));
                    padding-right: max(1rem, env(safe-area-inset-right));
                    padding-top: max(0.75rem, env(safe-area-inset-top));
                }
                
                .app-footer {
                    padding-left: max(1rem, env(safe-area-inset-left));
                    padding-right: max(1rem, env(safe-area-inset-right));
                    padding-bottom: max(1rem, env(safe-area-inset-bottom));
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Setup orientation change handling
     */
    setupOrientationHandling() {
        const handleOrientationChange = () => {
            setTimeout(() => {
                this.orientation = this.getOrientation();
                console.log(`📱 Orientation changed to: ${this.orientation}`);
                
                // Update layout for new orientation
                this.updateLayoutForOrientation();
                
                // Trigger resize event for other components
                window.dispatchEvent(new Event('resize'));
            }, 100);
        };
        
        window.addEventListener('orientationchange', handleOrientationChange);
        screen.orientation?.addEventListener('change', handleOrientationChange);
    }
    
    /**
     * Update layout for current orientation
     */
    updateLayoutForOrientation() {
        document.body.classList.remove('portrait', 'landscape');
        document.body.classList.add(this.orientation);
        
        // Adjust tab panel heights
        const tabPanels = document.querySelectorAll('sl-tab-panel');
        tabPanels.forEach(panel => {
            if (this.orientation === 'landscape' && this.isMobile) {
                panel.style.maxHeight = 'calc(100vh - 120px)';
            } else {
                panel.style.maxHeight = 'calc(100vh - 300px)';
            }
        });
    }
    
    /**
     * Optimize tab switching for mobile
     */
    optimizeTabSwitching() {
        const tabGroup = document.querySelector('sl-tab-group');
        if (!tabGroup) return;
        
        // Add loading states for tab switches
        tabGroup.addEventListener('sl-tab-show', (e) => {
            const tabPanel = document.querySelector(`sl-tab-panel[name="${e.detail.name}"]`);
            if (tabPanel) {
                // Add a small delay to show loading state
                tabPanel.style.opacity = '0.7';
                setTimeout(() => {
                    tabPanel.style.opacity = '1';
                }, 100);
            }
        });
    }
    
    /**
     * Setup mobile navigation enhancements
     */
    setupMobileNavigation() {
        // Add back button handling for mobile browsers
        this.setupBackButtonHandling();
        
        // Setup mobile-friendly focus management
        this.setupMobileFocusManagement();
    }
    
    /**
     * Setup back button handling
     */
    setupBackButtonHandling() {
        window.addEventListener('popstate', (e) => {
            // Handle back button navigation
            if (this.isMobile) {
                // Close any open modals or drawers
                const openModals = document.querySelectorAll('sl-dialog[open], sl-drawer[open]');
                if (openModals.length > 0) {
                    openModals.forEach(modal => modal.hide());
                    history.pushState(null, '', window.location.href);
                }
            }
        });
    }
    
    /**
     * Setup mobile-friendly focus management
     */
    setupMobileFocusManagement() {
        // Prevent focus on touch devices to avoid unwanted keyboard
        if (this.isTouch) {
            document.addEventListener('touchstart', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('sl-button')) {
                    e.target.blur();
                }
            });
        }
    }
    
    /**
     * Get mobile device info
     */
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isTouch: this.isTouch,
            orientation: this.orientation,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            userAgent: navigator.userAgent
        };
    }
    
    /**
     * Show mobile-optimized notification
     */
    showMobileNotification(message, variant = 'neutral', duration = 3000) {
        if (this.uiUtils && this.uiUtils.showNotification) {
            this.uiUtils.showNotification(message, variant, duration);
        } else {
            // Fallback for mobile
            const notification = document.createElement('div');
            notification.className = `mobile-notification mobile-notification-${variant}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--sl-color-${variant}-600);
                color: white;
                padding: 1rem;
                border-radius: 8px;
                z-index: 10000;
                max-width: calc(100vw - 2rem);
                text-align: center;
                font-size: 0.875rem;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, duration);
        }
    }
}
