# AI Quick Reference Card - Fantasy Football Draft Assistant V2

## 🎨 UI Development - ALWAYS Use Shoelace Components

### **CRITICAL: Our project uses Shoelace web components for professional UI**
```html
<!-- ❌ NEVER use basic HTML elements -->
<button class="btn">Click me</button>
<div class="card">Content</div>
<input type="text" placeholder="Search">

<!-- ✅ ALWAYS use Shoelace components -->
<sl-button variant="primary">Click me</sl-button>
<sl-card>Content</sl-card>
<sl-input placeholder="Search" clearable></sl-input>
```

### **Essential Shoelace Components:**
```html
<!-- Buttons -->
<sl-button variant="primary|neutral|success|warning|danger" size="small|medium|large">
    <sl-icon slot="prefix" name="icon-name"></sl-icon>
    Button Text
</sl-button>

<!-- Cards -->
<sl-card class="custom-class">
    <div slot="header">Header Content</div>
    Body Content
    <div slot="footer">Footer Content</div>
</sl-card>

<!-- Form Inputs -->
<sl-input label="Label" placeholder="Placeholder" clearable></sl-input>
<sl-select label="Select" clearable>
    <sl-option value="option1">Option 1</sl-option>
</sl-select>

<!-- Notifications -->
<sl-alert variant="success|warning|danger|neutral" open closable>
    <sl-icon slot="icon" name="check-circle"></sl-icon>
    Message text
</sl-alert>

<!-- Loading States -->
<sl-spinner style="font-size: 3rem;"></sl-spinner>
<sl-progress-bar value="75" label="Loading..."></sl-progress-bar>

<!-- Badges -->
<sl-badge variant="primary|neutral|success|warning|danger">Badge Text</sl-badge>

<!-- Modals -->
<sl-dialog label="Dialog Title">
    Content
    <div slot="footer">
        <sl-button variant="neutral">Cancel</sl-button>
        <sl-button variant="primary">Confirm</sl-button>
    </div>
</sl-dialog>
```

### **Player Card Template (Always Use This):**
```html
<sl-card class="player-card" data-player-id="${player.player_id}">
    <div slot="header" class="player-header">
        <strong>${player.name}</strong>
        <sl-badge variant="primary" class="position-${player.position.toLowerCase()}">
            ${player.position}
        </sl-badge>
        <sl-badge variant="neutral">${player.team}</sl-badge>
    </div>
    
    <div class="player-stats">
        <div class="stat-item">
            <span class="stat-label">Rank</span>
            <span class="stat-value">${player.rank}</span>
        </div>
    </div>
    
    <div slot="footer">
        <sl-button-group>
            <sl-button variant="primary" size="small">
                <sl-icon slot="prefix" name="plus"></sl-icon>
                Queue
            </sl-button>
            <sl-button variant="neutral" size="small">
                <sl-icon slot="prefix" name="info-circle"></sl-icon>
                Details
            </sl-button>
        </sl-button-group>
    </div>
</sl-card>
```

## 🧹 File Cleanup (CRITICAL)

### **Always Clean Up After Development:**
```bash
# MANDATORY: Remove temporary files after feature completion
rm src/frontend/*_enhanced.*     # Enhanced versions after integration
rm src/frontend/*_backup.*       # Backup files after verification  
rm src/frontend/*_temp.*         # Temporary files
rm src/frontend/*_old.*          # Old versions

# CRITICAL: Verify file references after cleanup
grep -r "enhanced\|temp\|old" src/frontend/*.html
# Update any broken references found
```

### **Pre-Commit Checklist:**
- [ ] No temporary files committed (`*_temp.*`, `*_enhanced.*`, `*_old.*`)
- [ ] All file references in HTML/CSS/JS are correct
- [ ] Application starts without 404 errors in console
- [ ] All functionality tested and working

### **Common Cleanup Mistake:**
```bash
# ❌ DON'T: Leave references to deleted files
<link rel="stylesheet" href="style_enhanced.css">  # File deleted!

# ✅ DO: Update references to final files  
<link rel="stylesheet" href="style.css">           # Correct reference
```

## 🐛 User Bug Reports & Feature Requests

