# AI Development Guide for Fantasy Football Draft Assistant V2

This comprehensive guide provides instructions for AI assistants to correctly iterate on the Fantasy Football Draft Assistant V2 system and match the original project's functionality.

## 🎯 Project Overview

### **Current System (V2.0.0)**
- **Flask Backend**: RESTful API with Sleeper integration
- **Modern Frontend**: Vanilla JavaScript SPA with responsive design
- **Rankings System**: 548+ players across 6 league formats
- **CI/CD Pipeline**: Automated builds for Windows, macOS, Linux
- **Progress**: 22/100 features completed (22%)

### **Original System Reference**
- **Location**: `/Users/edeclan/FantasyFootballTest/SleeperLiveDraftRankings` (original project)
- **Current Project**: `/Users/edeclan/FantasyFootballTest/SleeperLiveDraftRankingsV2` (V2 rewrite)
- **Key Files**: `PlayerRankings.py`, `BestAvailable.py`, `RankingsUtil.py`, `Constants.py`
- **Functionality**: Command-line tool with CSV rankings and Sleeper API
- **Reference for Features**: Always check original project for existing implementations before creating new ones

## 🐛 Bug Reports and Feature Suggestions

### **When User Reports a Bug**

#### **A. Immediate Response Process**
1. **Acknowledge the bug** with empathy and professionalism
2. **Gather details** about the issue (steps to reproduce, environment, etc.)
3. **Attempt to reproduce** the bug if possible
4. **Provide workaround** if available
5. **Add to tracking system** immediately

#### **B. Bug Documentation Template**
```bash
# Add bug to tracking system
python3 scripts/track_progress.py add "Fix: [Bug Description]" "🐛 Bug Fixes"

# Example:
python3 scripts/track_progress.py add "Fix: Dynasty players showing as available in redraft leagues" "🐛 Bug Fixes"
```

#### **C. Bug Report Format in MISSING_FEATURES.md**
```markdown
### 🐛 Bug Fixes
- [ ] **Fix: [Bug Description]** - [Detailed description of the issue]
  - **Reported by**: User on [Date]
  - **Severity**: High/Medium/Low
  - **Steps to reproduce**: [Steps]
  - **Expected behavior**: [What should happen]
  - **Actual behavior**: [What actually happens]
  - **Workaround**: [If available]
```

#### **D. Bug Priority Classification**
- **🔥 Critical (Fix Immediately)**: App crashes, data loss, security issues
- **⚠️ High (Fix in Current Sprint)**: Core functionality broken, user can't complete main tasks
- **📋 Medium (Fix in Next Sprint)**: Feature partially broken, workaround available
- **📝 Low (Fix When Convenient)**: Minor UI issues, edge cases

### **When User Suggests a Feature**

#### **A. Feature Suggestion Response Process**
1. **Thank the user** for the suggestion
2. **Ask clarifying questions** to understand the use case
3. **Explain current status** (if similar feature exists or is planned)
4. **Add to feature list** with proper categorization
5. **Provide timeline estimate** if possible

#### **B. Feature Addition Template**
```bash
# Add feature suggestion to tracking system
python3 scripts/track_progress.py add "[Feature Name]" "[Category]"

# Example:
python3 scripts/track_progress.py add "Player Comparison Tool" "🎯 User Experience Enhancements"
```

#### **C. Feature Suggestion Format in MISSING_FEATURES.md**
```markdown
- [ ] **[Feature Name]** - [Description of the feature]
  - **Suggested by**: User on [Date]
  - **Use case**: [Why the user wants this feature]
  - **Priority**: High/Medium/Low (based on user impact and complexity)
  - **Complexity**: Simple/Medium/Complex
  - **Dependencies**: [Other features this depends on]
  - **Similar to**: [Reference to original project if applicable]
```

#### **D. Feature Priority Assessment**
**High Priority Criteria:**
- Requested by multiple users
- Addresses core draft functionality
- Easy to implement with existing infrastructure
- High user impact

**Medium Priority Criteria:**
- Nice-to-have enhancement
- Moderate implementation complexity
- Improves user experience
- Fits with current roadmap

**Low Priority Criteria:**
- Edge case or niche use case
- High implementation complexity
- Low user impact
- Requires significant infrastructure changes

### **User Communication Templates**

