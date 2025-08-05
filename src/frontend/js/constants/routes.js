/**
 * Route Constants for Fantasy Football Draft Assistant V2
 * 
 * Centralized route definitions to avoid hardcoded URLs throughout the application
 */

window.ROUTES = {
    // Base routes
    HOME: '/',
    
    // User-based routes (primary)
    USER: '/sleeper/user/:username',
    USER_LEAGUES: '/sleeper/user/:username/leagues',
    USER_LEAGUE: '/sleeper/user/:username/league/:leagueId',
    USER_DRAFT: '/sleeper/user/:username/league/:leagueId/draft/:draftId',
    
    // API routes
    API: {
        USER: '/user/:username',
        USER_LEAGUES: '/user/:username/leagues',
        LEAGUE: '/league/:leagueId',
        DRAFT: '/draft/:draftId',
        DRAFT_PICKS: '/draft/:draftId/picks',
        RANKINGS_LIST: '/rankings/list',
        RANKINGS_DATA: '/rankings/data/:rankingId'
    }
};

/**
 * Route builder functions to generate URLs with parameters
 */
window.RouteBuilder = {
    /**
     * Build user route
     */
    user: (username) => `/sleeper/user/${username}`,
    
    /**
     * Build user leagues route
     */
    userLeagues: (username) => `/sleeper/user/${username}/leagues`,
    
    /**
     * Build user league route
     */
    userLeague: (username, leagueId) => `/sleeper/user/${username}/league/${leagueId}`,
    
    /**
     * Build user draft route
     */
    userDraft: (username, leagueId, draftId) => `/sleeper/user/${username}/league/${leagueId}/draft/${draftId}`,
    
    /**
     * Build API user route
     */
    apiUser: (username) => `/user/${username}`,
    
    /**
     * Build API user leagues route
     */
    apiUserLeagues: (username, season = '2025') => `/user/${username}/leagues?season=${season}`,
    
    /**
     * Build API draft route
     */
    apiDraft: (draftId) => `/draft/${draftId}`,
    
    /**
     * Build API rankings data route
     */
    apiRankingsData: (rankingId) => `/rankings/data/${rankingId}`
};

/**
 * Route parser functions to extract parameters from URLs
 */
window.RouteParser = {
    /**
     * Parse user from current URL
     */
    parseUser: (pathname = window.location.pathname) => {
        const match = pathname.match(/\/sleeper\/user\/([^/]+)/);
        return match ? match[1] : null;
    },
    
    /**
     * Parse league ID from current URL
     */
    parseLeagueId: (pathname = window.location.pathname) => {
        const match = pathname.match(/\/league\/([^/]+)/);
        return match ? match[1] : null;
    },
    
    /**
     * Parse draft ID from current URL
     */
    parseDraftId: (pathname = window.location.pathname) => {
        const match = pathname.match(/\/draft\/([^/]+)/);
        return match ? match[1] : null;
    },
    
    /**
     * Parse all route parameters from current URL
     */
    parseAll: (pathname = window.location.pathname) => {
        return {
            username: window.RouteParser.parseUser(pathname),
            leagueId: window.RouteParser.parseLeagueId(pathname),
            draftId: window.RouteParser.parseDraftId(pathname)
        };
    },
    
    /**
     * Check if current URL is a user-based route
     */
    isUserRoute: (pathname = window.location.pathname) => {
        return pathname.includes('/sleeper/user/');
    },
    
    /**
     * Check if current URL is a legacy route (for migration)
     */
    isLegacyRoute: (pathname = window.location.pathname) => {
        return pathname.includes('/sleeper/league/') && !pathname.includes('/sleeper/user/');
    },
    
    /**
     * Get the route type
     */
    getRouteType: (pathname = window.location.pathname) => {
        if (window.RouteParser.isUserRoute(pathname)) {
            return 'user-based';
        } else if (window.RouteParser.isLegacyRoute(pathname)) {
            return 'legacy';
        } else {
            return 'unknown';
        }
    }
};

/**
 * Route validation functions
 */
window.RouteValidator = {
    /**
     * Validate username format
     */
    isValidUsername: (username) => {
        return username && typeof username === 'string' && username.length > 0;
    },
    
    /**
     * Validate league ID format
     */
    isValidLeagueId: (leagueId) => {
        return leagueId && typeof leagueId === 'string' && /^\d+$/.test(leagueId);
    },
    
    /**
     * Validate draft ID format
     */
    isValidDraftId: (draftId) => {
        return draftId && typeof draftId === 'string' && /^\d+$/.test(draftId);
    }
};

console.log('✅ Route constants loaded');

// Export for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ROUTES: window.ROUTES,
        RouteBuilder: window.RouteBuilder,
        RouteParser: window.RouteParser,
        RouteValidator: window.RouteValidator
    };
}
