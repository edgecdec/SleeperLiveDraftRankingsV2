/**
 * UI Utilities Module
 * 
 * Handles UI-related functionality like notifications, loading states, etc.
 */

class UIUtils {
    constructor() {
        this.elements = {
            statusIndicator: document.getElementById('status-indicator'),
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            loadingProgress: document.getElementById('loading-progress'),
            notificationContainer: document.getElementById('notification-container')
        };
    }

    /**
     * Show a section and hide others
     */
    showSection(sectionName) {
        const sections = ['welcome', 'user-setup', 'league-select', 'draft'];
        
        sections.forEach(section => {
            const element = document.getElementById(`${section}-section`);
            if (element) {
                element.style.display = section === sectionName ? 'block' : 'none';
            }
        });
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
        const indicator = this.elements.statusIndicator;
        if (!indicator) return;
        
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
     * Show loading overlay
     */
    showLoading(message = 'Loading...', showProgress = false) {
        const overlay = this.elements.loadingOverlay;
        const text = this.elements.loadingText;
        const progress = this.elements.loadingProgress;
        
        if (overlay) overlay.style.display = 'flex';
        if (text) text.textContent = message;
        if (progress) {
            progress.style.display = showProgress ? 'block' : 'none';
            if (showProgress) progress.indeterminate = true;
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = this.elements.loadingOverlay;
        if (overlay) overlay.style.display = 'none';
    }

    /**
     * Show/hide loading state for a section
     */
    showLoadingState(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'flex' : 'none';
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
     * Create a player card HTML
     */
    createPlayerCard(player) {
        const positionClass = `position-${player.position?.toLowerCase() || 'unknown'}`;
        
        return `
            <sl-card class="player-card" data-player-id="${player.player_id || ''}">
                <div slot="header" class="player-header">
                    <strong>${player.name || 'Unknown Player'}</strong>
                    <sl-badge variant="neutral" class="${positionClass}">
                        ${player.position || 'N/A'}
                    </sl-badge>
                    <sl-badge variant="neutral">${player.team || 'N/A'}</sl-badge>
                </div>
                
                <div class="player-stats">
                    <div class="stat-item">
                        <span class="stat-label">Rank</span>
                        <span class="stat-value">${player.rank || 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tier</span>
                        <span class="stat-value">${player.tier || 'N/A'}</span>
                    </div>
                    ${player.bye_week ? `
                        <div class="stat-item">
                            <span class="stat-label">Bye</span>
                            <span class="stat-value">${player.bye_week}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div slot="footer">
                    <sl-button-group>
                        <sl-button variant="primary" size="small">
                            <sl-icon slot="prefix" name="plus"></sl-icon>
                            Queue
                        </sl-button>
                        <sl-button variant="neutral" size="small">
                            <sl-icon slot="prefix" name="info-circle"></sl-icon>
                            Details
                        </sl-button>
                    </sl-button-group>
                </div>
            </sl-card>
        `;
    }
}

// Export for use in other modules
window.UIUtils = UIUtils;