#### **A. Bug Report Response**
```
Thank you for reporting this issue! I understand how frustrating this must be.

🐛 **Bug Confirmed**: [Brief description]

**What I'm doing about it:**
✅ Added to our bug tracking system
✅ [Immediate action taken, if any]
✅ [Workaround provided, if available]

**Timeline**: [Expected fix timeline based on severity]

I'll keep you updated on the progress. In the meantime, [workaround or alternative approach if available].
```

#### **B. Feature Suggestion Response**
```
Great suggestion! This would definitely improve the draft experience.

💡 **Feature Request**: [Brief description]

**What I'm doing about it:**
✅ Added to our feature roadmap
✅ Categorized as [Priority Level] priority
✅ [Any immediate thoughts on implementation]

**Timeline**: [Rough estimate based on priority and current sprint]

This fits well with our goal of [relevant goal from roadmap]. I'll make sure it's considered for [relevant sprint/timeframe].
```

### **Tracking System Integration**

#### **A. Update MISSING_FEATURES.md Structure**
Add new sections for user-reported items:

```markdown
## 🐛 Bug Fixes (User Reported)
[Bugs reported by users that need fixing]

## 💡 Feature Requests (User Suggested)  
[Features suggested by users that aren't in original project]

## 🔄 Enhancements (User Requested)
[Improvements to existing features suggested by users]
```

#### **B. Progress Tracking Updates**
```bash
# Generate report including user-reported items
python3 scripts/track_progress.py report

# The report should now include:
# - Original features from the project
# - User-reported bugs
# - User-suggested features
# - Total progress across all categories
```

#### **C. Sprint Planning Integration**
When planning sprints, consider:
1. **Critical bugs** (always fix first)
2. **High-priority user requests** (balance with planned features)
3. **Original project features** (maintain progress toward 100%)
4. **Technical debt** (keep system maintainable)

### **Implementation Workflow for User-Reported Items**

#### **A. Bug Fix Workflow**
```bash
# 1. Reproduce the bug
python main.py --port 5000
# [Test the reported scenario]

# 2. Identify root cause
# [Debug and analyze the issue]

# 3. Implement fix following existing patterns
# [Fix the bug using established code patterns]

# 4. Test the fix
# [Verify bug is fixed and no regressions introduced]

# 5. Update progress
python3 scripts/track_progress.py complete "Fix: [Bug Description]"

# 6. Commit with proper message
git commit -m "Fix: [Bug Description] - user reported issue

🐛 Bug Fix:
✅ [What was broken]
✅ [How it was fixed]
✅ [Testing completed]

🧪 Verification:
✅ [Steps to verify fix]
✅ [Regression testing completed]

Resolves user-reported issue: [Brief description]"
```

#### **B. Feature Implementation Workflow**
```bash
# 1. Analyze feature request
# [Understand requirements and use case]

# 2. Design implementation approach
# [Plan backend/frontend changes needed]

# 3. Check for conflicts with existing features
# [Ensure no breaking changes]

# 4. Implement following established patterns
# [Use existing code patterns and guidelines]

# 5. Test thoroughly
# [Test happy path, edge cases, integration]

# 6. Update progress
python3 scripts/track_progress.py complete "[Feature Name]"

# 7. Commit with proper message
git commit -m "Implement [Feature Name] - user requested feature

🚀 User-Requested Feature:
✅ [What the feature does]
✅ [How it was implemented]
✅ [Integration points]

🎯 User Impact:
✅ [How this helps users]
✅ [Use cases addressed]

Implements user suggestion: [Brief description]"
```

### **Quality Assurance for User-Reported Items**

#### **A. Bug Fix Quality Gates**
- [ ] Bug is reproducible before fix
- [ ] Fix addresses root cause, not just symptoms
- [ ] No regressions introduced
- [ ] Edge cases considered
- [ ] User can verify fix works

#### **B. Feature Request Quality Gates**
- [ ] Feature matches user's described use case
- [ ] Integrates well with existing functionality
- [ ] Follows established UI/UX patterns
- [ ] Performance impact acceptable
- [ ] Mobile responsive (if UI feature)

### **Communication and Follow-up**

#### **A. Progress Updates**
Keep users informed about their reports:
```
📊 **Update on your [bug report/feature request]:**

**Status**: [In Progress/Testing/Completed]
**Progress**: [What's been done]
**Next Steps**: [What's coming next]
**Timeline**: [Updated estimate if changed]

[Any additional context or questions]
```

