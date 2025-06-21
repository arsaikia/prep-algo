# 📊 Tracking Implementation Guide

## Overview
This document explains how to track the new fields we added to the SolveHistory data model for enhanced analytics and recommendations.

## 🔄 New Fields Tracking Strategy

### **1. 📅 Automatic Fields (Already Implemented)**
These fields are tracked automatically by the backend:

```javascript
// firstSolvedAt - Set automatically on first solve
// lastUpdatedAt - Updated on every solve
// solveCount - Incremented on each attempt
```

### **2. ⏱️ Time Tracking (`averageTimeToSolve`)**

**Backend Implementation:**
- Enhanced `updateSolveHistory` controller to accept `timeSpent` parameter
- Calculates running average: `newAverage = (currentTotal + newTime) / totalSessions`
- Stores individual session times in `solveHistory` array

**Frontend Integration:**
```javascript
// Using the TimeTracker utility
import { useTimeTracker } from '../utils/timeTracker';

const QuestionComponent = ({ question, userId }) => {
    const { startTracking, stopTracking, currentTime } = useTimeTracker();
    
    // Start timing when question loads
    useEffect(() => {
        startTracking(question._id, userId);
    }, [question, userId]);
    
    // Stop timing and submit data
    const handleSubmit = async (success = true) => {
        const sessionData = await stopTracking(success, difficultyRating, tags);
        // Data automatically sent to backend
    };
};
```

### **3. ⭐ Difficulty Rating (`difficulty_rating`)**

**How to Track:**
- Present 1-5 scale rating after each solve attempt
- Store user's perceived difficulty (different from question's official difficulty)
- Used for personalized difficulty progression

**Implementation:**
```javascript
// Frontend component with rating buttons
const DifficultyRating = ({ onRatingChange }) => {
    return (
        <div className="difficulty-rating">
            <label>How difficult was this for you?</label>
            {[1, 2, 3, 4, 5].map(rating => (
                <button 
                    key={rating}
                    onClick={() => onRatingChange(rating)}
                >
                    {rating}
                </button>
            ))}
        </div>
    );
};
```

### **4. 🏷️ Tags (`tags` array)**

**Tag Categories:**
- **Algorithm Types**: `array`, `string`, `tree`, `graph`, `dynamic-programming`
- **Techniques**: `two-pointers`, `sliding-window`, `binary-search`, `backtracking`
- **Experience**: `struggled`, `easy-solve`, `multiple-attempts`, `learned-new-concept`
- **Data Structures**: `hash-table`, `stack`, `queue`, `heap`, `trie`

**Auto-tagging Logic:**
```javascript
// Automatic tag detection based on question content
const detectTags = (question) => {
    const autoTags = [];
    
    // Based on question title/description
    if (question.title.toLowerCase().includes('array')) autoTags.push('array');
    if (question.title.toLowerCase().includes('tree')) autoTags.push('tree');
    
    // Based on question category
    if (question.category === 'Dynamic Programming') autoTags.push('dynamic-programming');
    
    return autoTags;
};
```

### **5. 📝 Detailed Session History (`solveHistory` array)**

**Session Data Structure:**
```javascript
{
    solvedAt: Date,
    timeSpent: Number, // minutes
    success: Boolean,
    hints_used: Number,
    attempts: Number,
    code_runs: Number
}
```

## 🔧 Implementation Steps

### **Step 1: Backend API Enhancement**
✅ **Already completed** - Enhanced `updateSolveHistory` controller

### **Step 2: Frontend Time Tracking**
✅ **Already completed** - Created `timeTracker.js` utility

### **Step 3: UI Integration**

**Required Components:**
1. **Timer Display** - Shows current session time
2. **Difficulty Rating** - 1-5 scale buttons
3. **Tag Selection** - Multi-select tag interface
4. **Session Summary** - Post-solve feedback modal

### **Step 4: Data Collection Points**

**When to Collect Data:**
- ⏱️ **Time**: Start when question opens, stop when submitted
- ⭐ **Rating**: Collect after each solve attempt
- 🏷️ **Tags**: Mix of auto-detection and user selection
- 📊 **Success**: Track completion vs. giving up

## 📈 Usage Examples

### **Basic Integration:**
```javascript
// In your question solving component
import { useTimeTracker } from '../utils/timeTracker';

const handleQuestionComplete = async (success) => {
    const sessionData = await stopTracking(
        success,           // boolean
        difficultyRating,  // 1-5
        selectedTags       // array of strings
    );
    
    // sessionData automatically sent to backend
    console.log('Session completed:', sessionData);
};
```

### **Advanced Tracking:**
```javascript
// Track additional metrics
const trackAdvancedMetrics = () => {
    timeTracker.addTags(['struggled', 'multiple-attempts']);
    timeTracker.setDifficultyRating(4);
    
    // Custom metrics
    const metrics = {
        hintsUsed: 2,
        codeRuns: 5,
        attempts: 3
    };
    
    // Include in session data
    return { ...sessionData, ...metrics };
};
```

## 🎯 Benefits of Enhanced Tracking

### **For Users:**
- 📊 **Personal Analytics**: See time trends and improvement
- 🎯 **Better Recommendations**: More accurate difficulty matching
- 📈 **Progress Tracking**: Visual learning progression

### **For the System:**
- 🤖 **Smarter Algorithms**: Better recommendation engine
- 📊 **Data Insights**: Understanding user behavior patterns
- 🔧 **Optimization**: Improve question difficulty calibration

## 🚀 Next Steps

1. **Integrate** time tracking into existing question components
2. **Add** rating and tagging UI elements
3. **Test** data collection and storage
4. **Analyze** collected data for recommendation improvements
5. **Iterate** based on user feedback

## 🔍 Monitoring & Analytics

**Key Metrics to Track:**
- Average solve times by difficulty
- User difficulty rating accuracy
- Most common tag combinations
- Success rates over time
- Time improvement trends

**Dashboard Queries:**
```javascript
// Example analytics queries
const getUserAnalytics = async (userId) => {
    const history = await SolveHistory.find({ userId });
    
    return {
        averageTime: calculateAverageTime(history),
        difficultyProgression: trackDifficultyProgression(history),
        strongTopics: identifyStrongTopics(history),
        improvementAreas: identifyWeakAreas(history)
    };
};
```

---

## 📞 Implementation Support

**Files to Reference:**
- `backend/controller/solveHistory.js` - Enhanced API endpoint
- `frontend/src/utils/timeTracker.js` - Time tracking utility
- `backend/models/SolveHistory.js` - Updated data model
- `DAILY_RECOMMENDATIONS_README.md` - Algorithm details

**Key Integration Points:**
1. Question solving components
2. Code sandbox/editor
3. Practice session pages
4. Daily recommendations system 