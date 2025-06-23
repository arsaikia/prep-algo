/**
 * Time Tracking Utility for Question Solving
 * Tracks time spent, difficulty ratings, and tags
 */
import React from 'react';

class TimeTracker {
    constructor() {
        this.startTime = null;
        this.endTime = null;
        this.pausedTime = 0;
        this.isPaused = false;
        this.sessionData = {};
    }

    /**
     * Start tracking time for a question
     * @param {string} questionId 
     * @param {string} userId 
     */
    startTracking(questionId, userId) {
        this.startTime = new Date();
        this.endTime = null;
        this.pausedTime = 0;
        this.isPaused = false;
        this.sessionData = {
            questionId,
            userId,
            startTime: this.startTime,
            tags: [],
            difficultyRating: null
        };

        // Store in localStorage for persistence
        localStorage.setItem('currentSession', JSON.stringify(this.sessionData));
    }

    /**
     * Pause the timer
     */
    pause() {
        if (!this.isPaused && this.startTime) {
            this.isPaused = true;
            this.pauseStartTime = new Date();
        }
    }

    /**
     * Resume the timer
     */
    resume() {
        if (this.isPaused && this.pauseStartTime) {
            this.pausedTime += new Date() - this.pauseStartTime;
            this.isPaused = false;
            this.pauseStartTime = null;
        }
    }

    /**
     * Stop tracking and return session data
     * @param {boolean} success - Whether the question was solved successfully
     * @param {number} difficultyRating - User's difficulty rating (1-5)
     * @param {Array} tags - Additional tags for the session
     * @returns {Object} Session data with time spent
     */
    stopTracking(success = true, difficultyRating = null, tags = []) {
        if (!this.startTime) {
            return null;
        }

        this.endTime = new Date();
        const totalTime = this.endTime - this.startTime - this.pausedTime;
        const timeSpentMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10; // Round to 1 decimal

        const sessionResult = {
            ...this.sessionData,
            endTime: this.endTime,
            timeSpent: timeSpentMinutes,
            success,
            difficultyRating,
            tags: [...this.sessionData.tags, ...tags]
        };

        // Clear localStorage
        localStorage.removeItem('currentSession');

        return sessionResult;
    }

    /**
     * Get current elapsed time in minutes
     * @returns {number} Current elapsed time
     */
    getCurrentTime() {
        if (!this.startTime) return 0;

        const now = new Date();
        let elapsed = now - this.startTime;

        // Subtract paused time
        elapsed -= this.pausedTime;

        // If currently paused, subtract the current pause duration
        if (this.isPaused && this.pauseStartTime) {
            elapsed -= (now - this.pauseStartTime);
        }

        // Convert to minutes with higher precision
        const minutes = elapsed / (1000 * 60);
        return Math.max(0, minutes); // Ensure never negative
    }

    /**
     * Add tags to current session
     * @param {Array} newTags 
     */
    addTags(newTags) {
        if (this.sessionData.tags) {
            this.sessionData.tags = [...new Set([...this.sessionData.tags, ...newTags])];
            localStorage.setItem('currentSession', JSON.stringify(this.sessionData));
        }
    }

    /**
     * Set difficulty rating for current session
     * @param {number} rating 
     */
    setDifficultyRating(rating) {
        if (rating >= 1 && rating <= 5) {
            this.sessionData.difficultyRating = rating;
            localStorage.setItem('currentSession', JSON.stringify(this.sessionData));
        }
    }

    /**
     * Restore session from localStorage (useful for page refreshes)
     * @returns {boolean} Whether session was restored
     */
    restoreSession() {
        const savedSession = localStorage.getItem('currentSession');
        if (savedSession) {
            try {
                this.sessionData = JSON.parse(savedSession);
                this.startTime = new Date(this.sessionData.startTime);
                return true;
            } catch (error) {
                localStorage.removeItem('currentSession');
            }
        }
        return false;
    }

    /**
     * Reset the tracker
     */
    reset() {
        this.startTime = null;
        this.endTime = null;
        this.pausedTime = 0;
        this.isPaused = false;
        this.sessionData = {};
        localStorage.removeItem('currentSession');
    }
}

// Export singleton instance
export const timeTracker = new TimeTracker();

/**
 * Enhanced API call to update solve history with tracking data
 */
export const updateSolveHistoryWithTracking = async (sessionData) => {
    try {
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

        const response = await fetch(`${apiBaseUrl}/solveHistory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: sessionData.userId,
                questionId: sessionData.questionId,
                timeSpent: sessionData.timeSpent,
                difficultyRating: sessionData.difficultyRating,
                tags: sessionData.tags,
                success: sessionData.success
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Hook for React components to use time tracking
 */
export const useTimeTracker = () => {
    const [currentTime, setCurrentTime] = React.useState(0);
    const [isTracking, setIsTracking] = React.useState(false);

    React.useEffect(() => {
        let interval;
        if (isTracking) {
            // Update every 100ms for smooth display, but round to seconds
            interval = setInterval(() => {
                setCurrentTime(timeTracker.getCurrentTime());
            }, 100); // Changed from 1000ms to 100ms for smoother updates
        }
        return () => clearInterval(interval);
    }, [isTracking]);

    // Restore session on component mount
    React.useEffect(() => {
        if (timeTracker.restoreSession()) {
            setIsTracking(true);
        }
    }, []);

    const startTracking = (questionId, userId) => {
        timeTracker.startTracking(questionId, userId);
        setIsTracking(true);
    };

    const stopTracking = async (success, difficultyRating, tags) => {
        const sessionData = timeTracker.stopTracking(success, difficultyRating, tags);
        setIsTracking(false);
        setCurrentTime(0);

        if (sessionData) {
            // Update solve history
            await updateSolveHistoryWithTracking(sessionData);

            // If successful, also mark as complete in recommendation system
            if (success && sessionData.userId && sessionData.questionId) {
                const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';
                try {
                    await fetch(`${apiBaseUrl}/recommendations/${sessionData.userId}/complete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            questionId: sessionData.questionId,
                            timeSpent: sessionData.timeSpent,
                            success: true
                        })
                    });
                    console.log('✅ Question marked as complete in recommendation system');
                } catch (error) {
                    console.error('❌ Error marking question complete in recommendation system:', error);
                    console.error('   API URL:', apiBaseUrl);
                    console.error('   User ID:', sessionData.userId);
                    console.error('   Question ID:', sessionData.questionId);
                    // Don't fail the whole operation if this fails
                }
            }
        }

        return sessionData;
    };

    return {
        currentTime,
        isTracking,
        startTracking,
        stopTracking,
        pause: () => timeTracker.pause(),
        resume: () => timeTracker.resume(),
        addTags: (tags) => timeTracker.addTags(tags),
        setDifficultyRating: (rating) => timeTracker.setDifficultyRating(rating)
    };
}; 