#### **B. Completion Notification**
```
🎉 **Great news!** Your [bug report/feature request] has been implemented!

**What's New:**
✅ [Description of fix/feature]
✅ [How to access/use it]
✅ [Any important notes]

**Available In**: [Version/build where it's available]

Thank you for helping make the Fantasy Football Draft Assistant better! Keep the feedback coming! 🏈
```

### **6. File Cleanup and Management**

#### **A. Always Clean Up Temporary Files**
```bash
# After completing any feature implementation, clean up temporary files
# This prevents broken references and confusion

# Example cleanup workflow:
# 1. Identify all files created during development
# 2. Remove temporary, backup, or duplicate files
# 3. Update any references to point to final files
# 4. Verify all links and imports are correct

# Common cleanup commands:
rm src/frontend/*_enhanced.html    # Remove enhanced versions after integration
rm src/frontend/*_backup.js        # Remove backup files after verification
rm src/frontend/*_temp.*           # Remove any temporary files
rm src/frontend/*_old.*            # Remove old versions after migration
```

#### **B. File Reference Verification Checklist**
```bash
# CRITICAL: Always verify file references after cleanup
# Check these common reference points:

# 1. HTML file references
grep -r "\.css" src/frontend/*.html
grep -r "\.js" src/frontend/*.html

# 2. JavaScript imports
grep -r "import.*from" src/frontend/*.js
grep -r "require(" src/frontend/*.js

# 3. CSS imports
grep -r "@import" src/frontend/*.css
grep -r "url(" src/frontend/*.css

# 4. Python imports
grep -r "from.*import" src/backend/**/*.py
grep -r "import.*" src/backend/**/*.py
```

#### **C. Cleanup Workflow Template**
```bash
# Use this template for every feature implementation:

# 1. BEFORE starting work - document current files
ls -la src/frontend/ > files_before.txt

# 2. DURING development - track new files created
# Keep a mental note of temporary files, backups, enhanced versions

# 3. AFTER completing work - identify cleanup needed
ls -la src/frontend/ > files_after.txt
diff files_before.txt files_after.txt

# 4. CLEANUP - remove unnecessary files
rm src/frontend/*_enhanced.*     # Enhanced versions after integration
rm src/frontend/*_backup.*       # Backup files after verification
rm src/frontend/*_temp.*         # Temporary files
rm src/frontend/*_old.*          # Old versions
rm files_before.txt files_after.txt  # Cleanup tracking files

# 5. VERIFY - ensure all references work
# Test the application to ensure no broken links
# Check browser console for 404 errors
# Verify all functionality still works
```

#### **D. Common File Cleanup Scenarios**

**Scenario 1: UI Enhancement/Refactoring**
```bash
# When replacing UI files (like our Shoelace integration):

# 1. Create enhanced versions
cp index.html index_enhanced.html
cp style.css style_enhanced.css
cp app.js app_enhanced.js

# 2. Develop and test enhanced versions
# ... development work ...

# 3. Replace original files with enhanced versions
cp index_enhanced.html index.html
cp style_enhanced.css style.css
cp app_enhanced.js app.js

# 4. CRITICAL: Update any references in HTML
sed -i 's/style_enhanced.css/style.css/g' src/frontend/index.html
sed -i 's/app_enhanced.js/app.js/g' src/frontend/index.html

# 5. Clean up enhanced files
rm src/frontend/*_enhanced.*

# 6. Keep backups temporarily for rollback
mv index.html index_original_backup.html  # Keep for safety
```

**Scenario 2: API Endpoint Changes**
```bash
# When refactoring API endpoints:

# 1. Create new endpoint files
cp api/old_endpoint.py api/new_endpoint.py

# 2. Update imports and references
grep -r "old_endpoint" src/backend/
# Update all references to use new_endpoint

# 3. Remove old endpoint file
rm api/old_endpoint.py

# 4. Update route registrations
grep -r "old_endpoint" src/backend/app.py
# Remove old route registrations
```

**Scenario 3: Configuration File Updates**
```bash
# When updating configuration:

# 1. Backup current config
cp config.py config_backup.py

# 2. Make changes to config.py
# ... configuration updates ...

# 3. Test thoroughly
# ... testing ...

# 4. Remove backup after verification
rm config_backup.py
```

