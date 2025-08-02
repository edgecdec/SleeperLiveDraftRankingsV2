# AI Quick Reference Card - Fantasy Football Draft Assistant V2

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

### **Frontend Method Pattern:**
```javascript
async methodName(param) {
    try {
        this.showLoading('Loading...');
        const data = await this.apiRequest(`/api/endpoint/${param}`);
        this.displayResults(data);
        this.showNotification('Success!', 'success');
    } catch (error) {
        this.showNotification('Error occurred', 'error');
    } finally {
        this.hideLoading();
    }
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
- Follow existing UI patterns in `app.js`
- Test with both redraft and dynasty leagues
- Update progress: `python3 scripts/track_progress.py complete "Feature"`

### **❌ Never Do:**
- Break existing functionality
- Bypass dynasty league filtering
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

### **UI Component Pattern:**
```javascript
displayComponentName(data) {
    const container = document.getElementById('container-id');
    if (!data?.length) {
        container.innerHTML = '<div class="no-data">No data available.</div>';
        return;
    }
    
    const html = data.map(item => `
        <div class="item-card" data-id="${item.id}">
            <div class="item-name">${item.name}</div>
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

## 🎯 High Priority Features (Sprint 1)

1. **Auto-Refresh Draft** - Real-time draft updates
2. **Draft Board View** - Visual draft representation  
3. **Player Search** - Find players quickly
4. **Custom Rankings Upload** - User's own rankings
5. **Watchlist/Queue** - Personal draft management

## 📚 Key Reference Files

- `AI_DEVELOPMENT_GUIDE.md` - Complete implementation guide
- `MISSING_FEATURES.md` - All features to implement
- `ROADMAP.md` - Sprint planning and priorities
- `src/frontend/app.js` - Frontend patterns
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
