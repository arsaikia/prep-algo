# 🧹 Essential Test Scripts

This folder contains **5 essential scripts** for managing the Smart Hybrid Recommendation System in development and testing.

## 🎯 **Core Scripts (5 total)**

### 1. `cleanupDevDatabase.js` 🧹
**Purpose**: Clean development database except questions for fresh testing

**Usage:**
```bash
cd backend
NODE_ENV=development node scripts/cleanupDevDatabase.js
```

**Features:**
- ✅ Removes all users, solve history, user profiles, daily recommendation batches
- 🛡️ Preserves questions (essential for system functionality)
- 🔒 Safety check - only works in development environment
- 📊 Shows before/after counts for verification
- ⚡ Fast and comprehensive cleanup

**Typical Use Cases:**
- Before testing new features
- After corrupted test data
- Starting fresh test scenarios
- Preparing for demo/presentation

---

### 2. `createTestUsers.js` 👥
**Purpose**: Creates 6 test users with realistic solve histories matching frontend dropdown

**Test Users Created:**
- `test-alice-beginner-001` - Alice Beginner: 10 questions, 60% success, mostly easy
- `test-bob-intermediate-002` - Bob Intermediate: 30 questions, 80% success, mixed difficulty
- `test-carol-advanced-003` - Carol Advanced: 70 questions, 85.7% success, comprehensive
- `test-david-specialized-004` - David Specialized: 53 questions, 73.6% success, uneven topics
- `test-emma-struggling-005` - Emma Struggling: 18 questions, 38.9% success, high retries
- `test-user-123` - Test User: 85 questions, 80% success, comprehensive coverage

**Usage:**
```bash
cd backend
NODE_ENV=development node scripts/createTestUsers.js
```

**Features:**
- ✅ Creates users with hardcoded `_id` values matching frontend dropdown
- 📊 Realistic solve history patterns for each user type
- 🎯 Tests different recommendation scenarios (beginner to advanced)
- 🔄 Compatible with recommendation system testing

---

### 3. `syncQuestionsFromJson.js` 📚
**Purpose**: Syncs questions from `_data/questions.json` to MongoDB database

**Usage:**
```bash
# Sync all questions from JSON to database
npm run sync-questions

# Dry run to see what would be changed without making changes
npm run sync-questions:dry-run

# Sync a specific question
node scripts/syncQuestionsFromJson.js --question=valid-palindrome

# Force update (overwrite existing data)
node scripts/syncQuestionsFromJson.js --force
```

**Features:**
- ✅ Creates new questions that don't exist in database
- 🔄 Updates existing questions with new data from JSON
- 📊 Detailed logging and progress reporting
- 🔍 Dry run mode for safe testing
- 🎯 Specific question targeting
- 🛡️ Smart detection of what needs updating

**What gets synced:**
- Question descriptions and test cases
- Code templates (Python, JavaScript)
- Question metadata (name, group, difficulty)

---

### 4. `validateRecommendationEngine.js` ✅
**Purpose**: Comprehensive validation of the Smart Hybrid Recommendation System

**Features:**
- 🧠 Tests all 5 recommendation strategies
- 👤 Validates user level classification (beginner, intermediate, advanced)
- 📊 Checks strategy distribution percentages
- 🎯 Tests priority system (high, medium, low)
- 🔍 Validates API response formats and data structures
- ⚡ Performance testing (response times, consistency)
- 🔗 Solve history integration testing

**Usage:**
```bash
cd backend
node scripts/validateRecommendationEngine.js [--verbose]
```

**Output:**
- ✅ **Normal mode**: Shows pass/fail summary with total counts
- 🐛 **Verbose mode**: Shows detailed debug information and performance metrics
- 📊 **Summary report**: Complete test results with timing information

---

### 5. `README.md` 📖
**Purpose**: Documentation for all scripts and workflows

---

## 🚀 **Typical Development Workflow**

### **Fresh Start Testing:**
```bash
# 1. Clean database (keeps questions)
NODE_ENV=development node scripts/cleanupDevDatabase.js

# 2. Create test users with realistic data
NODE_ENV=development node scripts/createTestUsers.js

# 3. Validate system is working correctly
node scripts/validateRecommendationEngine.js

# 4. Update questions (when needed)
node scripts/syncQuestionsFromJson.js
```

### **Quick Validation:**
```bash
# Just test if recommendations are working
node scripts/validateRecommendationEngine.js
```

### **Question Updates:**
```bash
# Sync questions from JSON (dry run first)
npm run sync-questions:dry-run
npm run sync-questions
```

---

## 👥 **Test User IDs for Frontend Testing**

Use these user IDs in the frontend test user selector:

| User ID | Name | Profile | Questions Solved | Success Rate |
|---------|------|---------|------------------|--------------|
| `test-alice-beginner-001` | Alice Beginner | Just started | 10 (8 Easy, 2 Medium) | 60% |
| `test-bob-intermediate-002` | Bob Intermediate | Mixed levels | 30 (15 Easy, 12 Medium, 3 Hard) | 80% |
| `test-carol-advanced-003` | Carol Advanced | Comprehensive | 70 (25 Easy, 30 Medium, 15 Hard) | 85.7% |
| `test-david-specialized-004` | David Specialized | Strong/weak areas | 53 (20 Easy, 25 Medium, 8 Hard) | 73.6% |
| `test-emma-struggling-005` | Emma Struggling | High retries | 18 (12 Easy, 5 Medium, 1 Hard) | 38.9% |
| `test-user-123` | Test User | Comprehensive | 85 (30 Easy, 35 Medium, 20 Hard) | 80% |

---

## ⚙️ **Environment Setup**

**Required Environment Variables:**
```bash
NODE_ENV=development
MONGO_URI_DEV="your-development-mongodb-connection-string"
```

**Prerequisites:**
- MongoDB development database connection
- Node.js environment with all dependencies installed
- Questions data in `_data/questions.json`

---

## 🎉 **Benefits of This Streamlined Setup**

### **Before Cleanup: 10 scripts**
- ❌ 5 obsolete/redundant scripts
- ❌ Confusing which scripts to use
- ❌ Old adaptive system references
- ❌ Redundant testing approaches

### **After Cleanup: 5 scripts**
- ✅ Clear purpose for each script
- ✅ No obsolete code references  
- ✅ Streamlined testing workflow
- ✅ Focus on current Smart Hybrid system
- ✅ Easy to understand and maintain

---

## 🔧 **Script Maintenance**

- **Weekly**: Run validation script to ensure system health
- **Before releases**: Full cleanup → create users → validate workflow
- **After major changes**: Test with different user profiles
- **Question updates**: Sync from JSON when questions are modified

**All scripts are focused on the current Smart Hybrid Recommendation System and provide comprehensive testing capabilities.** 