#### **E. Automated Cleanup Script**
```bash
# Create a cleanup script for common scenarios
cat > scripts/cleanup_dev_files.py << 'EOF'
#!/usr/bin/env python3
"""
Development File Cleanup Script

Removes common temporary and backup files created during development.
Run this after completing any feature to clean up the workspace.
"""

import os
import glob
from pathlib import Path

def cleanup_frontend_files():
    """Clean up frontend temporary files"""
    patterns = [
        'src/frontend/*_enhanced.*',
        'src/frontend/*_temp.*',
        'src/frontend/*_old.*',
        'src/frontend/*.tmp',
    ]
    
    for pattern in patterns:
        for file_path in glob.glob(pattern):
            print(f"Removing: {file_path}")
            os.remove(file_path)

def cleanup_backend_files():
    """Clean up backend temporary files"""
    patterns = [
        'src/backend/**/*_temp.py',
        'src/backend/**/*_old.py',
        'src/backend/**/*.tmp',
    ]
    
    for pattern in patterns:
        for file_path in glob.glob(pattern, recursive=True):
            print(f"Removing: {file_path}")
            os.remove(file_path)

def verify_references():
    """Verify no broken references exist"""
    print("Checking for broken references...")
    
    # Check HTML references
    html_files = glob.glob('src/frontend/*.html')
    for html_file in html_files:
        with open(html_file, 'r') as f:
            content = f.read()
            # Check for common broken reference patterns
            if '_enhanced.' in content:
                print(f"WARNING: {html_file} contains '_enhanced.' references")
            if '_temp.' in content:
                print(f"WARNING: {html_file} contains '_temp.' references")

if __name__ == '__main__':
    print("🧹 Cleaning up development files...")
    cleanup_frontend_files()
    cleanup_backend_files()
    verify_references()
    print("✅ Cleanup complete!")
EOF

chmod +x scripts/cleanup_dev_files.py
```

#### **F. Pre-Commit Cleanup Checklist**

**MANDATORY: Before every commit, verify:**
- [ ] No temporary files committed (`*_temp.*`, `*_old.*`, `*_enhanced.*`)
- [ ] All file references in HTML/CSS/JS are correct
- [ ] No broken imports in Python files
- [ ] Application starts without 404 errors in browser console
- [ ] All functionality tested and working
- [ ] Backup files moved to safe location or documented

#### **G. File Naming Conventions**

**Use these conventions to make cleanup easier:**
```bash
# Temporary files (ALWAYS clean up)
filename_temp.ext       # Temporary working file
filename_old.ext        # Old version being replaced
filename_backup.ext     # Backup for safety
filename_enhanced.ext   # Enhanced version during development

# Permanent files (keep these)
filename.ext           # Final production file
filename_original.ext  # Original for reference (if needed)
filename_v1.ext        # Versioned file (if multiple versions needed)
```

#### **H. Common Cleanup Mistakes to Avoid**

**❌ DON'T:**
- Leave `*_enhanced.*` files after integration
- Commit temporary or backup files
- Update file contents without updating references
- Remove files without checking for dependencies
- Skip testing after cleanup

**✅ DO:**
- Always test after cleanup
- Update all references when renaming files
- Keep one backup until feature is verified working
- Document any intentional temporary files
- Use consistent naming conventions

#### **I. Emergency Rollback Procedure**

**If cleanup breaks something:**
```bash
# 1. Check git status for recent changes
git status
git log --oneline -5

# 2. Restore from git if files were committed
git checkout HEAD~1 -- src/frontend/filename.ext

# 3. Restore from backup files if available
cp src/frontend/filename_original_backup.ext src/frontend/filename.ext

# 4. Identify and fix the broken reference
grep -r "broken_filename" src/
# Update the reference to correct filename

# 5. Test thoroughly before proceeding
```

## 📋 Development Workflow

### **1. Before Starting Any Feature**

#### **A. Review Current Status**
```bash
# Check current progress
python3 scripts/track_progress.py report

# Review missing features
cat MISSING_FEATURES.md

# Check current sprint goals
cat ROADMAP.md
```

#### **B. Understand the Feature**
1. **Read the feature description** in `MISSING_FEATURES.md`
2. **Check if similar functionality exists** in original files
3. **Identify dependencies** on other features
4. **Determine priority level** (High/Medium/Low)

#### **C. Plan the Implementation**
1. **Backend changes needed** (API endpoints, data models)
2. **Frontend changes needed** (UI components, API calls)
3. **Data requirements** (new data sources, storage needs)
4. **Testing approach** (how to verify it works)

