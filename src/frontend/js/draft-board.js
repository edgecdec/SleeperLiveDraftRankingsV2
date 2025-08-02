/**
 * Draft Board Module
 * 
 * Handles draft board display and turn indicators
 */

class DraftBoard {
    constructor(apiService, uiUtils) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
    }

    /**
     * Load and display draft board
     */
    async load(draftId) {
        if (!draftId) return;
        
        const container = document.getElementById('draft-board-content');
        if (!container) return;
        
        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-state">
                    <sl-spinner style="font-size: 3rem;"></sl-spinner>
                    <p>Loading draft board...</p>
                </div>
            `;
            
            // Load draft board data
            const boardData = await this.apiService.getDraftBoard(draftId);
            this.display(boardData.draft_board);
            
        } catch (error) {
            console.error('Failed to load draft board:', error);
            container.innerHTML = `
                <sl-alert variant="danger" open>
                    <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
                    Failed to load draft board: ${error.message}
                </sl-alert>
            `;
        }
    }

    /**
     * Display draft board with Shoelace components
     */
    display(draftBoard) {
        const container = document.getElementById('draft-board-content');
        if (!container) return;
        
        const { teams, rounds, total_teams, draft_type, picks_made, total_picks, current_pick_info } = draftBoard;
        
        // Create turn indicator
        const turnIndicatorHtml = this.createTurnIndicator(current_pick_info);
        
        // Create draft board header
        const headerHtml = `
            <div class="draft-board-header">
                ${turnIndicatorHtml}
                <sl-card class="board-info-card">
                    <div slot="header">
                        <h3>Draft Board</h3>
                        <div class="board-stats">
                            <sl-badge variant="primary">${picks_made}/${total_picks} picks</sl-badge>
                            <sl-badge variant="neutral">${draft_type} draft</sl-badge>
                            <sl-badge variant="neutral">${total_teams} teams</sl-badge>
                        </div>
                    </div>
                </sl-card>
            </div>
        `;
        
        // Create round headers
        const roundHeaders = Array.from({length: rounds}, (_, i) => 
            `<div class="round-header">R${i + 1}</div>`
        ).join('');
        
        // Create team rows
        const teamRows = teams.map((team, teamIndex) => {
            const isCurrentDrafter = current_pick_info && 
                                   !current_pick_info.draft_complete && 
                                   team.team_name === current_pick_info.current_drafter_name;
            
            const teamHeaderClass = isCurrentDrafter ? 'team-header current-drafter' : 'team-header';
            
            const teamHeader = `
                <div class="${teamHeaderClass}">
                    <strong>${team.team_name}</strong>
                    ${isCurrentDrafter ? '<sl-icon name="clock" class="current-pick-icon"></sl-icon>' : ''}
                </div>
            `;
            
            const teamPicks = team.picks.map(pick => {
                if (pick.player) {
                    const positionClass = `position-${pick.player.position.toLowerCase()}`;
                    return `
                        <sl-card class="pick-card filled-pick">
                            <div class="pick-content">
                                <div class="pick-number">${pick.pick_number}</div>
                                <div class="player-info">
                                    <div class="player-name">${pick.player.name}</div>
                                    <div class="player-details">
                                        <sl-badge variant="neutral" class="${positionClass}">
                                            ${pick.player.position}
                                        </sl-badge>
                                        <span class="player-team">${pick.player.team}</span>
                                    </div>
                                </div>
                            </div>
                        </sl-card>
                    `;
                } else {
                    const isNextPick = current_pick_info && 
                                     !current_pick_info.draft_complete && 
                                     pick.round === current_pick_info.current_round &&
                                     isCurrentDrafter;
                    
                    const pickClass = isNextPick ? 'pick-card empty-pick next-pick' : 'pick-card empty-pick';
                    
                    return `
                        <sl-card class="${pickClass}">
                            <div class="pick-content">
                                <div class="pick-placeholder">
                                    ${isNextPick ? 
                                        '<sl-icon name="arrow-right-circle" class="next-pick-icon"></sl-icon>' : 
                                        '<sl-icon name="clock"></sl-icon>'
                                    }
                                    <span>Round ${pick.round}</span>
                                </div>
                            </div>
                        </sl-card>
                    `;
                }
            }).join('');
            
            return `
                <div class="team-row ${isCurrentDrafter ? 'current-drafter-row' : ''}">
                    ${teamHeader}
                    <div class="team-picks">
                        ${teamPicks}
                    </div>
                </div>
            `;
        }).join('');
        
        // Combine everything
        const boardHtml = `
            ${headerHtml}
            <div class="draft-board-grid">
                <div class="board-headers">
                    <div class="team-column-header">Teams</div>
                    <div class="rounds-headers">
                        ${roundHeaders}
                    </div>
                </div>
                <div class="board-content">
                    ${teamRows}
                </div>
            </div>
        `;
        
        container.innerHTML = boardHtml;
    }

    /**
     * Create turn indicator component
     */
    createTurnIndicator(currentPickInfo) {
        if (!currentPickInfo) {
            return `
                <sl-card class="turn-indicator-card">
                    <div class="turn-indicator">
                        <sl-icon name="info-circle"></sl-icon>
                        <span>Draft information loading...</span>
                    </div>
                </sl-card>
            `;
        }
        
        if (currentPickInfo.draft_complete) {
            return `
                <sl-card class="turn-indicator-card draft-complete">
                    <div class="turn-indicator">
                        <sl-icon name="check-circle"></sl-icon>
                        <div class="turn-info">
                            <strong>Draft Complete!</strong>
                            <span>All ${currentPickInfo.current_pick - 1} picks have been made</span>
                        </div>
                    </div>
                </sl-card>
            `;
        }
        
        return `
            <sl-card class="turn-indicator-card active-pick">
                <div class="turn-indicator">
                    <sl-icon name="clock" class="pulsing-icon"></sl-icon>
                    <div class="turn-info">
                        <strong>Pick ${currentPickInfo.current_pick} - Round ${currentPickInfo.current_round}</strong>
                        <span>${currentPickInfo.current_drafter_name || 'Unknown Team'} is on the clock</span>
                        <div class="pick-stats">
                            <sl-badge variant="primary">${currentPickInfo.picks_remaining} picks remaining</sl-badge>
                        </div>
                    </div>
                </div>
            </sl-card>
        `;
    }
}

// Export for use in other modules
window.DraftBoard = DraftBoard;
