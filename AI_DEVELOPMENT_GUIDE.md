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
- **Location**: Files in `src/backend/rankings/` show original structure
- **Key Files**: `PlayerRankings.py`, `BestAvailable.py`, `RankingsUtil.py`, `Constants.py`
- **Functionality**: Command-line tool with CSV rankings and Sleeper API

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
├── index.html     # Main HTML structure
├── app.js         # Main application class
└── style.css      # All styling

// Method pattern in DraftAssistantApp class:
async methodName(param) {
    try {
        this.showLoading('Loading...');
        
        const data = await this.apiRequest(`/api/endpoint/${param}`);
        
        this.displayResults(data);
        this.showNotification('Success!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        this.showNotification('Error occurred', 'error');
    } finally {
        this.hideLoading();
    }
}
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
// Follow existing UI patterns
displayComponentName(data) {
    const container = document.getElementById('container-id');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No data available.</div>';
        return;
    }
    
    const html = data.map(item => `
        <div class="item-card" data-id="${item.id}">
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-details">${item.details}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Add event listeners
    container.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', (e) => {
            this.handleItemClick(e.target.dataset.id);
        });
    });
}
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
// Consistent error handling across the application
async handleApiCall(apiCall, errorMessage = 'Operation failed') {
    try {
        this.showLoading();
        const result = await apiCall();
        this.showNotification('Success!', 'success');
        return result;
    } catch (error) {
        console.error('API call failed:', error);
        
        // Show user-friendly error
        if (error.message.includes('not found')) {
            this.showNotification('Data not found', 'warning');
        } else if (error.message.includes('network')) {
            this.showNotification('Network error - please try again', 'error');
        } else {
            this.showNotification(errorMessage, 'error');
        }
        
        throw error;
    } finally {
        this.hideLoading();
    }
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
