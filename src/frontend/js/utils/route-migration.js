/**
 * Route Migration Utility
 * 
 * Handles migration from legacy routes to new user-based routes
 */

window.RouteMigration = {
    /**
     * Check if current URL needs migration and redirect if necessary
     */
    checkAndMigrate: function() {
        const currentPath = window.location.pathname;
        
        // Check if it's a legacy route that needs migration
        if (window.RouteParser.isLegacyRoute(currentPath)) {
            console.log('🔄 Legacy route detected, attempting migration:', currentPath);
            
            // For now, we'll need the username to migrate
            // This could come from localStorage, sessionStorage, or user input
            const username = window.RouteMigration.getStoredUsername();
            
            if (username) {
                const migratedUrl = window.RouteMigration.migrateLegacyUrl(currentPath, username);
                if (migratedUrl) {
                    console.log('✅ Migrating to new route:', migratedUrl);
                    window.history.replaceState(null, '', migratedUrl);
                    return true;
                }
            } else {
                console.log('⚠️ Cannot migrate legacy route without username');
                // Could show a modal asking for username
                window.RouteMigration.promptForUsername(currentPath);
            }
        }
        
        return false;
    },
    
    /**
     * Migrate a legacy URL to the new format
     */
    migrateLegacyUrl: function(legacyPath, username) {
        // Parse legacy route: /sleeper/league/ID/draft/ID
        const legacyMatch = legacyPath.match(/\/sleeper\/league\/(\d+)\/draft\/(\d+)/);
        
        if (legacyMatch) {
            const [, leagueId, draftId] = legacyMatch;
            return window.RouteBuilder.userDraft(username, leagueId, draftId);
        }
        
        // Parse legacy league route: /sleeper/league/ID
        const leagueMatch = legacyPath.match(/\/sleeper\/league\/(\d+)/);
        if (leagueMatch) {
            const [, leagueId] = leagueMatch;
            return window.RouteBuilder.userLeague(username, leagueId);
        }
        
        return null;
    },
    
    /**
     * Get stored username from various sources
     */
    getStoredUsername: function() {
        // Try global state first
        if (window.app?.state?.currentUser?.username) {
            return window.app.state.currentUser.username;
        }
        
        // Try localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                return user.username;
            } catch (e) {
                console.warn('Failed to parse stored user data');
            }
        }
        
        // Try sessionStorage
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
            try {
                const user = JSON.parse(sessionUser);
                return user.username;
            } catch (e) {
                console.warn('Failed to parse session user data');
            }
        }
        
        return null;
    },
    
    /**
     * Store username for future migrations
     */
    storeUsername: function(username) {
        if (username) {
            const userData = { username, timestamp: Date.now() };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            sessionStorage.setItem('currentUser', JSON.stringify(userData));
        }
    },
    
    /**
     * Prompt user for username to complete migration
     */
    promptForUsername: function(legacyPath) {
        // For now, just log the issue
        console.log('🚨 Legacy route migration requires username:', legacyPath);
        console.log('💡 Consider implementing a username prompt modal here');
        
        // Could implement a modal dialog here
        // For development, we could redirect to home page
        // window.location.href = '/';
    },
    
    /**
     * Initialize route migration on page load
     */
    init: function() {
        const currentPath = window.location.pathname;
        const routeType = window.RouteParser.getRouteType(currentPath);
        
        console.log('🔍 Route analysis:', {
            path: currentPath,
            type: routeType,
            isUserBased: window.RouteParser.isUserRoute(currentPath),
            isLegacy: window.RouteParser.isLegacyRoute(currentPath)
        });
        
        // Check for migration on initial load
        const migrated = window.RouteMigration.checkAndMigrate();
        
        if (!migrated && routeType === 'user-based') {
            console.log('✅ Already using user-based route structure');
        } else if (!migrated && routeType === 'legacy') {
            console.log('⚠️ Legacy route detected but could not migrate (missing username)');
        }
        
        // Listen for popstate events (back/forward navigation)
        window.addEventListener('popstate', function() {
            window.RouteMigration.checkAndMigrate();
        });
        
        console.log('✅ Route migration initialized');
    }
};

console.log('✅ Route migration utility loaded');

// Export for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.RouteMigration;
}