### **2. Implementation Process**

#### **A. Backend Development**
```python
# File structure to follow:
src/backend/
├── api/           # API endpoints (user.py, draft.py, rankings.py)
├── services/      # External services (sleeper_api.py)
├── utils/         # Utility functions
├── config.py      # Configuration
└── app.py         # Main Flask application
```

**API Endpoint Pattern:**
```python
@blueprint.route('/endpoint/<param>')
def endpoint_function(param):
    """
    Brief description of what this endpoint does
    
    Args:
        param: Description of parameter
    
    Returns:
        JSON response with data or error
    """
    try:
        # Input validation
        if not param:
            return jsonify({'error': 'Parameter required'}), 400
        
        # Business logic
        result = process_data(param)
        
        # Return success response
        return jsonify({
            'data': result,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'code': 'INTERNAL_ERROR'
        }), 500
```

#### **B. Frontend Development**
```javascript
// File structure to follow:
src/frontend/
├── index.html     # Main HTML structure with Shoelace components
├── app.js         # Main application class with Shoelace integration
└── style.css      # Custom styling with Shoelace theming

// CRITICAL: Always use Shoelace components for UI elements
// Our project uses Shoelace web components for professional UI
// Reference: UI_IMPROVEMENT_GUIDE.md for complete component library

// Method pattern in DraftAssistantApp class:
async methodName(param) {
    try {
        this.showLoading('Loading...');
        
        const data = await this.apiRequest(`/api/endpoint/${param}`);
        
        this.displayResults(data);
        this.showNotification('Success!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        this.showNotification('Error occurred', 'danger');
    } finally {
        this.hideLoading();
    }
}

// ALWAYS use Shoelace components instead of basic HTML:
// ❌ DON'T USE: <button class="btn">Click me</button>
// ✅ USE: <sl-button variant="primary">Click me</sl-button>

// ❌ DON'T USE: <div class="card">Content</div>
// ✅ USE: <sl-card>Content</sl-card>

// ❌ DON'T USE: <input type="text" placeholder="Search">
// ✅ USE: <sl-input placeholder="Search" clearable></sl-input>
```

#### **C. Integration Points**

**Sleeper API Integration:**
```python
# Always use the SleeperAPI class in services/sleeper_api.py
from ..services.sleeper_api import SleeperAPI, SleeperAPIError

# Follow existing patterns:
try:
    data = SleeperAPI.get_some_data(param)
    # Process data
except SleeperAPIError as e:
    # Handle API-specific errors
```

**Rankings System Integration:**
```python
# Use the SimpleRankingsManager in rankings/SimpleRankingsManager.py
from ..rankings.SimpleRankingsManager import SimpleRankingsManager

# Follow existing patterns:
rankings_manager = SimpleRankingsManager()
players = rankings_manager.get_available_players(
    drafted_players=drafted_ids,
    league_format=format,
    position_filter=position,
    limit=limit
)
```

### **3. Feature Implementation Guidelines**

#### **A. Real-Time Features (Auto-refresh, Live Updates)**
```javascript
// Use polling pattern (WebSockets for future enhancement)
class DraftAssistantApp {
    startAutoRefresh(draftId, interval = 30000) {
        this.autoRefreshInterval = setInterval(async () => {
            try {
                await this.refreshDraftData(draftId);
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        }, interval);
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
}
```

#### **B. User Interface Components**
```javascript
// CRITICAL: Always use Shoelace components for all UI elements
// Our project uses Shoelace web components for professional appearance
// Never use basic HTML elements - always use Shoelace equivalents

// Follow existing UI patterns with Shoelace components
displayComponentName(data) {
    const container = document.getElementById('container-id');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <sl-alert variant="neutral" open>
                <sl-icon slot="icon" name="info-circle"></sl-icon>
                No data available.
            </sl-alert>
        `;
        return;
    }
    
    const html = data.map(item => `
        <sl-card class="item-card" data-id="${item.id}">
            <div slot="header" class="item-header">
                <strong>${item.name}</strong>
                <sl-badge variant="primary">${item.type}</sl-badge>
            </div>
            <div class="item-details">${item.details}</div>
            <div slot="footer">
                <sl-button-group>
                    <sl-button variant="primary" size="small">
                        <sl-icon slot="prefix" name="plus"></sl-icon>
                        Add
                    </sl-button>
                    <sl-button variant="neutral" size="small">
                        <sl-icon slot="prefix" name="info-circle"></sl-icon>
                        Details
                    </sl-button>
                </sl-button-group>
            </div>
        </sl-card>
    `).join('');
    
    container.innerHTML = html;
    
    // Add event listeners for Shoelace components
    container.querySelectorAll('sl-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.target.textContent.trim();
            const itemId = e.target.closest('.item-card').dataset.id;
            this.handleItemAction(action, itemId);
        });
    });
}

