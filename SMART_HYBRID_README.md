# ⚠️ DEPRECATED - See UNIFIED_RECOMMENDATION_SYSTEM.md

This document describes the previous smart hybrid recommendation system. 

**The system has been unified and improved. Please refer to:**
- **[UNIFIED_RECOMMENDATION_SYSTEM.md](UNIFIED_RECOMMENDATION_SYSTEM.md)** - Current unified system documentation
- **[README.md](README.md)** - Updated main documentation

## Key Changes in Unified System

### **Improvements Made**
- ✅ Single `/api/v1/recommendations` endpoint (was `/smart-recommendations`)
- ✅ Enhanced analytics with learning streaks and topic mastery
- ✅ Percentage-based topic mastery (scales with content)
- ✅ Sophisticated user classification (breadth + depth)
- ✅ 294+ comprehensive tests
- ✅ Dynamic database-driven calculations

### **Removed Complexity**
- ❌ Multiple competing endpoints
- ❌ Hardcoded topic counts and thresholds
- ❌ Separate analytics calculations
- ❌ Complex hybrid fallback logic

---

# Legacy Documentation (For Reference Only)

*The content below represents the deprecated smart hybrid system and is preserved for historical reference only.*

---

# 🧠 Smart Hybrid Recommendations System

## Overview

The Smart Hybrid Recommendations system combines the best of both worlds: **intelligent caching** for performance and **adaptive learning** for personalization. It provides users with curated daily problem sets that evolve based on their progress while maintaining excellent user experience through smart caching strategies.

**🔄 This system replaces and consolidates:**
- ❌ Original Daily Recommendations (`/api/v1/solveHistory/:userId/daily-recommendations`)
- ❌ Adaptive Recommendations (`/api/v1/adaptive-recommendations/:userId/daily`)
- ✅ **Smart Hybrid** (`/api/v1/smart-recommendations/:userId/daily`) - **Current Active System**

## 🏗️ Architecture

### Core Components

1. **DailyRecommendationBatch Model** - Stores cached recommendation batches
2. **Smart Controller** - Handles hybrid logic and refresh decisions  
3. **Adaptive Engine** - Generates personalized recommendations
4. **Frontend Components** - Smart UI with progress tracking

### Data Flow

```
User Request → Check Cache → Generate/Refresh → Store Batch → Return Results
                ↓
            Smart Refresh Logic
                ↓
        Keep Relevant + Add New Questions
```

## 🔄 Smart Hybrid Logic

### Caching Strategy

**Daily Batches**: Each user gets one recommendation batch per day that persists until:
- User completes 2+ questions (triggers refresh)
- 6+ hours pass since generation
- All questions completed
- Manual refresh requested (with cooldown)

**Smart Refresh**: Instead of generating completely new recommendations:
- ✅ **Keep relevant questions** from current batch
- 🆕 **Add new questions** to fill gaps
- 🏷️ **Mark carried-over** questions for tracking
- 📊 **Update analysis** with latest user data

### Refresh Conditions

```javascript
const shouldRefresh = (
    questionsCompleted >= 2 ||
    timeSinceGeneration > 6_hours ||
    allQuestionsCompleted ||
    batchMarkedStale
) && !recentRefresh_within_1_hour;
```

## 📊 Progress Tracking

### Batch Progress
- **Total Questions**: Number in current batch
- **Completed**: Questions marked as done
- **Percentage**: Visual progress indicator
- **Completion Status**: Daily goal achievement

### User Analytics
- **Level Classification**: Beginner/Intermediate/Advanced
- **Weak Areas**: Topics needing reinforcement
- **Strong Areas**: User's strengths
- **Recent Activity**: Weekly engagement metrics

## 🎯 Recommendation Strategies

### Strategy Mix (Adaptive Weights)
1. **Weak Area Reinforcement** (30-50%): Target improvement areas
2. **Progressive Difficulty** (20-30%): Gradual challenge increase
3. **Spaced Repetition** (10-20%): Review struggling questions
4. **Topic Exploration** (10-20%): Discover new areas
5. **General Practice** (10-30%): Quality baseline questions

### Smart Filtering
When refreshing, questions are kept if they're still:
- High priority strategies (spaced repetition)
- Relevant to current weak areas
- Appropriate difficulty level
- Not low-priority exploration

## 🛠️ API Endpoints

### Get Smart Daily Recommendations
```
GET /api/v1/smart-recommendations/:userId/daily?count=5&forceRefresh=false
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "question": { /* Question object */ },
        "reason": "🎯 Strengthen weak area: Arrays",
        "priority": "high",
        "strategy": "weak_area_reinforcement",
        "adaptiveContext": {
          "weightUsed": 0.4,
          "isCarriedOver": false,
          "originalBatchTime": "2024-01-15T10:00:00Z"
        }
      }
    ],
    "analysis": {
      "userLevel": "intermediate",
      "totalSolved": 45,
      "weakAreas": ["Dynamic Programming", "Trees"],
      "strongAreas": ["Arrays", "Strings"],
      "recentActivity": 3
    },
    "progress": {
      "total": 5,
      "completed": 2,
      "remaining": 3,
      "percentage": 40,
      "isComplete": false
    },
    "batchInfo": {
      "generatedAt": "2024-01-15T10:00:00Z",
      "refreshCount": 1,
      "batchType": "refresh",
      "canRefresh": false,
      "nextRefreshAvailable": "2024-01-15T16:00:00Z"
    }
  }
}
```

