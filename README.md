# RemindMe - Intelligent Coding Practice Platform

A personalized coding practice platform that provides smart daily question recommendations based on your learning patterns, progress tracking, and adaptive difficulty adjustment.

## 🚀 Features

### 🎯 **Unified Smart Recommendation System**
- **Dynamic Learning Analytics**: Real-time progress tracking with streak calculation and topic mastery levels
- **Percentage-Based Topic Mastery**: 5-level progression system (Beginner → Learning → Practicing → Proficient → Mastered)
- **Adaptive User Classification**: Dynamic skill assessment based on topic breadth and mastery depth
- **Personalized Recommendations**: AI-driven question selection using multiple strategies:
  - Weak Area Reinforcement
  - Progressive Difficulty
  - Spaced Repetition
  - Topic Exploration
  - General Practice

### 📊 **Enhanced Analytics Dashboard**
- **Learning Streaks**: Current and longest streak tracking with daily activity monitoring
- **Topic Mastery Progress**: Visual progress bars with coverage percentages for each topic
- **Focus Areas**: Intelligent identification of weak areas needing attention
- **Performance Insights**: Comprehensive analytics including solve rates, attempt efficiency, and learning velocity

### 🎨 **Modern UI/UX**
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark/Light Theme**: Seamless theme switching with user preferences
- **Interactive Components**: Animated progress indicators and smooth transitions
- **Color-Coded Progress**: Intuitive visual feedback for different mastery levels

### 🔧 **Technical Features**
- **Real-time Updates**: Live progress tracking and recommendation updates
- **Smart Caching**: Efficient batch processing with selective refresh capabilities
- **Dynamic Scaling**: Database-driven topic counts that automatically adapt to new content
- **Comprehensive Testing**: 296+ automated tests ensuring system reliability

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Unified API**: Single `/api/v1/recommendations` endpoint for all recommendation needs
- **Dynamic Analytics**: Database-driven calculations for scalable topic management
- **Smart Caching**: Intelligent batch management with selective refresh strategies
- **MongoDB Integration**: Efficient data storage and aggregation pipelines

### Frontend (React)
- **Component-Based**: Modular design with reusable analytics components
- **State Management**: Redux for consistent application state
- **API Integration**: Seamless communication with recommendation engine
- **Theme System**: Comprehensive color system with dynamic theming

## 📈 User Classification System

The platform uses a sophisticated classification system that considers both **breadth** and **depth** of knowledge:

### 🔥 **Advanced Users**
- 60+ questions solved across 40%+ of available topics
- Multiple mastered topics (25%+ mastery rate) with 50%+ proficient+mastered topics
- OR 2+ mastered + 3+ proficient topics
- OR 15%+ hard problems with 2+ mastered topics

### ⚡ **Intermediate Users**  
- 25+ questions solved across 25%+ of available topics
- 1+ mastered topic with 3+ proficient/practicing topics
- OR 35%+ medium performance across 30%+ topics
- OR 8%+ hard problems across 20%+ topics

### 🌱 **Beginner Users**
- < 25 questions OR < 25% topic breadth OR no topic mastery

## 🎯 Topic Mastery Levels

### **Mastered** (🏆)
- 80%+ topic coverage + 90%+ solve rate + ≤2.5 avg attempts

### **Proficient** (⭐)
- 60%+ topic coverage + 85%+ solve rate + ≤3.0 avg attempts

### **Practicing** (📈)
- 40%+ topic coverage + 75%+ solve rate

### **Learning** (📚)
- 15%+ topic coverage OR 3+ questions attempted

### **Beginner** (🌱)
- < 15% topic coverage AND < 3 questions attempted

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- React 18+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/remind-me.git
   cd remind-me
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Database Setup**
   ```bash
   # Sync questions from JSON data
   cd backend
   node scripts/syncQuestionsFromJson.js
   
   # Create test users with realistic learning patterns
   node scripts/createTestUsers.js
   ```

## 📚 API Documentation

### **Unified Recommendation Endpoint**

#### Get Daily Recommendations
```http
GET /api/v1/recommendations/{userId}/daily?count=5&forceRefresh=false
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "analysis": {
      "userLevel": "advanced",
      "totalSolved": 85,
      "streakInfo": {
        "currentStreak": 7,
        "longestStreak": 12,
        "totalActiveDays": 45
      },
      "topicMastery": [
        {
          "topic": "Two Pointers",
          "level": "mastered",
          "topicCoveragePercentage": 100,
          "progress": {
            "percentage": 100,
            "completed": 5,
            "total": 5
          }
        }
      ],
      "weakAreas": ["Dynamic Programming", "Graphs"],
      "strongAreas": ["Arrays & Hashing", "Binary Search"]
    },
    "batchInfo": {
      "canRefresh": true,
      "canReplaceCompleted": true,
      "lastRefreshAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### Mark Question Completed
```http
POST /api/v1/recommendations/{userId}/complete
Content-Type: application/json

{
  "questionId": "question_id_here",
  "timeSpent": 1200,
  "attempts": 2
}
```

#### Replace Completed Questions
```http
POST /api/v1/recommendations/{userId}/replace-completed
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
cd backend
node scripts/validateRecommendationEngine.js
```

**Test Coverage:**
- ✅ 296+ automated tests
- API functionality and response validation
- User classification accuracy
- Topic mastery calculations
- Streak tracking logic
- Recommendation strategy distribution

## 🎨 Theming

The platform includes a comprehensive theming system with:
- **Dynamic Color Schemes**: Seamless dark/light mode switching
- **Consistent Design Language**: Unified color palette across all components
- **Accessibility**: WCAG compliant contrast ratios
- **Customizable**: Easy theme extension and modification

## 📊 Analytics & Insights

### **Learning Streaks**
- Real-time streak calculation based on daily activity
- Historical streak tracking with longest streak records
- Activity pattern analysis for engagement insights

### **Topic Mastery Tracking**
- Percentage-based progress calculation
- Dynamic mastery level progression
- Visual progress indicators with color coding

### **Performance Analytics**
- Solve rate tracking per topic
- Attempt efficiency monitoring
- Learning velocity insights
- Weak area identification and recommendations

## 🔄 System Architecture

### **Dynamic Scaling**
- Database-driven topic counts (no hardcoded values)
- Automatic adaptation to new questions/topics
- Percentage-based thresholds for consistent difficulty

### **Smart Caching**
- Intelligent batch management
- Selective refresh strategies
- Performance optimization with minimal API calls

### **Comprehensive Analytics**
- Real-time calculation of learning metrics
- Adaptive user classification
- Personalized recommendation strategies

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- LeetCode for inspiration on coding practice platforms
- The open-source community for excellent tools and libraries
- Contributors who helped shape this intelligent learning platform