// SHOELACE COMPONENT REFERENCE:
// Buttons: <sl-button variant="primary|neutral|success|warning|danger" size="small|medium|large">
// Cards: <sl-card> with slots: header, footer
// Inputs: <sl-input placeholder="..." clearable>
// Selects: <sl-select> with <sl-option> children
// Badges: <sl-badge variant="primary|neutral|success|warning|danger">
// Alerts: <sl-alert variant="primary|success|neutral|warning|danger" open closable>
// Icons: <sl-icon name="icon-name"> (use Lucide icon names)
// Loading: <sl-spinner> and <sl-progress-bar>
// Modals: <sl-dialog label="Title">
// Tabs: <sl-tab-group> with <sl-tab> and <sl-tab-panel>
```

#### **C. Data Storage and Caching**
```python
# For user preferences and persistent data
# Use simple JSON files for now, database for future
import json
from pathlib import Path

def save_user_data(user_id, data):
    """Save user-specific data"""
    data_dir = Path('data/users')
    data_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = data_dir / f'{user_id}.json'
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

def load_user_data(user_id):
    """Load user-specific data"""
    file_path = Path('data/users') / f'{user_id}.json'
    if file_path.exists():
        with open(file_path, 'r') as f:
            return json.load(f)
    return {}
```

### **4. Testing and Validation**

#### **A. Manual Testing Checklist**
```bash
# Start the application
python main.py --port 5000

# Test the feature:
# 1. Navigate to the feature in browser
# 2. Test happy path (normal usage)
# 3. Test edge cases (empty data, errors)
# 4. Test error handling (network issues)
# 5. Test on different browsers/devices
```

#### **B. API Testing**
```bash
# Test API endpoints directly
curl -s http://localhost:5000/api/endpoint | python3 -m json.tool

# Test error cases
curl -s http://localhost:5000/api/endpoint/invalid | python3 -m json.tool
```

#### **C. Integration Testing**
```python
# Test with real Sleeper data
# Use known draft IDs for testing:
# - Active draft: Check for current data
# - Completed draft: Check for historical data
# - Dynasty league: Check roster filtering
```

### **5. Documentation and Progress Tracking**

#### **A. Update Progress**
```bash
# Mark feature as completed
python3 scripts/track_progress.py complete "Feature Name"

# Generate progress report
python3 scripts/track_progress.py report
```

#### **B. Commit Message Format**
```bash
git commit -m "Implement [Feature Name] - [brief description]

🚀 Feature Implementation:
✅ [Specific change 1]
✅ [Specific change 2]
✅ [Specific change 3]

🔧 Technical Details:
✅ [Backend changes]
✅ [Frontend changes]
✅ [API endpoints added]

🧪 Testing:
✅ [Testing approach]
✅ [Edge cases covered]
✅ [Integration verified]

This implements [feature] from the original project, bringing us to
[X]/100 features completed ([X]% progress)."
```

#### **C. Update Documentation**
- Update `MISSING_FEATURES.md` to move completed features
- Update `ROADMAP.md` if priorities change
- Add any new configuration or setup steps to `README.md`

## 🔍 Common Implementation Patterns

### **1. Sleeper API Integration Pattern**
```python
# Always follow this pattern for Sleeper API calls
def get_sleeper_data(param):
    try:
        # Use existing SleeperAPI methods
        data = SleeperAPI.get_method(param)
        
        # Process and enhance data
        enhanced_data = process_data(data)
        
        return enhanced_data
        
    except SleeperAPIError as e:
        # Handle Sleeper-specific errors
        print(f"Sleeper API error: {e}")
        raise
    except Exception as e:
        # Handle general errors
        print(f"General error: {e}")
        raise
