# Test Scripts

This folder contains scripts for managing test data and users for development and testing purposes.

## Scripts

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