### **When User Reports a Bug:**
```bash
# 1. Acknowledge and gather details
# 2. Add to tracking system immediately
python3 scripts/track_progress.py add "Fix: [Bug Description]" "🐛 Bug Fixes"

# 3. Prioritize by severity:
# 🔥 Critical: Fix immediately (crashes, data loss)
# ⚠️ High: Fix in current sprint (core functionality broken)
# 📋 Medium: Fix in next sprint (workaround available)
# 📝 Low: Fix when convenient (minor issues)
```

### **When User Suggests Feature:**
```bash
# 1. Thank user and ask clarifying questions
# 2. Add to feature list with proper category
python3 scripts/track_progress.py add "[Feature Name]" "[Category]"

# 3. Assess priority:
# High: Multiple users want it, easy to implement, high impact
# Medium: Nice enhancement, moderate complexity
# Low: Niche use case, high complexity, low impact
```

### **Response Templates:**

**Bug Report Response:**
```
Thank you for reporting this! 

🐛 **Bug Confirmed**: [Description]
✅ Added to tracking system
✅ [Workaround if available]
**Timeline**: [Based on severity]
```

**Feature Request Response:**
```
Great suggestion!

💡 **Feature Request**: [Description]  
✅ Added to roadmap as [Priority] priority
✅ [Implementation thoughts]
**Timeline**: [Rough estimate]
```

## 🚀 Before Starting Any Feature

```bash
# 1. Check current progress
python3 scripts/track_progress.py report

# 2. Review the feature in MISSING_FEATURES.md
# 3. Check ROADMAP.md for sprint priorities
# 4. Study AI_DEVELOPMENT_GUIDE.md for detailed patterns
```

## 📁 File Structure

```
src/
├── backend/
│   ├── api/           # API endpoints (user.py, draft.py, rankings.py)
│   ├── services/      # External services (sleeper_api.py)
│   ├── rankings/      # Rankings system (SimpleRankingsManager.py)
│   └── app.py         # Main Flask app
└── frontend/
    ├── index.html     # Main HTML
    ├── app.js         # Main JS class (DraftAssistantApp)
    └── style.css      # All styles
```

## 🔧 Essential Patterns

### **API Endpoint Pattern:**
```python
@blueprint.route('/endpoint/<param>')
def endpoint_function(param):
    try:
        # Validate input
        if not param:
            return jsonify({'error': 'Required'}), 400
        
        # Business logic
        result = process_data(param)
        
        # Return success
        return jsonify({'data': result, 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}, 500
```

### **Frontend Method Pattern (Always Use Shoelace):**
```javascript
async methodName(param) {
    try {
        this.showLoading('Loading...');
        const data = await this.apiRequest(`/api/endpoint/${param}`);
        this.displayResults(data);
        
        // Use Shoelace notification system
        this.showNotification('Success!', 'success');
    } catch (error) {
        // Use Shoelace notification system
        this.showNotification('Error occurred', 'danger');
    } finally {
        this.hideLoading();
    }
}

// CRITICAL: Always use Shoelace notification system
showNotification(message, variant = 'primary') {
    const alert = document.createElement('sl-alert');
    alert.variant = variant; // primary, success, neutral, warning, danger
    alert.closable = true;
    alert.innerHTML = `
        <sl-icon slot="icon" name="info-circle"></sl-icon>
        ${message}
    `;
    document.body.appendChild(alert);
    alert.show();
    setTimeout(() => alert.remove(), 5000);
}
```

### **Sleeper API Integration:**
```python
from ..services.sleeper_api import SleeperAPI, SleeperAPIError

try:
    data = SleeperAPI.get_some_data(param)
except SleeperAPIError as e:
    # Handle API errors
```

### **Rankings Integration:**
```python
rankings_manager = SimpleRankingsManager()
players = rankings_manager.get_available_players(
    drafted_players=drafted_ids,
    league_format=format,
    position_filter=position,
    limit=limit
)
```

## 🎯 Critical Rules

### **✅ Always Do:**
- Use existing `SleeperAPI` class for all Sleeper calls
- Use `SimpleRankingsManager` for player rankings
- Handle dynasty leagues with `get_all_unavailable_players()`
- **ALWAYS use Shoelace components for ALL UI elements**
- Follow existing UI patterns in `app.js`
- Test with both redraft and dynasty leagues
- Update progress: `python3 scripts/track_progress.py complete "Feature"`

