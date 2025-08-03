/**
 * Queue Manager Module
 * 
 * Handles draft queue management with localStorage persistence
 */

class QueueManager {
    constructor(apiService, uiUtils) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        this.storageKey = 'draft_queue';
        this.queue = this.loadQueue();
    }

    /**
     * Load queue from localStorage
     */
    loadQueue() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load queue from localStorage:', error);
            return [];
        }
    }

    /**
     * Save queue to localStorage
     */
    saveQueue() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
            console.log('📋 Queue saved to localStorage:', this.queue.length, 'players');
        } catch (error) {
            console.error('Failed to save queue to localStorage:', error);
        }
    }

    /**
     * Add player to queue
     */
    addPlayer(player) {
        // Check if player is already in queue
        const existingIndex = this.queue.findIndex(p => p.player_id === player.player_id);
        
        if (existingIndex !== -1) {
            this.uiUtils.showNotification(`${player.name} is already in your queue`, 'warning');
            return false;
        }

        // Add player to queue
        const queuePlayer = {
            player_id: player.player_id,
            name: player.name,
            position: player.position,
            team: player.team,
            rank: player.rank,
            tier: player.tier,
            bye_week: player.bye_week,
            added_at: Date.now(),
            notes: ''
        };

        this.queue.push(queuePlayer);
        this.saveQueue();
        
        this.uiUtils.showNotification(`Added ${player.name} to your queue`, 'success');
        this.updateQueueDisplay();
        
        return true;
    }

    /**
     * Remove player from queue
     */
    removePlayer(playerId) {
        const index = this.queue.findIndex(p => p.player_id === playerId);
        
        if (index === -1) {
            return false;
        }

        const player = this.queue[index];
        this.queue.splice(index, 1);
        this.saveQueue();
        
        this.uiUtils.showNotification(`Removed ${player.name} from your queue`, 'neutral');
        this.updateQueueDisplay();
        
        return true;
    }

    /**
     * Reorder queue
     */
    reorderQueue(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.queue.length || 
            toIndex < 0 || toIndex >= this.queue.length) {
            return false;
        }

        // Move player from fromIndex to toIndex
        const player = this.queue.splice(fromIndex, 1)[0];
        this.queue.splice(toIndex, 0, player);
        
        this.saveQueue();
        this.updateQueueDisplay();
        
        return true;
    }

    /**
     * Clear entire queue
     */
    clearQueue() {
        this.queue = [];
        this.saveQueue();
        this.uiUtils.showNotification('Queue cleared', 'neutral');
        this.updateQueueDisplay();
    }

    /**
     * Get queue
     */
    getQueue() {
        return [...this.queue]; // Return copy
    }

    /**
     * Update player notes
     */
    updatePlayerNotes(playerId, notes) {
        const player = this.queue.find(p => p.player_id === playerId);
        if (player) {
            player.notes = notes;
            this.saveQueue();
            return true;
        }
        return false;
    }

    /**
     * Display queue in UI
     */
    updateQueueDisplay() {
        const container = document.getElementById('queue-content');
        if (!container) return;

        if (this.queue.length === 0) {
            container.innerHTML = this.createEmptyQueueHTML();
            return;
        }

        const queueHTML = this.createQueueHTML();
        container.innerHTML = queueHTML;
        
        // Add event listeners
        this.attachQueueEventListeners();
    }

    /**
     * Create empty queue HTML
     */
    createEmptyQueueHTML() {
        return `
            <div class="empty-queue">
                <sl-card class="empty-state-card">
                    <div class="empty-state">
                        <sl-icon name="bookmark" style="font-size: 4rem; color: #94a3b8; margin-bottom: 1rem;"></sl-icon>
                        <h3>Your Queue is Empty</h3>
                        <p>Add players to your draft queue to keep track of your targets.</p>
                        <div class="empty-state-actions">
                            <sl-button id="get-recommendations-btn" variant="primary">
                                <sl-icon slot="prefix" name="lightbulb"></sl-icon>
                                Get Recommendations
                            </sl-button>
                            <sl-button id="browse-players-btn" variant="neutral">
                                <sl-icon slot="prefix" name="search"></sl-icon>
                                Browse Players
                            </sl-button>
                        </div>
                    </div>
                </sl-card>
            </div>
        `;
    }

    /**
     * Create queue HTML
     */
    createQueueHTML() {
        const queueHeader = `
            <div class="queue-header">
                <sl-card class="queue-info-card">
                    <div slot="header">
                        <div class="queue-title">
                            <h3>My Draft Queue</h3>
                            <sl-badge variant="primary">${this.queue.length} players</sl-badge>
                        </div>
                        <div class="queue-actions">
                            <sl-button id="get-recommendations-btn" variant="neutral" size="small">
                                <sl-icon slot="prefix" name="lightbulb"></sl-icon>
                                Recommendations
                            </sl-button>
                            <sl-button id="clear-queue-btn" variant="danger" size="small">
                                <sl-icon slot="prefix" name="trash"></sl-icon>
                                Clear Queue
                            </sl-button>
                        </div>
                    </div>
                </sl-card>
            </div>
        `;

        const queueItems = this.queue.map((player, index) => {
            const positionClass = `position-${player.position?.toLowerCase() || 'unknown'}`;
            
            return `
                <sl-card class="queue-item" data-player-id="${player.player_id}" data-index="${index}">
                    <div class="queue-item-content">
                        <div class="queue-item-drag">
                            <sl-icon name="grip-vertical" class="drag-handle"></sl-icon>
                            <span class="queue-position">${index + 1}</span>
                        </div>
                        
                        <div class="queue-item-info">
                            <div class="queue-item-header">
                                <strong class="player-name">${player.name}</strong>
                                <div class="player-badges">
                                    <sl-badge variant="neutral" class="${positionClass}">
                                        ${player.position}
                                    </sl-badge>
                                    <sl-badge variant="neutral">${player.team}</sl-badge>
                                    ${player.tier ? `<sl-badge variant="primary">Tier ${player.tier}</sl-badge>` : ''}
                                </div>
                            </div>
                            
                            <div class="queue-item-stats">
                                <span class="stat">Rank: ${player.rank || 'N/A'}</span>
                                ${player.bye_week ? `<span class="stat">Bye: Week ${player.bye_week}</span>` : ''}
                            </div>
                            
                            ${player.notes ? `
                                <div class="queue-item-notes">
                                    <sl-icon name="sticky"></sl-icon>
                                    <span>${player.notes}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="queue-item-actions">
                            <sl-button variant="neutral" size="small" class="edit-notes-btn" data-player-id="${player.player_id}">
                                <sl-icon name="pencil"></sl-icon>
                            </sl-button>
                            <sl-button variant="danger" size="small" class="remove-from-queue-btn" data-player-id="${player.player_id}">
                                <sl-icon name="x"></sl-icon>
                            </sl-button>
                        </div>
                    </div>
                </sl-card>
            `;
        }).join('');

        return `
            ${queueHeader}
            <div class="queue-list" id="queue-list">
                ${queueItems}
            </div>
        `;
    }

    /**
     * Attach event listeners to queue elements
     */
    attachQueueEventListeners() {
        // Clear queue button
        const clearBtn = document.getElementById('clear-queue-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your entire queue?')) {
                    this.clearQueue();
                }
            });
        }

        // Get recommendations button
        const recommendationsBtn = document.getElementById('get-recommendations-btn');
        if (recommendationsBtn) {
            recommendationsBtn.addEventListener('click', () => {
                this.showRecommendations();
            });
        }

        // Browse players button (for empty state)
        const browseBtn = document.getElementById('browse-players-btn');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                // Switch to available players tab
                const tabGroup = document.querySelector('sl-tab-group');
                if (tabGroup) {
                    tabGroup.show('available-players');
                }
            });
        }

        // Remove from queue buttons
        document.querySelectorAll('.remove-from-queue-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const playerId = btn.dataset.playerId;
                this.removePlayer(playerId);
            });
        });

        // Edit notes buttons
        document.querySelectorAll('.edit-notes-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const playerId = btn.dataset.playerId;
                this.showEditNotesDialog(playerId);
            });
        });

        // TODO: Add drag and drop functionality
        this.initializeDragAndDrop();
    }

    /**
     * Initialize drag and drop for queue reordering
     */
    initializeDragAndDrop() {
        // This is a simplified drag and drop implementation
        // In a production app, you might want to use a library like Sortable.js
        
        const queueList = document.getElementById('queue-list');
        if (!queueList) return;

        let draggedElement = null;
        let draggedIndex = null;

        // Add drag event listeners to queue items
        queueList.querySelectorAll('.queue-item').forEach((item, index) => {
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                draggedElement = item;
                draggedIndex = index;
                item.style.opacity = '0.5';
            });

            item.addEventListener('dragend', (e) => {
                item.style.opacity = '1';
                draggedElement = null;
                draggedIndex = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                
                if (draggedElement && draggedElement !== item) {
                    const dropIndex = parseInt(item.dataset.index);
                    
                    if (draggedIndex !== null && draggedIndex !== dropIndex) {
                        this.reorderQueue(draggedIndex, dropIndex);
                    }
                }
            });
        });
    }

    /**
     * Show edit notes dialog
     */
    showEditNotesDialog(playerId) {
        const player = this.queue.find(p => p.player_id === playerId);
        if (!player) return;

        const notes = prompt(`Add notes for ${player.name}:`, player.notes || '');
        if (notes !== null) {
            this.updatePlayerNotes(playerId, notes);
            this.updateQueueDisplay();
        }
    }

    /**
     * Show recommendations
     */
    async showRecommendations() {
        // This would integrate with the recommendations API
        this.uiUtils.showNotification('Recommendations feature coming soon!', 'primary');
    }
}

// Export for use in other modules
window.QueueManager = QueueManager;
