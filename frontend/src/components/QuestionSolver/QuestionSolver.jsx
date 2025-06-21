import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../../utils/timeTracker';

const QuestionSolver = ({ question, userId, onComplete }) => {
    const [solution, setSolution] = useState('');
    const [difficultyRating, setDifficultyRating] = useState(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const [showFeedback, setShowFeedback] = useState(false);

    const {
        currentTime,
        isTracking,
        startTracking,
        stopTracking,
        pause,
        resume,
        addTags,
        setDifficultyRating: setTrackerDifficulty
    } = useTimeTracker();

    // Available tags for categorizing the session
    const availableTags = [
        'array', 'string', 'dynamic-programming', 'tree', 'graph',
        'binary-search', 'sorting', 'hash-table', 'two-pointers',
        'sliding-window', 'backtracking', 'greedy', 'math',
        'struggled', 'easy-solve', 'multiple-attempts', 'learned-new-concept'
    ];

    useEffect(() => {
        if (question && userId) {
            startTracking(question._id, userId);
        }

        // Cleanup on unmount
        return () => {
            if (isTracking) {
                handleSubmit(false); // Mark as incomplete if component unmounts
            }
        };
    }, [question, userId]);

    const handleSubmit = async (success = true) => {
        if (!isTracking) return;

        try {
            const sessionData = await stopTracking(success, difficultyRating, selectedTags);
            console.log('📊 Session completed:', sessionData);

            if (onComplete) {
                onComplete(sessionData);
            }

            setShowFeedback(true);
        } catch (error) {
            console.error('❌ Error submitting solution:', error);
        }
    };

    const handleTagToggle = (tag) => {
        const newTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];

        setSelectedTags(newTags);
        addTags(newTags);
    };

    const handleDifficultyChange = (rating) => {
        setDifficultyRating(rating);
        setTrackerDifficulty(rating);
    };

    const formatTime = (minutes) => {
        if (minutes < 1) return `${Math.round(minutes * 60)}s`;
        return `${Math.floor(minutes)}m ${Math.round((minutes % 1) * 60)}s`;
    };

    if (!question) return <div>Loading question...</div>;

    return (
        <div className="question-solver">
            {/* Timer Display */}
            <div className="timer-section" style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div className="timer-display">
                    ⏱️ <strong>{formatTime(currentTime)}</strong>
                    {isTracking && <span className="tracking-indicator"> 🔴 Recording</span>}
                </div>
                <div className="timer-controls">
                    <button onClick={pause} disabled={!isTracking}>⏸️ Pause</button>
                    <button onClick={resume} disabled={!isTracking}>▶️ Resume</button>
                </div>
            </div>

            {/* Question Display */}
            <div className="question-content">
                <h2>{question.title}</h2>
                <div className="difficulty">
                    Difficulty: <span className={`difficulty-${question.difficulty?.toLowerCase()}`}>
                        {question.difficulty}
                    </span>
                </div>
                <div className="description" dangerouslySetInnerHTML={{ __html: question.description }} />
            </div>

            {/* Solution Input */}
            <div className="solution-section">
                <h3>Your Solution</h3>
                <textarea
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="Write your solution here..."
                    rows={15}
                    style={{
                        width: '100%',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                    }}
                />
            </div>

            {/* Feedback Section */}
            <div className="feedback-section" style={{ marginTop: '20px' }}>
                <h3>Session Feedback</h3>

                {/* Difficulty Rating */}
                <div className="difficulty-rating" style={{ marginBottom: '15px' }}>
                    <label>How difficult was this for you? (1=Very Easy, 5=Very Hard)</label>
                    <div className="rating-buttons" style={{ marginTop: '8px' }}>
                        {[1, 2, 3, 4, 5].map(rating => (
                            <button
                                key={rating}
                                onClick={() => handleDifficultyChange(rating)}
                                style={{
                                    margin: '0 5px',
                                    padding: '8px 12px',
                                    backgroundColor: difficultyRating === rating ? '#007bff' : '#f8f9fa',
                                    color: difficultyRating === rating ? 'white' : 'black',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {rating}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tags Selection */}
                <div className="tags-selection">
                    <label>Tags (select all that apply):</label>
                    <div className="tags-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '8px',
                        marginTop: '8px'
                    }}>
                        {availableTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleTagToggle(tag)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    backgroundColor: selectedTags.includes(tag) ? '#28a745' : '#f8f9fa',
                                    color: selectedTags.includes(tag) ? 'white' : 'black',
                                    border: '1px solid #ddd',
                                    borderRadius: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Submit Buttons */}
            <div className="submit-section" style={{ marginTop: '30px', textAlign: 'center' }}>
                <button
                    onClick={() => handleSubmit(true)}
                    disabled={!isTracking}
                    style={{
                        padding: '12px 24px',
                        margin: '0 10px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    ✅ Submit Solution
                </button>
                <button
                    onClick={() => handleSubmit(false)}
                    disabled={!isTracking}
                    style={{
                        padding: '12px 24px',
                        margin: '0 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    ❌ Give Up
                </button>
            </div>

            {/* Session Summary Modal */}
            {showFeedback && (
                <div className="session-summary" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '12px',
                        maxWidth: '500px',
                        width: '90%'
                    }}>
                        <h3>📊 Session Complete!</h3>
                        <p><strong>Time Spent:</strong> {formatTime(currentTime)}</p>
                        <p><strong>Difficulty Rating:</strong> {difficultyRating || 'Not rated'}/5</p>
                        <p><strong>Tags:</strong> {selectedTags.join(', ') || 'None selected'}</p>
                        <button
                            onClick={() => setShowFeedback(false)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                marginTop: '15px'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionSolver; 