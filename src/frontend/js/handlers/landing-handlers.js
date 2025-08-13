/**
 * Landing Handlers Module
 * 
 * Handles landing page interactions, user search, and league selection
 */
class LandingHandlers {
    constructor(apiService, uiUtils) {
        this.apiService = apiService;
        this.uiUtils = uiUtils;
        
        this.state = {
            currentUser: null,
            userLeagues: [],
            selectedSeason: '2025'
        };
    }

    /**
     * Initialize landing handlers
     */
    init() {
        this.setupTabNavigation();
        this.setupUserSearchForm();
        this.setupMockDraftForm();
        this.setupLegacyEventListeners();
        
        // Add global debug function
        window.debugMockDraft = () => {
            console.log('🔧 Debug: Manual mock draft setup trigger');
            this.setupMockDraftFormElements();
        };
        
        window.testMockDraft = (draftId = '123456789') => {
            console.log('🧪 Test: Manual mock draft connection');
            this.handleMockDraftConnect(draftId);
        };
    }

    /**
     * Setup tab navigation for landing page
     */
    setupTabNavigation() {
        const leaguesTab = document.getElementById('leagues-tab');
        const mockDraftTab = document.getElementById('mock-draft-tab');
        const leaguesContent = document.getElementById('leagues-tab-content');
        const mockDraftContent = document.getElementById('mock-tab-content');
        
        if (leaguesTab && mockDraftTab) {
            console.log('✅ Setting up landing page tab navigation');
            leaguesTab.addEventListener('click', () => {
                leaguesTab.classList.add('active');
                mockDraftTab.classList.remove('active');
                leaguesContent.style.display = 'block';
                mockDraftContent.style.display = 'none';
            });
            
            mockDraftTab.addEventListener('click', () => {
                mockDraftTab.classList.add('active');
                leaguesTab.classList.remove('active');
                mockDraftContent.style.display = 'block';
                leaguesContent.style.display = 'none';
                
                // Setup mock draft form when tab becomes visible
                setTimeout(() => {
                    console.log('🎭 Mock draft tab activated, setting up form...');
                    this.setupMockDraftFormElements();
                    
                    // Add a simple test button click
                    const testBtn = document.getElementById('join-mock-btn');
                    if (testBtn) {
                        console.log('🔧 Adding test click handler');
                        testBtn.onclick = () => {
                            console.log('🚨 TEST CLICK DETECTED!');
                            alert('Button clicked! Form is working.');
                        };
                    }
                }, 100);
            });
        }
    }

    /**
     * Setup user search form
     */
    setupUserSearchForm() {
        const form = document.getElementById('user-search-form');
        const usernameInput = document.getElementById('username-input');
        const seasonSelect = document.getElementById('season-select');
        const loadButton = document.getElementById('load-user-btn');
        
        console.log('🔍 Form elements found:', {
            form: !!form,
            usernameInput: !!usernameInput,
            seasonSelect: !!seasonSelect,
            loadButton: !!loadButton
        });
        
        if (form && usernameInput && seasonSelect && loadButton) {
            console.log('✅ Setting up user search form');
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = usernameInput.value.trim();
                const season = seasonSelect.value;
                
                if (username) {
                    await this.handleUserSearch(username, season);
                }
            });
            
            // Season change handler
            seasonSelect.addEventListener('sl-change', async (e) => {
                const username = usernameInput.value.trim();
                if (username) {
                    await this.handleUserSearch(username, e.target.value);
                }
            });
            
