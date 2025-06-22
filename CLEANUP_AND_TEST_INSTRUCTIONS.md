# 🧹 Database Cleanup and Testing Instructions

## 🔧 Prerequisites

1. **Fix MongoDB Authentication**: The current connection string seems to have authentication issues. Please verify:
   - MongoDB Atlas credentials are correct
   - Database user has proper permissions
   - IP whitelist includes your current IP
   - Connection string format is correct

## 📋 Step-by-Step Process

### Step 1: Clean Database (Preserve Questions)

Once the MongoDB connection is working, run the cleanup script:

```bash
cd backend
export MONGO_URI_DEV="your-working-connection-string"
NODE_ENV=development node scripts/cleanupDevDatabase.js
```

**What this does:**
- ✅ Removes all users
- ✅ Removes all solve histories  
- ✅ Removes all user profiles
- ✅ Removes all daily recommendation batches
- ✅ **Preserves all questions** for testing

### Step 2: Create Test Users

After cleanup, create the test users that match the frontend dropdown:

```bash
cd backend
NODE_ENV=development node scripts/createTestUsers.js
```

**Test Users Created:**
- `test-alice-beginner-001` - Alice Beginner (10 questions, 60% success)
- `test-bob-intermediate-002` - Bob Intermediate (30 questions, 80% success)  
- `test-carol-advanced-003` - Carol Advanced (70 questions, 85.7% success)
- `test-david-specialized-004` - David Specialized (53 questions, 73.6% success)
- `test-emma-struggling-005` - Emma Struggling (18 questions, 38.9% success)
- `test-user-123` - Test User (85 questions, 80% success)

### Step 3: Start Backend Server

```bash
cd backend
export MONGO_URI_DEV="your-working-connection-string"
NODE_ENV=development node server.js
```

### Step 4: Start Frontend

```bash
cd frontend
npm start
```

## 🧪 Testing the New Hybrid Recommendation System

### Test Scenarios to Verify:

#### **Scenario 1: Fresh User Experience**
1. Select any test user from dropdown
2. Navigate to Daily Recommendations
3. **Expected**: See 5 fresh recommendations, no refresh buttons

#### **Scenario 2: Same-Day Stability** 
1. Complete 1-2 questions through the code solver
2. Return to Daily Recommendations
3. **Expected**: 
   - Completed questions appear at bottom with ✅
   - Remaining questions stay in same order
   - "✨ Get Fresh Questions" button appears
   - No auto-refresh

#### **Scenario 3: Manual Fresh Questions**
1. After completing some questions, click "✨ Get Fresh Questions"
2. **Expected**:
   - Only completed questions get replaced with new ones
   - Incomplete questions remain unchanged
   - Progress tracking updates correctly

#### **Scenario 4: Full Completion**
1. Complete all 5 questions
2. **Expected**:
   - All questions appear in completed section
   - "🔄 Full Refresh" button appears
   - Can get completely new batch

#### **Scenario 5: Next-Day Auto-Refresh** (Simulate)
1. Complete some questions
2. Manually update a batch's `generatedAt` date to yesterday in MongoDB
3. Refresh recommendations
4. **Expected**: Auto-refresh with new batch since progress was made

### Key Features to Verify:

- ✅ **Stable Daily Batch**: Questions don't disappear unexpectedly
- ✅ **Progress Tracking**: Clear visual progress (2/5 completed)
- ✅ **Completed Section**: Solved questions at bottom with styling
- ✅ **Manual Control**: "Get Fresh Questions" for completed ones
- ✅ **Smart Buttons**: Different buttons for different situations
- ✅ **No Auto-Refresh**: Same day questions stay stable

## 🐛 Troubleshooting

### MongoDB Connection Issues:
```bash
# Test connection with a simple script
node -e "
const mongoose = require('mongoose');
mongoose.connect('your-connection-string')
  .then(() => console.log('✅ Connected'))
  .catch(err => console.log('❌ Failed:', err.message));
"
```

### If Scripts Fail:
1. Check `NODE_ENV=development` is set
2. Verify MongoDB connection string
3. Ensure all npm dependencies are installed: `npm install`
4. Check if questions exist: Should have ~189 questions in database

### Frontend Issues:
1. Ensure backend is running on port 5000
2. Check browser console for API errors
3. Verify test user dropdown shows the 6 test users

## 📊 Expected Results

After successful setup, you should see:

**Backend:**
- 6 test users with realistic solve histories
- 189 questions preserved
- Clean recommendation batches (none initially)

**Frontend:**
- Test user dropdown with 6 users
- Daily Recommendations page working
- New hybrid refresh behavior
- Completed questions section
- Smart button logic

**Database State:**
```
Users: 6
Solve History: ~200-300 records
User Profiles: 0 (created on-demand)
Daily Batches: 0 (created when user visits recommendations)
Questions: 189 (preserved)
```

## 🎯 Success Criteria

The new hybrid recommendation system is working correctly when:

1. ✅ Questions remain stable during the same day
2. ✅ Completed questions appear at bottom with visual indicators  
3. ✅ "Get Fresh Questions" only replaces completed ones
4. ✅ Progress tracking shows accurate completion status
5. ✅ No unexpected auto-refreshes during active sessions
6. ✅ Manual refresh options work as expected

---

**Once the MongoDB connection is fixed, this process should take about 5-10 minutes to complete and will give you a clean testing environment for the new hybrid recommendation system!** 