```

### **2. Rankings Integration Pattern**
```python
# Always use the rankings manager for player data
def get_player_rankings(league_format, filters):
    try:
        # Get rankings manager instance
        rankings_manager = get_rankings_manager()
        
        # Apply filters and get players
        players = rankings_manager.get_available_players(
            drafted_players=filters.get('drafted', []),
            league_format=league_format,
            position_filter=filters.get('position'),
            limit=filters.get('limit', 50)
        )
        
        return players
        
    except Exception as e:
        print(f"Rankings error: {e}")
        return []
```

### **3. Frontend State Management Pattern**
```javascript
// Maintain state in the main app class
class DraftAssistantApp {
    constructor() {
        this.state = {
            // Core state
            connected: false,
            loading: false,
            currentSection: 'welcome',
            
            // User state
            currentUser: null,
            selectedLeague: null,
            selectedDraft: null,
            
            // Feature-specific state
            autoRefreshEnabled: false,
            watchlist: [],
            userNotes: {}
        };
    }
    
    updateState(updates) {
        Object.assign(this.state, updates);
        this.onStateChange();
    }
    
    onStateChange() {
        // React to state changes
        this.updateUI();
        this.saveUserPreferences();
    }
}
```

### **4. Error Handling Pattern**
```javascript
// Consistent error handling across the application with Shoelace notifications
async handleApiCall(apiCall, errorMessage = 'Operation failed') {
    try {
        this.showLoading();
        const result = await apiCall();
        
        // Use Shoelace notification system
        this.showNotification('Success!', 'success');
        return result;
    } catch (error) {
        console.error('API call failed:', error);
        
        // Show user-friendly error with Shoelace alert
        if (error.message.includes('not found')) {
            this.showNotification('Data not found', 'warning');
        } else if (error.message.includes('network')) {
            this.showNotification('Network error - please try again', 'danger');
        } else {
            this.showNotification(errorMessage, 'danger');
        }
        
        throw error;
    } finally {
        this.hideLoading();
    }
}

// CRITICAL: Always use Shoelace notification system
showNotification(message, variant = 'primary', duration = 5000) {
    const container = document.getElementById('notification-container') || document.body;
    
    const alert = document.createElement('sl-alert');
    alert.variant = variant; // primary, success, neutral, warning, danger
    alert.closable = true;
    alert.duration = duration;
    
    // Add appropriate icon based on variant
    const iconName = {
        primary: 'info-circle',
        success: 'check-circle',
        neutral: 'info-circle', 
        warning: 'exclamation-triangle',
        danger: 'exclamation-octagon'
    }[variant] || 'info-circle';
    
    alert.innerHTML = `
        <sl-icon slot="icon" name="${iconName}"></sl-icon>
        ${message}
    `;
    
    container.appendChild(alert);
    alert.show();
    
    // Auto-remove after duration
    setTimeout(() => alert.remove(), duration);
}