### Mark Question Completed
```
POST /api/v1/smart-recommendations/:userId/complete
```

**Body:**
```json
{
  "questionId": "question-id",
  "timeSpent": 300,
  "success": true
}
```

## 🎨 Frontend Features

### Smart Daily Recommendations Component

**Features:**
- 📊 Real-time progress tracking
- 🔄 Smart refresh with validation
- 🎯 Priority indicators for questions
- 💡 AI reasoning for each recommendation
- ✅ Quick completion marking
- 📈 Learning analytics display

**Props:**
```javascript
<SmartDailyRecommendations 
  selectedUserId={userId}  // User to generate recommendations for
/>
```

### Enhanced Question Table

**Smart Mode Features:**
- 🏷️ Priority indicators (high/medium/low)
- 💡 Reasoning badges for each question
- ✅ Quick "Mark Complete" buttons
- 🎨 Enhanced styling for smart context

**Props:**
```javascript
<QuestionTable 
  questions={questions}
  showHeaders={false}
  showProgress={true}
  onQuestionCompleted={handleCompletion}
  isSmartMode={true}
/>
```

## 🔧 Configuration

### Environment Variables
```bash
# MongoDB connection for batch storage
MONGODB_URI=mongodb://localhost:27017/prepalgo

# Cache settings (optional)
BATCH_EXPIRY_HOURS=24
REFRESH_COOLDOWN_MINUTES=60
```

### Adaptive Weights (Auto-configured)
```javascript
// Beginner weights
{
  weak_area_reinforcement: 0.5,
  progressive_difficulty: 0.3,
  general_practice: 0.2
}

// Advanced weights  
{
  weak_area_reinforcement: 0.3,
  spaced_repetition: 0.2,
  progressive_difficulty: 0.2,
  topic_exploration: 0.2,
  general_practice: 0.1
}
```

## 📱 User Experience

### First-Time Users
1. **Beginner batch** generated with easy questions
2. **Basic analysis** with limited data
3. **Gentle introduction** to different topics

### Returning Users
1. **Smart analysis** of solve history
2. **Personalized recommendations** based on patterns
3. **Progress-aware** difficulty progression
4. **Intelligent caching** for instant loading

### Daily Workflow
1. **Morning**: Fresh daily batch ready
2. **Progress**: Track completion throughout day
3. **Refresh**: Smart updates as user progresses
4. **Evening**: Batch expires, fresh one tomorrow

## 🚀 Performance Benefits

### Caching Advantages
- ⚡ **Instant loading** for returning users
- 🔄 **Smart refresh** instead of full regeneration
- 📊 **Persistent progress** tracking
- 💾 **Reduced database** queries

### User Experience
- 🎯 **Consistent recommendations** throughout day
- 📈 **Visible progress** tracking
- 🔄 **Meaningful refreshes** only when needed
- ⏰ **No waiting** for AI generation

## 🧪 Testing

### Test Script
```bash
cd backend
node scripts/testSmartRecommendations.js
```

**Test Coverage:**
- ✅ User profile creation/retrieval
- ✅ Daily batch generation
- ✅ Smart refresh logic
- ✅ Progress tracking
- ✅ Completion handling
- ✅ Cleanup operations

### Manual Testing
1. **Login** to get personalized recommendations
2. **Complete questions** to trigger refresh
3. **Verify progress** tracking works
4. **Test refresh** cooldown logic
5. **Check analytics** accuracy

## 🔮 Future Enhancements

### Planned Features
- 🎯 **Difficulty adaptation** based on success rate
- ⏰ **Time-based optimization** (morning vs evening)
- 🏆 **Achievement system** integration
- 📊 **Advanced analytics** dashboard
- 🔔 **Smart notifications** for optimal practice times

### Scalability
- 📈 **Batch processing** for multiple users
- 🔄 **Background refresh** jobs
- 📊 **Analytics aggregation** for insights
- 🚀 **Performance monitoring** and optimization

## 🎉 Getting Started

1. **Ensure backend is running** with Smart Recommendations routes
2. **Login to your account** for personalized recommendations  
3. **Visit the home page** to see your smart daily batch
4. **Complete questions** and watch the system adapt
5. **Use refresh** when you want new challenges

The Smart Hybrid system learns from your progress and provides an increasingly personalized experience while maintaining excellent performance through intelligent caching! 