### **❌ Never Do:**
- Break existing functionality
- Bypass dynasty league filtering
- **Use basic HTML elements instead of Shoelace components**
- Create new API patterns without following existing ones
- Skip error handling
- Forget to update progress tracking

## 🏈 Dynasty League Support

```python
# Always use this for proper player filtering:
unavailable_players, is_dynasty = SleeperAPI.get_all_unavailable_players(draft_id, league_id)

# This handles both:
# - Redraft: Only drafted players filtered
# - Dynasty: Drafted + rostered players filtered
```

## 📊 Testing Checklist

```bash
# 1. Start app
python main.py --port 5000

# 2. Test in browser:
# - Happy path (normal usage)
# - Edge cases (empty data, errors)
# - Dynasty vs redraft leagues
# - Mobile responsiveness

# 3. Test API directly:
curl -s http://localhost:5000/api/endpoint | python3 -m json.tool
```

## 📝 Commit Message Format

```bash
git commit -m "Implement [Feature Name] - [brief description]

🚀 Feature Implementation:
✅ [Specific change 1]
✅ [Specific change 2]

🔧 Technical Details:
✅ [Backend/Frontend changes]

🧪 Testing:
✅ [Testing completed]

Progress: [X]/100 features ([X]%)"
```

## 🔍 Common Integration Points

### **Frontend State Management:**
```javascript
// In DraftAssistantApp class
this.state = {
    connected: false,
    currentUser: null,
    selectedDraft: null,
    // Add feature-specific state here
};

this.updateState({newProperty: value});
```

### **UI Component Pattern (Always Use Shoelace):**
```javascript
displayComponentName(data) {
    const container = document.getElementById('container-id');
    if (!data?.length) {
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
            <div slot="header">
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
                </sl-button-group>
            </div>
        </sl-card>
    `).join('');
    
    container.innerHTML = html;
    
    // Add Shoelace event listeners
    container.querySelectorAll('sl-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = e.target.closest('.item-card').dataset.id;
            this.handleItemClick(itemId);
        });
    });
}
```

## 🎯 High Priority Features (Sprint 1)

1. **Auto-Refresh Draft** - Real-time draft updates
2. **Draft Board View** - Visual draft representation  
3. **Player Search** - Find players quickly
4. **Custom Rankings Upload** - User's own rankings
5. **Watchlist/Queue** - Personal draft management

## 📚 Key Reference Files

- `AI_DEVELOPMENT_GUIDE.md` - Complete implementation guide
- `UI_IMPROVEMENT_GUIDE.md` - **Shoelace component library guide**
- `MISSING_FEATURES.md` - All features to implement
- `ROADMAP.md` - Sprint planning and priorities
- **Original Project**: `/Users/edeclan/FantasyFootballTest/SleeperLiveDraftRankings`
- **Current Project**: `/Users/edeclan/FantasyFootballTest/SleeperLiveDraftRankingsV2`
- `src/frontend/app.js` - Frontend patterns
- `src/frontend/index_enhanced.html` - **Enhanced HTML with Shoelace**
- `src/frontend/style_enhanced.css` - **Enhanced CSS with theming**
- `src/frontend/app_enhanced.js` - **Enhanced JS with Shoelace integration**
- `src/backend/services/sleeper_api.py` - API patterns
- `src/backend/rankings/SimpleRankingsManager.py` - Rankings patterns

## 🚨 Emergency Debugging

```bash
# Check logs
tail -f logs/app.log

# Test API health
curl http://localhost:5000/api/health

# Check rankings system
python3 -c "from src.backend.rankings.SimpleRankingsManager import SimpleRankingsManager; print(SimpleRankingsManager().get_available_formats())"

# Verify Sleeper API
python3 -c "from src.backend.services.sleeper_api import SleeperAPI; print(SleeperAPI.get_user('edgecdec'))"
```

---

**📋 Remember: Always check AI_DEVELOPMENT_GUIDE.md for detailed patterns and examples!**

**Current Progress: 22/100 features (22%) - Sprint 1 Focus: Live Draft Experience**