// CRITICAL: Always use Shoelace loading states
showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    
    if (overlay) overlay.style.display = 'flex';
    if (text) text.textContent = message;
    
    // Use Shoelace spinner in loading overlay:
    // <sl-spinner style="font-size: 3rem;"></sl-spinner>
}
```

## 🎯 Feature-Specific Implementation Guides

### **Auto-Refresh Draft (High Priority)**

#### **Backend Changes:**
```python
# Add endpoint to check for draft updates
@draft_bp.route('/draft/<draft_id>/updates')
def get_draft_updates(draft_id):
    """Get latest draft updates with timestamp"""
    try:
        # Get current picks
        picks = SleeperAPI.get_drafted_players_with_names(draft_id)
        
        # Get last update timestamp
        last_update = max([pick.get('picked_at', 0) for pick in picks] + [0])
        
        return jsonify({
            'draft_id': draft_id,
            'picks': picks,
            'last_update': last_update,
            'total_picks': len(picks),
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

#### **Frontend Changes:**
```javascript
// Add auto-refresh functionality
async startAutoRefresh(draftId) {
    this.state.autoRefreshEnabled = true;
    this.state.lastUpdate = 0;
    
    const refreshInterval = setInterval(async () => {
        if (!this.state.autoRefreshEnabled) {
            clearInterval(refreshInterval);
            return;
        }
        
        try {
            const updates = await this.apiRequest(`/draft/${draftId}/updates`);
            
            if (updates.last_update > this.state.lastUpdate) {
                // New picks detected
                this.state.lastUpdate = updates.last_update;
                this.updateDraftDisplay(updates.picks);
                this.showNotification('Draft updated!', 'info');
            }
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }, 30000); // Check every 30 seconds
}
```

### **Custom Rankings Upload (High Priority)**

#### **Backend Changes:**
```python
# Add file upload endpoint
@rankings_bp.route('/rankings/upload', methods=['POST'])
def upload_custom_rankings():
    """Upload custom rankings CSV file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'File must be CSV format'}), 400
        
        # Process CSV file
        rankings_data = process_csv_upload(file)
        
        # Store custom rankings
        user_id = request.form.get('user_id', 'default')
        save_custom_rankings(user_id, rankings_data)
        
        return jsonify({
            'message': 'Rankings uploaded successfully',
            'players_count': len(rankings_data),
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

#### **Frontend Changes:**
```javascript
// Add file upload interface
displayRankingsUpload() {
    const uploadHtml = `
        <div class="rankings-upload">
            <h3>Upload Custom Rankings</h3>
            <form id="rankings-upload-form" enctype="multipart/form-data">
                <input type="file" id="rankings-file" accept=".csv" required>
                <button type="submit" class="btn btn-primary">Upload Rankings</button>
            </form>
        </div>
    `;
    
    document.getElementById('upload-container').innerHTML = uploadHtml;
    
    document.getElementById('rankings-upload-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRankingsUpload();
    });
}

async handleRankingsUpload() {
    const fileInput = document.getElementById('rankings-file');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', this.state.currentUser?.user_id || 'default');
    
    try {
        this.showLoading('Uploading rankings...');
        
        const response = await fetch('/api/rankings/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            this.showNotification(`Uploaded ${result.players_count} players!`, 'success');
            this.refreshRankings();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        this.showNotification('Upload failed: ' + error.message, 'error');
    } finally {
        this.hideLoading();
    }
}
```

## 🚨 Critical Guidelines

### **1. Always Preserve Existing Functionality**
- **Never break existing features** when adding new ones
- **Test existing workflows** after making changes
- **Maintain backward compatibility** in API endpoints

### **2. Follow Established Patterns**
- **Use existing code patterns** for consistency
- **Follow the same error handling** approach
- **Maintain the same UI/UX patterns**

### **3. Dynasty League Support**
- **Always consider dynasty leagues** when filtering players
- **Use `SleeperAPI.get_all_unavailable_players()`** for proper filtering
- **Test with both redraft and dynasty leagues**

### **4. Performance Considerations**
- **Cache expensive operations** (API calls, rankings processing)
- **Use pagination** for large data sets
- **Implement loading states** for better UX

### **5. Error Handling**
- **Always handle errors gracefully**
- **Provide meaningful error messages** to users
- **Log errors for debugging** but don't expose internals

## 📚 Reference Files

### **Key Files to Study:**
- `src/backend/services/sleeper_api.py` - Sleeper API integration patterns
- `src/backend/rankings/SimpleRankingsManager.py` - Rankings system usage
- `src/frontend/app.js` - Frontend architecture and patterns
- `src/backend/api/` - API endpoint patterns
- `MISSING_FEATURES.md` - Complete feature list
- `ROADMAP.md` - Implementation priorities

### **Original Project References:**
- `src/backend/rankings/PlayerRankings.py` - Original player data structure
- `src/backend/rankings/BestAvailable.py` - Original best available logic
- `src/backend/rankings/RankingsUtil.py` - Original utility functions
- `src/backend/rankings/Constants.py` - Original constants and mappings

## 🎯 Success Criteria

### **For Each Feature Implementation:**
1. **✅ Functionality works** as described in MISSING_FEATURES.md
2. **✅ Integrates properly** with existing system
3. **✅ Handles errors gracefully** with user-friendly messages
4. **✅ Maintains performance** (reasonable response times)
5. **✅ Works on all platforms** (Windows, macOS, Linux)
6. **✅ Mobile responsive** (works on mobile devices)
7. **✅ Progress tracked** (feature marked complete, progress updated)

### **Quality Gates:**
- **Manual testing completed** on multiple scenarios
- **Error cases tested** and handled properly
- **Integration with existing features verified**
- **Performance acceptable** (< 3 seconds for most operations)
- **Documentation updated** (progress tracking, commit messages)

---

**This guide should be referenced before implementing any new feature to ensure consistency, quality, and proper integration with the existing system.**

**Last Updated**: August 2, 2025
**Version**: V2.0.0
**Status**: Active Development Guide
