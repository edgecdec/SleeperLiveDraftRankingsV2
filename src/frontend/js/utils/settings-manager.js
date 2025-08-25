/**
 * Settings Manager - Handles auto-refresh interval settings
 * 
 * Manages localStorage persistence and validation for user preferences
 * including auto-refresh intervals for live and mock drafts.
 */
class SettingsManager {
    constructor() {
        this.storageKey = 'sleeperDraftSettings';
        this.version = '1.0';
        
        // Default settings configuration
        this.defaults = {
            autoRefresh: {
                enabled: true,
                interval: 30000,      // 30 seconds for live drafts (in milliseconds)
                mockDraftInterval: 60000,  // 60 seconds for mock drafts (in milliseconds)
                lastUpdated: null
            },
            version: this.version
        };
        
        // Available interval options with labels
        this.intervalOptions = [
            { value: 10000, label: 'Very Fast (10s)', seconds: 10 },
            { value: 15000, label: 'Fast (15s)', seconds: 15 },
            { value: 30000, label: 'Normal (30s)', seconds: 30 },
            { value: 60000, label: 'Slow (60s)', seconds: 60 },
            { value: 120000, label: 'Very Slow (2m)', seconds: 120 },
            { value: 300000, label: 'Minimal (5m)', seconds: 300 }
        ];
        
        console.log('✅ SettingsManager initialized');
    }
    
    /**
     * Load settings from localStorage with fallback to defaults
     * @returns {Object} Settings object
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            
            if (!stored) {
                console.log('📄 No stored settings found, using defaults');
                return this.getDefaults();
            }
            
            const parsed = JSON.parse(stored);
            
            // Validate version and migrate if necessary
            if (!parsed.version || parsed.version !== this.version) {
                console.log('🔄 Settings version mismatch, migrating...');
                return this.migrateSettings(parsed);
            }
            
            // Merge with defaults to ensure all properties exist
            const settings = this.mergeWithDefaults(parsed);
            
            console.log('✅ Settings loaded from localStorage:', settings);
            return settings;
            
        } catch (error) {
            console.error('❌ Error loading settings from localStorage:', error);
            return this.getDefaults();
        }
    }
    
    /**
     * Save settings to localStorage
     * @param {Object} settings - Settings object to save
     * @returns {boolean} Success status
     */
    saveSettings(settings) {
        try {
            // Validate settings before saving
            const validatedSettings = this.validateSettings(settings);
            if (!validatedSettings) {
                throw new Error('Settings validation failed');
            }
            
            // Add timestamp
            validatedSettings.autoRefresh.lastUpdated = new Date().toISOString();
            validatedSettings.version = this.version;
            
            // Save to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(validatedSettings));
            
            console.log('✅ Settings saved to localStorage:', validatedSettings);
            return true;
            
        } catch (error) {
            console.error('❌ Error saving settings to localStorage:', error);
            return false;
        }
    }
    
    /**
     * Get default settings
     * @returns {Object} Default settings object
     */
    getDefaults() {
        return JSON.parse(JSON.stringify(this.defaults));
    }
    
    /**
     * Get current auto-refresh interval based on draft type
     * @param {boolean} isMockDraft - Whether this is a mock draft
     * @returns {number} Interval in milliseconds
     */
    getRefreshInterval(isMockDraft = false) {
        const settings = this.loadSettings();
        
        if (!settings.autoRefresh.enabled) {
            return null; // Auto-refresh disabled
        }
        
        return isMockDraft ? 
            settings.autoRefresh.mockDraftInterval : 
            settings.autoRefresh.interval;
    }
    
    /**
     * Check if auto-refresh is enabled
     * @returns {boolean} Auto-refresh enabled status
     */
    isAutoRefreshEnabled() {
        const settings = this.loadSettings();
        return settings.autoRefresh.enabled;
    }
    
    /**
     * Update auto-refresh interval
     * @param {number} interval - New interval in milliseconds
     * @param {boolean} isMockDraft - Whether this is for mock drafts
     * @returns {boolean} Success status
     */
    updateRefreshInterval(interval, isMockDraft = false) {
        const settings = this.loadSettings();
        
        if (isMockDraft) {
            settings.autoRefresh.mockDraftInterval = interval;
        } else {
            settings.autoRefresh.interval = interval;
        }
        
        return this.saveSettings(settings);
    }
    
    /**
     * Toggle auto-refresh enabled/disabled
     * @param {boolean} enabled - New enabled status
     * @returns {boolean} Success status
     */
    setAutoRefreshEnabled(enabled) {
        const settings = this.loadSettings();
        settings.autoRefresh.enabled = enabled;
        return this.saveSettings(settings);
    }
    
