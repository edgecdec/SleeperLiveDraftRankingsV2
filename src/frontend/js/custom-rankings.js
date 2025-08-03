/**
 * Custom Rankings Module for Fantasy Football Draft Assistant V2
 * 
 * Handles custom rankings file upload, validation, and management
 * Part of Sprint 4: User Experience implementation
 */

class CustomRankings {
    constructor(apiService, uiUtils) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        this.selectedFile = null;
        this.validationResults = null;
    }
    
    /**
     * Initialize custom rankings functionality
     */
    init() {
        console.log('📁 Initializing custom rankings module...');
        
        // Get DOM elements
        this.fileInput = document.getElementById('rankings-file-input');
        this.selectFileBtn = document.getElementById('select-file-btn');
        this.selectedFileName = document.getElementById('selected-file-name');
        this.formatSelect = document.getElementById('format-select');
        this.validateBtn = document.getElementById('validate-btn');
        this.uploadBtn = document.getElementById('upload-btn');
        this.validationResults = document.getElementById('validation-results');
        this.rankingsList = document.getElementById('rankings-list');
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Custom rankings module initialized');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // File selection
        if (this.selectFileBtn && this.fileInput) {
            this.selectFileBtn.addEventListener('click', () => {
                this.fileInput.click();
            });
            
            this.fileInput.addEventListener('change', (event) => {
                this.handleFileSelection(event);
            });
        }
        
        // Validation button
        if (this.validateBtn) {
            this.validateBtn.addEventListener('click', () => {
                this.validateFile();
            });
        }
        
        // Upload button
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', () => {
                this.uploadFile();
            });
        }
    }
    
    /**
     * Handle file selection
     */
    handleFileSelection(event) {
        const file = event.target.files[0];
        
        if (!file) {
            this.resetFileSelection();
            return;
        }
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.uiUtils.showNotification('Please select a CSV file', 'warning');
            this.resetFileSelection();
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.uiUtils.showNotification('File size must be less than 5MB', 'warning');
            this.resetFileSelection();
            return;
        }
        
        this.selectedFile = file;
        this.selectedFileName.textContent = file.name;
        
        // Enable validation button
        if (this.validateBtn) {
            this.validateBtn.disabled = false;
        }
        
        // Clear previous validation results
        this.clearValidationResults();
        
        console.log(`📁 File selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
    
    /**
     * Reset file selection
     */
    resetFileSelection() {
        this.selectedFile = null;
        this.selectedFileName.textContent = '';
        this.fileInput.value = '';
        
        if (this.validateBtn) {
            this.validateBtn.disabled = true;
        }
        
        if (this.uploadBtn) {
            this.uploadBtn.disabled = true;
        }
        
        this.clearValidationResults();
    }
    
    /**
     * Validate selected file
     */
    async validateFile() {
        if (!this.selectedFile) {
            this.uiUtils.showNotification('Please select a file first', 'warning');
            return;
        }
        
        try {
            // Show loading state
            this.validateBtn.loading = true;
            this.clearValidationResults();
            
            // Create form data
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('format', this.formatSelect.value);
            
            // Make validation request
            const response = await fetch('/api/custom-rankings/validate', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.valid) {
                this.showValidationSuccess(result.preview);
                this.uploadBtn.disabled = false;
                this.uiUtils.showNotification('File validation successful!', 'success');
            } else {
                this.showValidationError(result);
                this.uploadBtn.disabled = true;
                this.uiUtils.showNotification('File validation failed', 'danger');
            }
            
        } catch (error) {
            console.error('❌ Validation error:', error);
            this.showValidationError({ error: 'Validation request failed: ' + error.message });
            this.uiUtils.showNotification('Validation failed: ' + error.message, 'danger');
        } finally {
            this.validateBtn.loading = false;
        }
    }
    
    /**
     * Upload validated file
     */
    async uploadFile() {
        if (!this.selectedFile) {
            this.uiUtils.showNotification('Please select a file first', 'warning');
            return;
        }
        
        try {
            // Show loading state
            this.uploadBtn.loading = true;
            
            // Create form data
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('format', this.formatSelect.value);
            formData.append('user_id', 'default'); // TODO: Use actual user ID
            
            // Make upload request
            const response = await fetch('/api/custom-rankings/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                this.uiUtils.showNotification(result.message, 'success');
                this.resetFileSelection();
                this.loadUserRankings(); // Refresh the rankings list
            } else {
                this.uiUtils.showNotification('Upload failed: ' + result.error, 'danger');
            }
            
        } catch (error) {
            console.error('❌ Upload error:', error);
            this.uiUtils.showNotification('Upload failed: ' + error.message, 'danger');
        } finally {
            this.uploadBtn.loading = false;
        }
    }
    
    /**
     * Show validation success results
     */
    showValidationSuccess(preview) {
        const html = `
            <div class="validation-success">
                <h5>✅ Validation Successful</h5>
                
                <div class="validation-preview">
                    <div class="preview-stat">
                        <div class="preview-stat-value">${preview.detected_format}</div>
                        <div class="preview-stat-label">Format Detected</div>
                    </div>
                    <div class="preview-stat">
                        <div class="preview-stat-value">${preview.total_players}</div>
                        <div class="preview-stat-label">Valid Players</div>
                    </div>
                    <div class="preview-stat">
                        <div class="preview-stat-value">${preview.total_columns}</div>
                        <div class="preview-stat-label">Columns</div>
                    </div>
                    <div class="preview-stat">
                        <div class="preview-stat-value">${Object.keys(preview.position_counts).length}</div>
                        <div class="preview-stat-label">Positions</div>
                    </div>
                </div>
                
                ${this.renderPositionCounts(preview.position_counts)}
                ${this.renderSamplePlayers(preview.sample_players)}
                ${preview.errors && preview.errors.length > 0 ? this.renderErrors(preview.errors) : ''}
            </div>
        `;
        
        this.validationResults.innerHTML = html;
        this.validationResults.style.display = 'block';
    }
    
    /**
     * Show validation error results
     */
    showValidationError(result) {
        const html = `
            <div class="validation-error">
                <h5>❌ Validation Failed</h5>
                <p><strong>Error:</strong> ${result.error}</p>
                
                ${result.errors && result.errors.length > 0 ? this.renderErrors(result.errors) : ''}
                
                ${result.required_columns ? `
                    <div class="error-details">
                        <h6>Required Columns:</h6>
                        <p>${result.required_columns.join(', ')}</p>
                    </div>
                ` : ''}
                
                ${result.found_columns ? `
                    <div class="error-details">
                        <h6>Found Columns:</h6>
                        <p>${result.found_columns.join(', ')}</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.validationResults.innerHTML = html;
        this.validationResults.style.display = 'block';
    }
    
    /**
     * Render position counts
     */
    renderPositionCounts(positionCounts) {
        const positions = Object.entries(positionCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([pos, count]) => `<sl-badge variant="neutral">${pos}: ${count}</sl-badge>`)
            .join(' ');
        
        return `
            <div class="position-counts">
                <h6>Position Breakdown:</h6>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${positions}
                </div>
            </div>
        `;
    }
    
    /**
     * Render sample players
     */
    renderSamplePlayers(samplePlayers) {
        if (!samplePlayers || samplePlayers.length === 0) {
            return '';
        }
        
        const playersHtml = samplePlayers.map(player => `
            <div class="sample-player">
                <span class="sample-player-name">${player.name}</span>
                <div class="sample-player-details">
                    <sl-badge variant="neutral">${player.position}</sl-badge>
                    ${player.rank ? `<sl-badge variant="primary">Rank ${player.rank}</sl-badge>` : ''}
                    ${player.tier ? `<sl-badge variant="success">Tier ${player.tier}</sl-badge>` : ''}
                </div>
            </div>
        `).join('');
        
        return `
            <div class="sample-players">
                <h6>Sample Players:</h6>
                ${playersHtml}
            </div>
        `;
    }
    
    /**
     * Render errors
     */
    renderErrors(errors) {
        const errorsHtml = errors.map(error => `<li>${error}</li>`).join('');
        
        return `
            <div class="error-list">
                <h6>Issues Found:</h6>
                <ul>${errorsHtml}</ul>
            </div>
        `;
    }
    
    /**
     * Clear validation results
     */
    clearValidationResults() {
        if (this.validationResults) {
            this.validationResults.style.display = 'none';
            this.validationResults.innerHTML = '';
        }
    }
    
    /**
     * Load user rankings when tab is opened
     */
    async loadUserRankings() {
        if (!this.rankingsList) return;
        
        try {
            // Show loading state
            this.rankingsList.innerHTML = `
                <div class="loading-state">
                    <sl-spinner></sl-spinner>
                    <p>Loading your rankings...</p>
                </div>
            `;
            
            // Fetch user rankings
            const response = await fetch('/api/custom-rankings/list?user_id=default');
            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                this.renderRankingsList(result.rankings);
            } else {
                throw new Error(result.error || 'Failed to load rankings');
            }
            
        } catch (error) {
            console.error('❌ Error loading rankings:', error);
            this.rankingsList.innerHTML = `
                <div class="error-state">
                    <sl-icon name="exclamation-triangle" style="font-size: 2rem; color: var(--sl-color-danger-600);"></sl-icon>
                    <h4>Failed to Load Rankings</h4>
                    <p>${error.message}</p>
                    <sl-button variant="primary" onclick="customRankings.loadUserRankings()">
                        <sl-icon slot="prefix" name="arrow-clockwise"></sl-icon>
                        Try Again
                    </sl-button>
                </div>
            `;
        }
    }
    
    /**
     * Render rankings list
     */
    renderRankingsList(rankings) {
        if (!rankings || rankings.length === 0) {
            this.rankingsList.innerHTML = `
                <div class="empty-state">
                    <sl-icon name="file-earmark-text" style="font-size: 3rem; color: var(--sl-color-neutral-400);"></sl-icon>
                    <h4>No Custom Rankings</h4>
                    <p>Upload your first CSV rankings file to get started.</p>
                </div>
            `;
            return;
        }
        
        const rankingsHtml = rankings.map(ranking => this.renderRankingItem(ranking)).join('');
        
        this.rankingsList.innerHTML = `
            <div class="rankings-list">
                ${rankingsHtml}
            </div>
        `;
        
        // Add event listeners to action buttons
        this.setupRankingItemListeners();
    }
    
    /**
     * Render individual ranking item
     */
    renderRankingItem(ranking) {
        const uploadDate = new Date(ranking.upload_date).toLocaleDateString();
        const positionCounts = Object.entries(ranking.position_counts)
            .map(([pos, count]) => `${pos}: ${count}`)
            .join(', ');
        
        return `
            <div class="ranking-item" data-file-id="${ranking.file_id}">
                <div class="ranking-info">
                    <div class="ranking-filename">${ranking.filename}</div>
                    <div class="ranking-details">
                        <span class="ranking-detail">📅 ${uploadDate}</span>
                        <span class="ranking-detail">👥 ${ranking.total_players} players</span>
                        <span class="ranking-detail">📊 ${ranking.format_type}</span>
                        <span class="ranking-detail">🏈 ${positionCounts}</span>
                    </div>
                </div>
                <div class="ranking-actions">
                    <sl-button variant="neutral" size="small" class="view-btn">
                        <sl-icon slot="prefix" name="eye"></sl-icon>
                        View
                    </sl-button>
                    <sl-button variant="danger" size="small" class="delete-btn">
                        <sl-icon slot="prefix" name="trash"></sl-icon>
                        Delete
                    </sl-button>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners for ranking item actions
     */
    setupRankingItemListeners() {
        // View buttons
        document.querySelectorAll('.ranking-item .view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileId = e.target.closest('.ranking-item').dataset.fileId;
                this.viewRanking(fileId);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.ranking-item .delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileId = e.target.closest('.ranking-item').dataset.fileId;
                this.deleteRanking(fileId);
            });
        });
    }
    
    /**
     * View ranking details
     */
    async viewRanking(fileId) {
        try {
            const response = await fetch(`/api/custom-rankings/${fileId}?user_id=default&include_players=true`);
            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                this.showRankingDetails(result.data);
            } else {
                throw new Error(result.error || 'Failed to load ranking details');
            }
            
        } catch (error) {
            console.error('❌ Error viewing ranking:', error);
            this.uiUtils.showNotification('Failed to load ranking details: ' + error.message, 'danger');
        }
    }
    
    /**
     * Delete ranking
     */
    async deleteRanking(fileId) {
        const confirmed = confirm('Are you sure you want to delete this ranking file? This action cannot be undone.');
        
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/custom-rankings/${fileId}?user_id=default`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                this.uiUtils.showNotification('Ranking file deleted successfully', 'success');
                this.loadUserRankings(); // Refresh the list
            } else {
                throw new Error(result.error || 'Failed to delete ranking');
            }
            
        } catch (error) {
            console.error('❌ Error deleting ranking:', error);
            this.uiUtils.showNotification('Failed to delete ranking: ' + error.message, 'danger');
        }
    }
    
    /**
     * Show ranking details in a modal or expanded view
     */
    showRankingDetails(rankingData) {
        // For now, just show a summary
        // TODO: Implement a proper modal or detailed view
        const summary = `
            File: ${rankingData.original_filename}
            Format: ${rankingData.format_type}
            Players: ${rankingData.total_players}
            Upload Date: ${new Date(rankingData.upload_date).toLocaleString()}
        `;
        
        alert(summary);
    }
}
