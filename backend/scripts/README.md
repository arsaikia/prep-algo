# Test Scripts

This folder contains scripts for managing test data, users, and questions for development and testing purposes.

## Scripts

### `syncQuestionsFromJson.js` ⭐ NEW
Syncs questions from the `_data/questions.json` file to the MongoDB database. This is the primary tool for updating question data.

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
- Question descriptions
- Test cases (both example and full test suites)
- Code templates (Python, JavaScript)
- Question metadata (name, group, difficulty)

### `createTestUsers.js`
Creates comprehensive test users with varied solve histories to test the recommendation system.

**Test Users Created:**
- `test-alice-beginner-001` - Alice Beginner: Just started, mostly easy questions
- `test-bob-intermediate-002` - Bob Intermediate: Mixed difficulty levels
- `test-carol-advanced-003` - Carol Advanced: Comprehensive coverage, many completed
- `test-david-specialized-004` - David Specialized: Strong in some areas, weak in others
- `test-emma-struggling-005` - Emma Struggling: High retry counts, needs reinforcement

**Usage:**
```bash
cd backend
node scripts/createTestUsers.js
```

### `updateExistingTestUser.js`
Updates the existing test user with more comprehensive solve history for better testing.

**Usage:**
```bash
cd backend
node scripts/updateExistingTestUser.js
```

### `addTestUsers.js`
Legacy script for adding test users (kept for reference).

**Usage:**
```bash
cd backend
node scripts/addTestUsers.js
```

### `validateRecommendationEngine.js`
Comprehensive validation script for testing the recommendation engine functionality.

**Features:**
- Tests all 5 recommendation strategies (weak area reinforcement, progressive difficulty, spaced repetition, topic exploration, general practice)
- Validates user level classification (beginner, intermediate, advanced)
- Checks strategy distribution percentages (40%, 30%, 20%, remaining, fill)
- Tests priority system (high, medium, low)
- Validates API response formats and data structures
- Tests edge cases (invalid users, different count parameters)
- Performance testing (response times, consistency)
- Solve history integration testing

**Usage:**
```bash
cd backend
node scripts/validateRecommendationEngine.js [--verbose]
```

**Output:**
- ✅ **Normal mode**: Shows pass/fail summary with total counts
- 🐛 **Verbose mode**: Shows detailed debug information, strategy distributions, and performance metrics
- 📊 **Summary report**: Complete test results with timing information

**Example Output:**
```
🚀 Starting Recommendation Engine Validation...
✅ PASS: API responds successfully
✅ PASS: User test-alice-beginner-001 classified as beginner
✅ PASS: Weak area reinforcement within expected range (40.0%)
📊 VALIDATION SUMMARY REPORT
✅ Tests Passed: 34
❌ Tests Failed: 0
🎉 ALL TESTS PASSED! Recommendation engine is working correctly.
```

## Test User IDs for Frontend Testing

You can use these user IDs in the frontend test user selector to test different completion scenarios:

- `test-alice-beginner-001` - Low completion, mostly easy questions
- `test-bob-intermediate-002` - Medium completion, mixed difficulties  
- `test-carol-advanced-003` - High completion, comprehensive coverage
- `test-david-specialized-004` - Uneven completion across topics
- `test-emma-struggling-005` - High retry counts, struggling patterns
- `test-user-123` - Original test user with updated comprehensive history

## Environment Setup

Make sure your `.env` file is configured with the correct database connection before running these scripts. 