    /**
     * Get interval option by value
     * @param {number} value - Interval value in milliseconds
     * @returns {Object|null} Interval option object
     */
    getIntervalOption(value) {
        return this.intervalOptions.find(option => option.value === value) || null;
    }
    
    /**
     * Get all available interval options
     * @returns {Array} Array of interval options
     */
    getIntervalOptions() {
        return [...this.intervalOptions];
    }
    
    /**
     * Convert milliseconds to human-readable label
     * @param {number} ms - Milliseconds
     * @returns {string} Human-readable label
     */
    formatInterval(ms) {
        const option = this.getIntervalOption(ms);
        if (option) {
            return option.label;
        }
        
        // Fallback formatting for custom intervals
        const seconds = ms / 1000;
        if (seconds < 60) {
            return `${seconds}s`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
        }
    }
    
    /**
     * Validate settings object
     * @param {Object} settings - Settings to validate
     * @returns {Object|null} Validated settings or null if invalid
     */
    validateSettings(settings) {
        try {
            if (!settings || typeof settings !== 'object') {
                throw new Error('Settings must be an object');
            }
            
            if (!settings.autoRefresh || typeof settings.autoRefresh !== 'object') {
                throw new Error('autoRefresh settings missing or invalid');
            }
            
            const { autoRefresh } = settings;
            
            // Validate enabled flag
            if (typeof autoRefresh.enabled !== 'boolean') {
                throw new Error('autoRefresh.enabled must be boolean');
            }
            
            // Validate intervals
            this.validateInterval(autoRefresh.interval, 'interval');
            this.validateInterval(autoRefresh.mockDraftInterval, 'mockDraftInterval');
            
            return settings;
            
        } catch (error) {
            console.error('❌ Settings validation error:', error.message);
            return null;
        }
    }
    
    /**
     * Validate a single interval value
     * @param {number} interval - Interval to validate
     * @param {string} name - Name for error messages
     * @throws {Error} If interval is invalid
     */
    validateInterval(interval, name = 'interval') {
        if (typeof interval !== 'number' || interval <= 0) {
            throw new Error(`${name} must be a positive number`);
        }
        
        const minInterval = 10000; // 10 seconds
        const maxInterval = 300000; // 5 minutes
        
        if (interval < minInterval) {
            throw new Error(`${name} cannot be less than ${minInterval}ms (10 seconds)`);
        }
        
        if (interval > maxInterval) {
            throw new Error(`${name} cannot be greater than ${maxInterval}ms (5 minutes)`);
        }
    }
    
    /**
     * Merge settings with defaults to ensure all properties exist
     * @param {Object} settings - Settings to merge
     * @returns {Object} Merged settings
     */
    mergeWithDefaults(settings) {
        const defaults = this.getDefaults();
        
        return {
            ...defaults,
            autoRefresh: {
                ...defaults.autoRefresh,
                ...(settings.autoRefresh || {})
            }
        };
    }
    
    /**
     * Migrate settings from older versions
     * @param {Object} oldSettings - Old settings object
     * @returns {Object} Migrated settings
     */
    migrateSettings(oldSettings) {
        console.log('🔄 Migrating settings from older version');
        
        // For now, just merge with defaults and save
        // In the future, this could handle specific migration logic
        const migrated = this.mergeWithDefaults(oldSettings);
        
        // Save the migrated settings
        this.saveSettings(migrated);
        
        return migrated;
    }
    
    /**
     * Reset settings to defaults
     * @returns {boolean} Success status
     */
    resetToDefaults() {
        console.log('🔄 Resetting settings to defaults');
        const defaults = this.getDefaults();
        return this.saveSettings(defaults);
    }
    
    /**
     * Clear all stored settings
     * @returns {boolean} Success status
     */
    clearSettings() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('✅ Settings cleared from localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error clearing settings:', error);
            return false;
        }
    }
    
    /**
     * Get storage info for debugging
     * @returns {Object} Storage information
     */
    getStorageInfo() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return {
                hasStoredSettings: !!stored,
                storageSize: stored ? stored.length : 0,
                storageKey: this.storageKey,
                isLocalStorageAvailable: this.isLocalStorageAvailable()
            };
        } catch (error) {
            return {
                hasStoredSettings: false,
                storageSize: 0,
                storageKey: this.storageKey,
                isLocalStorageAvailable: false,
                error: error.message
            };
        }
    }
    
    /**
     * Check if localStorage is available
     * @returns {boolean} localStorage availability
     */
    isLocalStorageAvailable() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Export for use in other modules
window.SettingsManager = SettingsManager;