            console.log('✅ User search form setup complete');
        } else {
            console.log('⚠️ Some form elements not found:', {
                form: !!form,
                usernameInput: !!usernameInput,
                seasonSelect: !!seasonSelect,
                loadButton: !!loadButton
            });
        }
    }

    /**
     * Setup mock draft form
     */
    setupMockDraftForm() {
        // Initial setup attempt
        this.setupMockDraftFormElements();
    }
    
    setupMockDraftFormElements() {
        console.log('🔍 Setting up mock draft form elements...');
        
        const mockDraftInput = document.getElementById('mock-draft-id');
        const joinMockBtn = document.getElementById('join-mock-btn');
        const mockError = document.getElementById('mock-draft-error');
        
        console.log('🔍 Elements found:', {
            mockDraftInput: !!mockDraftInput,
            joinMockBtn: !!joinMockBtn,
            mockError: !!mockError,
            inputValue: mockDraftInput?.value,
            buttonText: joinMockBtn?.textContent
        });
        
        if (joinMockBtn) {
            console.log('✅ Adding click listener to join button');
            
            // Remove any existing listeners
            const newBtn = joinMockBtn.cloneNode(true);
            joinMockBtn.parentNode.replaceChild(newBtn, joinMockBtn);
            
            // Add simple onclick first
            newBtn.onclick = (e) => {
                console.log('🚨 ONCLICK FIRED!');
                e.preventDefault();
                const draftId = mockDraftInput?.value?.trim();
                console.log('📝 Draft ID:', draftId);
                
                if (draftId && draftId.length >= 10) {
                    console.log('🚀 Navigating to:', `/sleeper/mock/${draftId}`);
                    window.location.href = `/sleeper/mock/${draftId}`;
                } else {
                    console.log('❌ Invalid draft ID');
                    alert('Please enter a valid draft ID (at least 10 characters)');
                }
            };
            
            console.log('✅ Button setup complete');
        } else {
            console.log('❌ Join button not found');
        }
        
        if (mockDraftInput) {
            mockDraftInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('⏎ Enter pressed in mock draft input');
                    e.preventDefault();
                    const draftId = mockDraftInput.value?.trim();
                    this.handleMockDraftJoin(draftId);
                }
            });
            
            // Add input validation
            mockDraftInput.addEventListener('sl-input', () => {
                this.validateMockDraftForm();
            });
        }
    }
    
    handleMockDraftJoin(draftId) {
        console.log('🎯 handleMockDraftJoin called with:', draftId);
        
        const mockLeagueSelect = document.getElementById('mock-league-select');
        const selectedLeagueId = mockLeagueSelect?.value;
        
        if (!draftId || draftId.length < 10) {
            console.log('❌ Invalid draft ID:', draftId);
            this.showMockError('Please enter a valid draft ID (at least 10 characters)');
            return;
        }
        
        if (!selectedLeagueId) {
            console.log('❌ No league selected');
            this.showMockError('Please select a league for team names and roster structure');
            return;
        }
        
        // Clear any previous errors
        this.hideMockError();
        
        // Get current user for URL construction
        const currentUser = this.state.currentUser || window.app?.state?.currentUser;
        if (!currentUser || !currentUser.username) {
            this.showMockError('User data not found. Please reload the page.');
            return;
        }
        
        console.log('🚀 Navigating to mock draft URL with league:', `/sleeper/user/${currentUser.username}/mock/${draftId}?league=${selectedLeagueId}`);
        
        // Navigate to mock draft URL with username and league parameter
        window.location.href = `/sleeper/user/${currentUser.username}/mock/${draftId}?league=${selectedLeagueId}`;
    }
    
    /**
     * Populate mock draft league selector
     */
    populateMockLeagueSelector(leagues) {
        const mockLeagueSelect = document.getElementById('mock-league-select');
        if (!mockLeagueSelect || !leagues || leagues.length === 0) {
            return;
        }
        
        console.log('🎭 Populating mock league selector with', leagues.length, 'leagues');
        
        // Clear existing options
        mockLeagueSelect.innerHTML = '';
        
        // Add leagues as options
        leagues.forEach(league => {
            const option = document.createElement('sl-option');
            option.value = league.league_id;
            option.textContent = `${league.name} (${league.total_rosters} teams)`;
            mockLeagueSelect.appendChild(option);
        });
        
        // Enable the selector
        mockLeagueSelect.disabled = false;
        
        // Add change listener for validation
        mockLeagueSelect.addEventListener('sl-change', () => {
            this.validateMockDraftForm();
        });
        
        // Enable mock draft button validation
        this.validateMockDraftForm();
        
        console.log('✅ Mock league selector populated');
    }
    
    /**
     * Validate mock draft form and enable/disable button
     */
    validateMockDraftForm() {
        const mockDraftInput = document.getElementById('mock-draft-id');
        const mockLeagueSelect = document.getElementById('mock-league-select');
        const joinMockBtn = document.getElementById('join-mock-btn');
        
        if (!mockDraftInput || !mockLeagueSelect || !joinMockBtn) {
            return;
        }
        
        const hasDraftId = mockDraftInput.value && mockDraftInput.value.trim().length >= 10;
        const hasLeague = mockLeagueSelect.value && mockLeagueSelect.value.trim().length > 0;
        
        joinMockBtn.disabled = !(hasDraftId && hasLeague);
    }
    
    showMockError(message) {
        const mockError = document.getElementById('mock-draft-error');
        const mockErrorText = document.getElementById('mock-draft-error-text');
        
        if (mockError && mockErrorText) {
            mockErrorText.textContent = message;
            mockError.style.display = 'flex';
        }
    }
    
    hideMockError() {
        const mockError = document.getElementById('mock-draft-error');
        if (mockError) {
            mockError.style.display = 'none';
        }
    }
    
    /**
     * Setup mock draft form elements (can be called multiple times)
     */
    setupMockDraftFormElements() {
        console.log('🔍 Starting mock draft form element setup...');
        
        const draftIdInput = document.getElementById('mock-draft-id');
        const joinButton = document.getElementById('join-mock-btn');
        
        console.log('🔍 Mock draft form setup - Input:', draftIdInput, 'Button:', joinButton);
        console.log('🔍 Input element details:', {
            exists: !!draftIdInput,
            id: draftIdInput?.id,
            tagName: draftIdInput?.tagName
        });
        console.log('🔍 Button element details:', {
            exists: !!joinButton,
            id: joinButton?.id,
            tagName: joinButton?.tagName
        });
        
        if (draftIdInput && joinButton) {
            // Check if already set up
            if (joinButton.hasAttribute('data-mock-setup')) {
                console.log('ℹ️ Mock draft form already set up');
                return;
            }
            
            console.log('✅ Setting up mock draft form');
            
            // Add a simple test click handler first
            const testHandler = (e) => {
                console.log('🎯 TEST: Mock draft button clicked!');
                e.preventDefault();
                alert('Button clicked! This is a test.');
            };
            
            joinButton.addEventListener('click', testHandler);
            
            // Handle button click
            joinButton.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🎯 Mock draft button clicked!');
                const draftId = draftIdInput.value.trim();
                console.log('📝 Draft ID entered:', draftId);
                
                if (draftId) {
                    await this.handleMockDraftConnect(draftId);
                } else {
                    console.warn('⚠️ No draft ID entered');
                    this.showMockDraftError('Please enter a draft ID');
                }
            });
            
            // Handle Enter key in input
            draftIdInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('⌨️ Enter key pressed in mock draft input');
                    const draftId = draftIdInput.value.trim();
                    
                    if (draftId) {
                        await this.handleMockDraftConnect(draftId);
                    } else {
                        this.showMockDraftError('Please enter a draft ID');
                    }
                }
            });
            
            // Mark as set up
            joinButton.setAttribute('data-mock-setup', 'true');
            console.log('✅ Mock draft form setup complete');
        } else {
            console.error('❌ Mock draft form elements not found!');
            console.log('Missing elements:', {
                draftIdInput: !!draftIdInput,
                joinButton: !!joinButton
            });
            
            // Let's see what elements ARE available
            console.log('🔍 Available elements with mock-related IDs:');
            const allElements = document.querySelectorAll('[id*="mock"]');
            allElements.forEach(el => {
                console.log(`  - ${el.id}: ${el.tagName}`);
            });
        }
    }

    /**
     * Handle user search
     */
    async handleUserSearch(username, season = '2025') {
        console.log(`🔍 Searching for user: ${username}, season: ${season}`);
        
        const loadButton = document.getElementById('load-user-btn');
        
        try {
            // Show loading state
            if (loadButton) loadButton.loading = true;
            this.hideError();
            
            console.log('📡 Making API request to:', `${this.apiService.apiBase}/user/${username}`);
            
            // Fetch user data
            const userData = await this.apiService.request(`/user/${username}`);
            
            console.log('📥 User data response:', userData);
            console.log('🔍 User data keys:', userData.user ? Object.keys(userData.user) : 'no user object');
            console.log('🔍 User ID in response:', userData.user?.user_id);
            
            if (userData.status === 'success' && userData.user) {
                // Store user data with user_id
                const user = {
                    ...userData.user,
                    user_id: userData.user.user_id // Ensure user_id is included
                };
                
                console.log('✅ User data with ID:', user);
                console.log('🔍 Final user_id value:', user.user_id);
                
                // Store user data
                this.state.currentUser = user;
                
                // Store username for route migration
                window.RouteMigration.storeUsername(user.username);
                
                // Update global app state (with safety check)
                if (window.app && window.app.state) {
                    window.app.state.currentUser = user;
                    console.log('✅ Stored user in global state with ID:', user.user_id);
                } else {
                    console.warn('⚠️ window.app.state not available, creating it');
                    if (!window.app) window.app = {};
                    if (!window.app.state) window.app.state = {};
                    window.app.state.currentUser = user;
                }
                
                // Display user info
                this.displayUserInfo(user);
                
                console.log('📡 Making leagues API request to:', `${this.apiService.apiBase}/user/${username}/leagues?season=${season}`);
                
                // Fetch leagues for the season
                const leaguesData = await this.apiService.request(`/user/${username}/leagues?season=${season}`);
                
                console.log('📥 Leagues data response:', leaguesData);
                
                if (leaguesData.status === 'success' && leaguesData.leagues) {
                    console.log('✅ Leagues data valid, displaying', leaguesData.leagues.length, 'leagues');
                    
                    // Show user info
                    this.displayUserInfo(userData.user);
                    
                    // Show leagues container
                    const leaguesContainer = document.getElementById('leagues-container');
                    const leaguesList = document.getElementById('leagues-list');
                    const emptyState = document.getElementById('leagues-empty');
                    
                    if (leaguesContainer) leaguesContainer.style.display = 'block';
                    if (emptyState) emptyState.style.display = 'none';
                    
                    if (leaguesList) {
                        leaguesList.innerHTML = '';
                        
                        // Sort leagues by draft status (like V1)
                        const sortedLeagues = this.sortLeaguesByDraftStatus(leaguesData.leagues);
                        
                        // Create V1-style league cards
                        sortedLeagues.forEach(league => {
                            const leagueCard = this.createV1StyleLeagueCard(league);
                            leaguesList.appendChild(leagueCard);
                        });
                        
                        console.log('✅ Created', sortedLeagues.length, 'V1-style league cards');
                        
                        // Populate mock draft league selector
                        this.populateMockLeagueSelector(leaguesData.leagues);
                    }
                    
                    // Store data
                    this.state.userLeagues = leaguesData.leagues;
                    if (window.app && window.app.state) {
                        window.app.state.userLeagues = leaguesData.leagues;
                    }
                    
                    // Update URL to match new user-based pattern
                    const userUrl = window.RouteBuilder.user(username);
                    // Use replaceState to avoid creating extra history entries
                    history.replaceState({ 
                        user: userData.user, 
                        leagues: leaguesData.leagues 
                    }, '', userUrl);
                    
                } else {
                    console.error('❌ Leagues request failed:', leaguesData);
                    this.showError(leaguesData.error || 'Failed to load leagues');
                }
            } else {
                console.error('❌ User request failed:', userData);
                this.showError(userData.error || 'User not found');
            }
            
        } catch (error) {
            console.error('❌ User search failed:', error);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            this.showError('Failed to search for user. Please try again.');
        } finally {
            if (loadButton) loadButton.loading = false;
        }
    }

    /**
     * Display user information
     */
    displayUserInfo(user) {
        console.log('🎨 Displaying user info for:', user);
        
        try {
            // Updated to match refactored HTML structure
            const userInfoDiv = document.querySelector('.user-info');
            const userAvatar = document.getElementById('user-avatar');
            const displayName = document.getElementById('user-display-name');
            const username = document.getElementById('user-username');
            
            console.log('🔍 Found elements:', {
                userInfoDiv: !!userInfoDiv,
                userAvatar: !!userAvatar,
                displayName: !!displayName,
                username: !!username
            });
            
            if (displayName && username) {
                // Set user details
                displayName.textContent = user.display_name || user.username;
                username.textContent = `@${user.username}`;
                
                console.log('✅ Set user details:', {
                    displayName: displayName.textContent,
                    username: username.textContent
                });
                
                // Handle avatar (sl-avatar component)
                if (user.avatar && userAvatar) {
                    const avatarUrl = `https://sleepercdn.com/avatars/thumbs/${user.avatar}`;
                    userAvatar.image = avatarUrl;
                    console.log('✅ Set avatar image:', avatarUrl);
                }
                
                // Store user data (preserve user_id)
                this.state.currentUser = {
                    ...this.state.currentUser, // Preserve any existing data
                    ...user // Add/update with new user data
                };
                
                // Update global app state (with safety check)
                if (window.app && window.app.state) {
                    window.app.state.currentUser = {
                        ...window.app.state.currentUser, // Preserve any existing data
                        ...user // Add/update with new user data
                    };
                    console.log('✅ Updated global state, user_id:', window.app.state.currentUser.user_id);
                } else {
                    console.warn('⚠️ window.app.state not available, skipping global state update');
                }
                
                // Emit user selected event for other handlers
                this.emitUserSelected(user);
                
                console.log('✅ User info display completed successfully');
            } else {
                console.error('❌ Missing required elements for user display');
                throw new Error('Missing required DOM elements for user display');
            }
        } catch (error) {
            console.error('❌ Error in displayUserInfo:', error);
            throw error; // Re-throw to be caught by handleUserSearch
        }
    }

    /**
     * Display leagues list
     */
    displayLeagues(leagues, season) {
        console.log('🏆 displayLeagues called with', leagues.length, 'leagues for season', season);
        
        const leaguesSection = document.getElementById('leagues-section');
        const leaguesList = document.getElementById('leagues-list');
        const emptyState = document.getElementById('leagues-empty');
        const emptyMessage = document.getElementById('empty-message');
        const leagueCount = document.getElementById('user-league-count');
        
        console.log('🔍 Found league display elements:', {
            leaguesSection: !!leaguesSection,
            leaguesList: !!leaguesList,
            emptyState: !!emptyState,
            emptyMessage: !!emptyMessage,
            leagueCount: !!leagueCount
        });
        
        try {
            // Update league count
            console.log('📊 Updating league count...');
            if (leagueCount) {
                leagueCount.textContent = `${leagues.length} leagues found for ${season}`;
            }
            
            if (leagues.length > 0) {
                console.log('📋 Processing', leagues.length, 'leagues...');
                
                // Show leagues section
                if (leaguesSection) {
                    leaguesSection.removeAttribute('style'); // Remove inline style completely
                    leaguesSection.style.display = 'block';
                    console.log('✅ Removed inline style and set leaguesSection display to block');
                    console.log('🔍 leaguesSection computed style:', window.getComputedStyle(leaguesSection).display);
                    console.log('🔍 leaguesSection visibility:', window.getComputedStyle(leaguesSection).visibility);
                    console.log('🔍 leaguesSection opacity:', window.getComputedStyle(leaguesSection).opacity);
                }
                
                // Make sure the welcome section is visible
                const welcomeSection = document.getElementById('welcome-section');
                if (welcomeSection) {
                    welcomeSection.style.display = 'block';
                    console.log('✅ Set welcome-section display to block');
                }
                
                // Hide other sections
                const userSetupSection = document.getElementById('user-setup-section');
                const leagueSelectSection = document.getElementById('league-select-section');
                if (userSetupSection) userSetupSection.style.display = 'none';
                if (leagueSelectSection) leagueSelectSection.style.display = 'none';
                if (emptyState) {
                    emptyState.style.display = 'none';
                    console.log('✅ Set emptyState display to none');
                }
                
                // Clear existing leagues
                if (leaguesList) leaguesList.innerHTML = '';
                
                console.log('🔄 Sorting leagues by draft status...');
                // Sort leagues by draft status
                const sortedLeagues = this.sortLeaguesByDraftStatus(leagues);
                console.log('✅ Sorted', sortedLeagues.length, 'leagues');
                
                // Create league cards
                console.log('🎨 Creating league cards...');
                sortedLeagues.forEach((league, index) => {
                    console.log(`🏆 Creating card ${index + 1}/${sortedLeagues.length} for league:`, league.name);
                    try {
                        const leagueCard = this.createLeagueCard(league);
                        console.log('✅ Card created successfully:', leagueCard);
                        if (leaguesList) {
                            leaguesList.appendChild(leagueCard);
                            console.log('✅ Card appended to leagues list');
                        } else {
                            console.error('❌ leaguesList is null, cannot append card');
                        }
                    } catch (cardError) {
                        console.error('❌ Error creating league card:', cardError);
                        console.error('❌ League data:', league);
                    }
                });
                console.log('✅ All league cards created');
                
                // Debug: Check if cards are actually in the DOM
                const cardsInDOM = leaguesList ? leaguesList.children.length : 0;
                console.log('🔍 Cards in DOM after creation:', cardsInDOM);
                console.log('🔍 Leagues list element:', leaguesList);
                console.log('🔍 Leagues list innerHTML length:', leaguesList ? leaguesList.innerHTML.length : 0);
                
                // Store leagues data
            this.state.userLeagues = leagues;
            
            // Update global app state (with safety check)
            if (window.app && window.app.state) {
                window.app.state.userLeagues = leagues;
            } else {
                console.warn('⚠️ window.app.state not available, skipping global leagues state update');
            }
            
        } else {
            console.log('📭 No leagues to display, showing empty state');
            // Show empty state
            if (leaguesSection) leaguesSection.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            
            if (emptyMessage) {
                emptyMessage.textContent = `No leagues found for ${this.state.currentUser?.display_name || 'this user'} in the ${season} season.`;
            }
        }
        
        console.log('✅ displayLeagues completed successfully');
        
        } catch (error) {
            console.error('❌ Error in displayLeagues:', error);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            throw error; // Re-throw to be caught by handleUserSearch
        }
    }

    /**
     * Create a league card element
     */
    createLeagueCard(league) {
        const card = document.createElement('div');
        card.className = 'league-card';
        
        // Check if league has active draft
        const hasActiveDraft = league.drafts && league.drafts.some(draft => draft.status === 'drafting');
        if (hasActiveDraft) {
            card.classList.add('active-draft');
        }
        
        // League header
        const header = document.createElement('div');
        header.className = 'league-header';
        
        const titleRow = document.createElement('div');
        titleRow.className = 'league-title-row';
        
        const titleLeft = document.createElement('div');
        titleLeft.className = 'league-title-left';
        
        const title = document.createElement('h4');
        title.textContent = league.name;
        titleLeft.appendChild(title);
        
        // League type badge
        const badge = document.createElement('div');
        badge.className = `league-badge ${this.isDynastyOrKeeperLeague(league) ? 'dynasty' : 'redraft'}`;
        
        if (this.isDynastyOrKeeperLeague(league)) {
            badge.innerHTML = '<sl-icon name="crown"></sl-icon><span>Dynasty/Keeper</span>';
        } else {
            badge.innerHTML = '<sl-icon name="arrow-clockwise"></sl-icon><span>Redraft</span>';
        }
        titleLeft.appendChild(badge);
        
        titleRow.appendChild(titleLeft);
        
        // League meta info
        const meta = document.createElement('div');
        meta.className = 'league-meta';
        meta.innerHTML = `
            <sl-icon name="people-fill"></sl-icon>
            <span>${league.total_rosters} teams</span>
        `;
        titleRow.appendChild(meta);
        
        header.appendChild(titleRow);
        
        // League description
        const description = document.createElement('p');
        description.className = 'league-description';
        description.textContent = `${league.settings?.type || 'Standard'} • Season ${league.season}`;
        header.appendChild(description);
        
        card.appendChild(header);
        
        // Drafts section
        if (league.drafts && league.drafts.length > 0) {
            const draftsSection = document.createElement('div');
            draftsSection.className = 'drafts-section';
            
            const draftsTitle = document.createElement('h5');
            draftsTitle.textContent = 'Available Drafts:';
            draftsSection.appendChild(draftsTitle);
            
            league.drafts.forEach(draft => {
                const draftItem = this.createDraftItem(league, draft);
                draftsSection.appendChild(draftItem);
            });
            
            card.appendChild(draftsSection);
        }
        
        return card;
    }

    /**
     * Create a draft item element
     */
    createDraftItem(league, draft) {
        const item = document.createElement('div');
        item.className = 'draft-item';
        
        const draftInfo = document.createElement('div');
        draftInfo.className = 'draft-info';
        
        // Status icon
        const statusIcon = document.createElement('div');
        statusIcon.className = 'draft-status-icon';
        statusIcon.textContent = this.getDraftStatusIcon(draft.status);
        draftInfo.appendChild(statusIcon);
        
        // Draft details
        const details = document.createElement('div');
        details.className = 'draft-details';
        
        const title = document.createElement('h6');
        title.textContent = draft.type === 'snake' ? 'Snake Draft' : draft.type;
        details.appendChild(title);
        
        const time = document.createElement('p');
        time.className = 'draft-time';
        time.textContent = draft.start_time ? 
            new Date(draft.start_time).toLocaleString() : 
            'Start time TBD';
        details.appendChild(time);
        
        draftInfo.appendChild(details);
        item.appendChild(draftInfo);
        
        // Status badge and select button
        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.alignItems = 'center';
        rightSide.style.gap = '0.5rem';
        
        const statusBadge = document.createElement('div');
        statusBadge.className = `draft-status-badge ${draft.status}`;
        statusBadge.textContent = draft.status.replace('_', ' ');
        rightSide.appendChild(statusBadge);
        
        const selectButton = document.createElement('sl-button');
        selectButton.variant = 'primary';
        selectButton.size = 'small';
        selectButton.innerHTML = '<sl-icon slot="prefix" name="play-fill"></sl-icon>Select Draft';
        
        selectButton.addEventListener('click', () => {
            this.handleDraftSelect(league, draft);
        });
        
        rightSide.appendChild(selectButton);
        item.appendChild(rightSide);
        
        return item;
    }

    /**
     * Handle draft selection
     */
    async handleDraftSelect(league, draft) {
        console.log('🎯 Draft selected:', { league: league.league_id, draft: draft.draft_id });
        
        try {
            // Store selected draft info in global state
            if (window.app) {
                window.app.state.selectedLeague = league;
                window.app.state.selectedDraft = draft;
            }
            
            // Store in draft handlers state
            if (this.draftHandlers) {
                this.draftHandlers.state.currentLeague = league;
                this.draftHandlers.state.currentDraft = draft;
            }
            
            // Update URL for draft page with back navigation support
            const currentUser = this.state.currentUser;
            if (currentUser) {
                const draftUrl = window.RouteBuilder.userDraft(currentUser.username, league.league_id, draft.draft_id);
                console.log('🔗 Updating URL to:', draftUrl);
                
                // Use replaceState to avoid creating extra history entries
                history.replaceState({
                    page: 'draft',
                    user: currentUser,
                    league: league,
                    draft: draft,
                    backUrl: window.RouteBuilder.user(currentUser.username)
                }, '', draftUrl);
            }
            
            // Emit draft selected event with both league and draft data
            this.emitDraftSelected({
                ...draft,
                league: league
            });
            
            console.log('✅ Draft selection handled successfully');
            
        } catch (error) {
            console.error('❌ Failed to select draft:', error);
            this.showError('Failed to load draft. Please try again.');
        }
    }

    /**
     * Handle mock draft connection
     */
    async handleMockDraftConnect(draftId) {
        console.log('🎯 Connecting to mock draft:', draftId);
        
        const joinButton = document.getElementById('join-mock-btn');
        
        // Validate draft ID
        if (!draftId.match(/^\d+$/)) {
            console.error('❌ Invalid draft ID format:', draftId);
            this.showMockDraftError('Draft ID must be numeric');
            return;
        }
        
        try {
            console.log('🔄 Starting mock draft connection process...');
            
            // Show loading state
            if (joinButton) {
                joinButton.loading = true;
                joinButton.disabled = true;
                console.log('⏳ Button set to loading state');
            }
            this.hideMockDraftError();
            
            // Create mock draft object
            const mockDraft = {
                draft_id: draftId,
                type: 'snake',
                status: 'drafting'
            };
            
            const mockLeague = {
                league_id: 'mock',
                name: `Mock Draft ${draftId}`,
                total_rosters: 12,
                season: '2025'
            };
            
            console.log('📦 Created mock objects:', { mockLeague, mockDraft });
            
            // For mock drafts, we need to handle navigation differently since there's no user
            // Navigate directly to the mock draft URL
            const mockDraftUrl = `/sleeper/mock/${draftId}`;
            console.log('🔗 Navigating to mock draft URL:', mockDraftUrl);
            
            // Store mock draft data in global state
            if (window.app) {
                window.app.state.selectedLeague = mockLeague;
                window.app.state.selectedDraft = mockDraft;
                window.app.state.isMockDraft = true;
            }
            
            // Store in draft handlers state
            if (this.draftHandlers) {
                this.draftHandlers.state.currentLeague = mockLeague;
                this.draftHandlers.state.currentDraft = mockDraft;
            }
            
            // Navigate to the mock draft
            window.location.href = mockDraftUrl;
            
        } catch (error) {
            console.error('❌ Mock draft connection failed:', error);
            this.showMockDraftError('Network error while connecting to mock draft');
        } finally {
            if (joinButton) {
                joinButton.loading = false;
                joinButton.disabled = false;
                console.log('🔓 Button loading state cleared');
            }
        }
    }

    /**
     * Setup legacy event listeners (for backward compatibility)
     */
    setupLegacyEventListeners() {
        // Legacy buttons (for backward compatibility)
        const getStartedBtn = document.getElementById('get-started-btn');
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', () => {
                this.uiUtils.showSection('user-setup');
            });
        }
        
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.handleTestConnection();
            });
        }

        const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
        if (backToWelcomeBtn) {
            backToWelcomeBtn.addEventListener('click', () => {
                this.uiUtils.showSection('welcome');
            });
        }
        
        // League selection buttons
        const backToUserBtn = document.getElementById('back-to-user-btn');
        if (backToUserBtn) {
            backToUserBtn.addEventListener('click', () => {
                this.uiUtils.showSection('user-setup');
            });
        }
        
        const refreshLeaguesBtn = document.getElementById('refresh-leagues-btn');
        if (refreshLeaguesBtn) {
            refreshLeaguesBtn.addEventListener('click', () => {
                this.handleRefreshLeagues();
            });
        }
    }

    /**
     * Handle test connection
     */
    async handleTestConnection() {
        const button = document.getElementById('test-connection-btn');
        if (button) button.loading = true;
        
        try {
            await this.apiService.testConnection();
            this.uiUtils.updateConnectionStatus(true);
            this.uiUtils.showNotification('✅ Connection successful! Backend is running.', 'success');
        } catch (error) {
            this.uiUtils.updateConnectionStatus(false);
            
            let errorMessage = 'Connection failed: ';
            if (error.message.includes('timeout')) {
                errorMessage += 'Server not responding (timeout). Make sure the backend is running on port 5000.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Cannot reach server. Start the backend with: python main.py --port 5000';
            } else {
                errorMessage += error.message;
            }
            
            this.uiUtils.showNotification(errorMessage, 'danger', 15000);
        } finally {
            if (button) button.loading = false;
        }
    }

    /**
     * Handle refresh leagues
     */
    async handleRefreshLeagues() {
        if (this.state.currentUser) {
            await this.handleUserSearch(this.state.currentUser.username, this.state.selectedSeason);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('user-error');
        const errorText = document.getElementById('user-error-text');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorDiv = document.getElementById('user-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Show mock draft error
     */
    showMockDraftError(message) {
        const errorDiv = document.getElementById('mock-draft-error');
        const errorText = document.getElementById('mock-draft-error-text');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * Hide mock draft error
     */
    hideMockDraftError() {
        const errorDiv = document.getElementById('mock-draft-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Sort leagues by draft status priority
     */
    sortLeaguesByDraftStatus(leagues) {
        return [...leagues].sort((a, b) => {
            const getLeaguePriority = (league) => {
                if (!league.drafts || league.drafts.length === 0) return 4;
                
                const priorities = league.drafts.map(draft => this.getDraftStatusPriority(draft.status));
                return Math.min(...priorities);
            };
            
            const priorityA = getLeaguePriority(a);
            const priorityB = getLeaguePriority(b);
            
            return priorityA - priorityB;
        });
    }

    /**
     * Get draft status priority for sorting
     */
    getDraftStatusPriority(status) {
        switch (status) {
            case 'drafting': return 1;
            case 'pre_draft': return 2;
            case 'complete': return 3;
            default: return 4;
        }
    }

    /**
     * Get draft status icon
     */
    getDraftStatusIcon(status) {
        switch (status) {
            case 'complete': return '✅';
            case 'drafting': return '🔴';
            case 'pre_draft': return '⏳';
            default: return '❓';
        }
    }

    /**
     * Check if league is dynasty or keeper
     */
    isDynastyOrKeeperLeague(league) {
        const settings = league.settings || {};
        
        if (settings.type === 2) return true;
        if (settings.taxi_slots > 0) return true;
        if (settings.max_keepers > 1) return true;
        
        if (league.previous_league_id) {
            if (settings.max_keepers > 1 || settings.taxi_slots > 0 || settings.type === 2) {
                return true;
            }
        }
        
        if (league.drafts && league.drafts.length > 0) {
            const draft = league.drafts[0];
            if (draft.metadata && draft.metadata.scoring_type && 
                draft.metadata.scoring_type.includes('dynasty')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Set reference to draft handlers for cross-communication
     */
    setDraftHandlers(draftHandlers) {
        this.draftHandlers = draftHandlers;
    }

    /**
     * Emit user selected event
     */
    emitUserSelected(userData) {
        const event = new CustomEvent('userSelected', {
            detail: userData
        });
        document.dispatchEvent(event);
    }

    /**
     * Emit league selected event
     */
    emitLeagueSelected(leagueData) {
        const event = new CustomEvent('leagueSelected', {
            detail: leagueData
        });
        document.dispatchEvent(event);
    }

    /**
     * Emit draft selected event
     */
    emitDraftSelected(draftData) {
        const event = new CustomEvent('draftSelected', {
            detail: draftData
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current landing state
     */
    getState() {
        return {
            currentUser: this.state.currentUser,
            userLeagues: this.state.userLeagues,
            selectedSeason: this.state.selectedSeason
        };
    }

    /**
     * Cleanup landing handlers
     */
    cleanup() {
        console.log('🧹 Cleaning up landing handlers');
    }

    /**
     * Create a V1-style league card element (matches original design)
     */
    createV1StyleLeagueCard(league) {
        const card = document.createElement('div');
        card.className = 'league-card';
        
        // Check if league has active draft
        const hasActiveDraft = league.drafts && league.drafts.some(draft => draft.status === 'drafting');
        if (hasActiveDraft) {
            card.classList.add('draft-active');
        }
        
        // Determine if dynasty/keeper league
        const isDynasty = this.isDynastyOrKeeperLeague(league);
        
        card.innerHTML = `
            <div class="league-header">
                <div class="league-title-row">
                    <div class="league-title-left">
                        <h4>${league.name}</h4>
                        ${isDynasty ? 
                            '<div class="badge dynasty"><sl-icon name="crown" class="w-3 h-3 mr-1"></sl-icon><span>Dynasty/Keeper</span></div>' :
                            '<div class="badge redraft"><sl-icon name="arrow-clockwise" class="w-3 h-3 mr-1"></sl-icon><span>Redraft</span></div>'
                        }
                    </div>
                    <div class="league-meta">
                        <sl-icon name="people-fill" class="w-4 h-4"></sl-icon>
                        <span>${league.total_rosters} teams</span>
                    </div>
                </div>
                <p class="league-description">
                    ${league.settings?.type || 'Standard'} • Season ${league.season}
                </p>
            </div>

            ${league.drafts && league.drafts.length > 0 ? `
                <div class="drafts-section">
                    <h5>Available Drafts:</h5>
                    <div class="space-y-2">
                        ${league.drafts.map(draft => `
                            <div class="draft-item">
                                <div class="draft-info">
                                    <div class="draft-status-icon">${this.getDraftStatusIcon(draft.status)}</div>
                                    <div class="draft-details">
                                        <h6>${draft.type === 'snake' ? 'Snake Draft' : draft.type}</h6>
                                        <p class="draft-time">
                                            ${draft.start_time ? 
                                                new Date(draft.start_time).toLocaleString() : 
                                                'Start time TBD'
                                            }
                                        </p>
                                    </div>
                                </div>
                                
                                <div class="draft-actions">
                                    <div class="badge ${draft.status}">${draft.status.replace('_', ' ')}</div>
                                    <sl-button variant="primary" size="small" onclick="window.handleDraftSelect('${league.league_id}', '${draft.draft_id}')">
                                        <sl-icon slot="prefix" name="play-fill"></sl-icon>
                                        Select Draft
                                    </sl-button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : `
                <div class="text-center py-4 text-gray-500">
                    <sl-icon name="calendar" style="font-size: 2rem;" class="mx-auto mb-2 text-gray-300"></sl-icon>
                    <p>No drafts found for this league</p>
                </div>
            `}
        `;
        
        return card;
    }

    /**
     * Check if league is dynasty or keeper
     */
    isDynastyOrKeeperLeague(league) {
        const settings = league.settings || {};
        
        if (settings.type === 2) return true;
        if (settings.taxi_slots > 0) return true;
        if (settings.max_keepers > 1) return true;
        
        if (league.previous_league_id) {
            if (settings.max_keepers > 1 || settings.taxi_slots > 0 || settings.type === 2) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get draft status icon
     */
    getDraftStatusIcon(status) {
        switch (status) {
            case 'complete': return '✅';
            case 'drafting': return '🔴';
            case 'pre_draft': return '⏳';
            default: return '❓';
        }
    }
}

// Export for use in other modules
window.LandingHandlers = LandingHandlers;
