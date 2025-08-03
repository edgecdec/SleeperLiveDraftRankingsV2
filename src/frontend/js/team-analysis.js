/**
 * Team Analysis Module for Fantasy Football Draft Assistant V2
 * 
 * Handles team roster analysis and position recommendations
 * Part of Sprint 3: Enhanced Analytics implementation
 */

class TeamAnalysis {
    constructor(apiService, uiUtils) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        this.currentAnalysis = null;
        this.refreshButton = null;
    }
    
    /**
     * Initialize team analysis functionality
     */
    init() {
        console.log('🏈 Initializing team analysis module...');
        
        // Get refresh button
        this.refreshButton = document.getElementById('refresh-analysis-btn');
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => {
                this.refreshAnalysis();
            });
        }
        
        console.log('✅ Team analysis module initialized');
    }
    
    /**
     * Load team analysis for a draft
     */
    async loadTeamAnalysis(draftId) {
        if (!draftId) {
            console.error('❌ No draft ID provided for team analysis');
            return;
        }
        
        console.log(`🏈 Loading team analysis for draft ${draftId}...`);
        
        try {
            this.showLoadingState();
            
            // Fetch team analysis from API
            const response = await fetch(`/api/draft/${draftId}/team-analysis`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.currentAnalysis = data.team_analysis;
                this.renderTeamAnalysis(data.team_analysis);
                console.log('✅ Team analysis loaded successfully');
            } else {
                throw new Error(data.error || 'Unknown error loading team analysis');
            }
            
        } catch (error) {
            console.error('❌ Error loading team analysis:', error);
            this.showErrorState(error.message);
        }
    }
    
    /**
     * Refresh team analysis
     */
    async refreshAnalysis() {
        if (!this.currentDraftId) {
            this.uiUtils.showNotification('No draft selected for analysis refresh', 'warning');
            return;
        }
        
        if (this.refreshButton) {
            this.refreshButton.loading = true;
        }
        
        try {
            await this.loadTeamAnalysis(this.currentDraftId);
            this.uiUtils.showNotification('Team analysis refreshed successfully', 'success');
        } catch (error) {
            this.uiUtils.showNotification('Failed to refresh team analysis: ' + error.message, 'danger');
        } finally {
            if (this.refreshButton) {
                this.refreshButton.loading = false;
            }
        }
    }
    
    /**
     * Set current draft ID
     */
    setDraftId(draftId) {
        this.currentDraftId = draftId;
    }
    
    /**
     * Show loading state
     */
    showLoadingState() {
        const container = document.getElementById('team-analysis-content');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <sl-spinner></sl-spinner>
                    <p>Loading team analysis...</p>
                </div>
            `;
        }
    }
    
    /**
     * Show error state
     */
    showErrorState(errorMessage) {
        const container = document.getElementById('team-analysis-content');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <sl-icon name="exclamation-triangle" style="font-size: 2rem; color: var(--sl-color-danger-600);"></sl-icon>
                    <h3>Failed to Load Team Analysis</h3>
                    <p>${errorMessage}</p>
                    <sl-button variant="primary" onclick="teamAnalysis.refreshAnalysis()">
                        <sl-icon slot="prefix" name="arrow-clockwise"></sl-icon>
                        Try Again
                    </sl-button>
                </div>
            `;
        }
    }
    
    /**
     * Render team analysis data
     */
    renderTeamAnalysis(analysis) {
        const container = document.getElementById('team-analysis-content');
        if (!container) return;
        
        const teamRosters = analysis.team_rosters || {};
        const summary = analysis.analysis_summary || {};
        
        let html = '';
        
        // Render team cards
        if (Object.keys(teamRosters).length > 0) {
            html += '<div class="team-grid">';
            
            // Sort teams by strength score (highest first)
            const sortedTeams = Object.entries(teamRosters).sort((a, b) => {
                return (b[1].strength_score || 0) - (a[1].strength_score || 0);
            });
            
            for (const [teamIndex, roster] of sortedTeams) {
                html += this.renderTeamCard(parseInt(teamIndex), roster);
            }
            
            html += '</div>';
        }
        
        // Render analysis summary
        if (summary && Object.keys(summary).length > 0) {
            html += this.renderAnalysisSummary(summary);
        }
        
        container.innerHTML = html;
    }
    
    /**
     * Render individual team card
     */
    renderTeamCard(teamIndex, roster) {
        const strengthScore = roster.strength_score || 0;
        const strengthClass = this.getStrengthClass(strengthScore);
        const positionCounts = roster.position_counts || {};
        const needs = roster.needs || {};
        const strategy = roster.draft_strategy || 'Unknown';
        
        return `
            <div class="team-card">
                <div class="team-header">
                    <div class="team-name">Team ${teamIndex + 1}</div>
                    <div class="team-strength">
                        <div class="strength-score ${strengthClass}">
                            ${strengthScore.toFixed(1)}
                        </div>
                    </div>
                </div>
                
                <div class="team-positions">
                    ${this.renderPositionCounts(positionCounts)}
                </div>
                
                <div class="team-needs">
                    ${this.renderTeamNeeds(needs)}
                </div>
                
                <div class="draft-strategy">
                    <div class="strategy-label">Draft Strategy</div>
                    <div class="strategy-value">${strategy}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render position counts for a team
     */
    renderPositionCounts(positionCounts) {
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
        
        return positions.map(pos => `
            <div class="position-count">
                <div class="position-label">${pos}</div>
                <div class="position-number">${positionCounts[pos] || 0}</div>
            </div>
        `).join('');
    }
    
    /**
     * Render team needs
     */
    renderTeamNeeds(needs) {
        let html = '';
        
        const needTypes = [
            { key: 'critical', label: 'Critical Needs', class: 'critical' },
            { key: 'important', label: 'Important Needs', class: 'important' },
            { key: 'depth', label: 'Depth Needs', class: 'depth' }
        ];
        
        for (const needType of needTypes) {
            const positions = needs[needType.key] || [];
            if (positions.length > 0) {
                html += `
                    <div class="needs-section">
                        <div class="needs-label">${needType.label}</div>
                        <div class="needs-list">
                            ${positions.map(pos => `
                                <span class="need-tag ${needType.class}">${pos}</span>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        return html || '<div class="needs-section"><div class="needs-label">No immediate needs</div></div>';
    }
    
    /**
     * Render analysis summary
     */
    renderAnalysisSummary(summary) {
        const avgStrength = summary.average_team_strength || 0;
        const totalPicks = summary.total_picks_made || 0;
        const strongestTeam = summary.strongest_team || {};
        const weakestTeam = summary.weakest_team || {};
        
        return `
            <div class="analysis-summary">
                <div class="summary-title">Draft Analysis Summary</div>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <div class="stat-value">${avgStrength.toFixed(1)}</div>
                        <div class="stat-label">Average Team Strength</div>
                    </div>
                    <div class="summary-stat">
                        <div class="stat-value">${totalPicks}</div>
                        <div class="stat-label">Total Picks Made</div>
                    </div>
                    <div class="summary-stat">
                        <div class="stat-value">Team ${(strongestTeam.team_index || 0) + 1}</div>
                        <div class="stat-label">Strongest Team (${(strongestTeam.strength_score || 0).toFixed(1)})</div>
                    </div>
                    <div class="summary-stat">
                        <div class="stat-value">Team ${(weakestTeam.team_index || 0) + 1}</div>
                        <div class="stat-label">Weakest Team (${(weakestTeam.strength_score || 0).toFixed(1)})</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get CSS class for strength score
     */
    getStrengthClass(score) {
        if (score >= 75) return 'strong';
        if (score >= 50) return 'adequate';
        return 'weak';
    }
    
    /**
     * Get team recommendations for a specific team
     */
    async getTeamRecommendations(draftId, teamIndex) {
        try {
            const response = await fetch(`/api/draft/${draftId}/team/${teamIndex}/recommendations`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return data.recommendations || [];
            } else {
                throw new Error(data.error || 'Unknown error getting recommendations');
            }
            
        } catch (error) {
            console.error(`❌ Error getting recommendations for team ${teamIndex}:`, error);
            return [];
        }
    }
}
