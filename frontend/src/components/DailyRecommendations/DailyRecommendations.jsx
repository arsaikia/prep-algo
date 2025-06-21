import React, { useState, useEffect } from 'react';
import { getDailyRecommendations } from '../../api/getDailyRecommendations';
import './DailyRecommendations.css';

const DailyRecommendations = ({ userId, onQuestionSelect }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recommendationCount, setRecommendationCount] = useState(5);

    useEffect(() => {
        if (userId) {
            fetchRecommendations();
        }
    }, [userId, recommendationCount]);

    const fetchRecommendations = async () => {
        try {
            setLoading(true);
            const response = await getDailyRecommendations(userId, recommendationCount);
            setRecommendations(response.data.recommendations || []);
            setAnalysis(response.data.analysis);
            setError(null);
        } catch (err) {
            setError('Failed to fetch recommendations');
            console.error('Error fetching recommendations:', err);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#ff6b6b';
            case 'medium': return '#feca57';
            case 'low': return '#48dbfb';
            default: return '#ddd';
        }
    };

    const getStrategyIcon = (strategy) => {
        switch (strategy) {
            case 'weak_area_reinforcement': return '💪';
            case 'progressive_difficulty': return '📈';
            case 'spaced_repetition': return '🔄';
            case 'topic_exploration': return '🗺️';
            case 'general_practice': return '⭐';
            default: return '📚';
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return '#10ac84';
            case 'Medium': return '#f39c12';
            case 'Hard': return '#e74c3c';
            default: return '#95a5a6';
        }
    };

    if (loading) {
        return (
            <div className="daily-recommendations loading">
                <div className="loading-spinner"></div>
                <p>Generating your personalized recommendations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="daily-recommendations error">
                <h3>⚠️ Error</h3>
                <p>{error}</p>
                <button onClick={fetchRecommendations} className="retry-btn">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="daily-recommendations">
            <div className="recommendations-header">
                <h2>🎯 Your Daily Practice</h2>
                <div className="controls">
                    <label>
                        Questions:
                        <select
                            value={recommendationCount}
                            onChange={(e) => setRecommendationCount(parseInt(e.target.value))}
                        >
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                            <option value={7}>7</option>
                            <option value={10}>10</option>
                        </select>
                    </label>
                    <button onClick={fetchRecommendations} className="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {analysis && (
                <div className="analysis-summary">
                    <div className="user-stats">
                        <div className="stat">
                            <span className="stat-label">Level:</span>
                            <span className={`stat-value level-${analysis.userLevel}`}>
                                {analysis.userLevel.toUpperCase()}
                            </span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total Solved:</span>
                            <span className="stat-value">{analysis.totalSolved}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Recent Activity:</span>
                            <span className="stat-value">{analysis.recentActivity} this week</span>
                        </div>
                    </div>

                    {analysis.weakAreas && analysis.weakAreas.length > 0 && (
                        <div className="weak-areas">
                            <span className="weak-areas-label">💪 Focus Areas:</span>
                            <div className="weak-areas-list">
                                {analysis.weakAreas.map((area, index) => (
                                    <span key={index} className="weak-area-tag">
                                        {area}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="recommendations-list">
                {recommendations.length === 0 ? (
                    <div className="no-recommendations">
                        <h3>🎉 Great job!</h3>
                        <p>You've solved all available questions in your current categories. Try exploring new topics!</p>
                    </div>
                ) : (
                    recommendations.map((rec, index) => (
                        <div
                            key={rec.question._id}
                            className="recommendation-card"
                            onClick={() => onQuestionSelect && onQuestionSelect(rec.question)}
                        >
                            <div className="recommendation-header">
                                <div className="priority-indicator"
                                    style={{ backgroundColor: getPriorityColor(rec.priority) }}>
                                    {index + 1}
                                </div>
                                <div className="strategy-icon">
                                    {getStrategyIcon(rec.strategy)}
                                </div>
                                <div className="question-info">
                                    <h4 className="question-name">{rec.question.name}</h4>
                                    <div className="question-meta">
                                        <span className="question-group">{rec.question.group}</span>
                                        <span
                                            className="question-difficulty"
                                            style={{ color: getDifficultyColor(rec.question.difficulty) }}
                                        >
                                            {rec.question.difficulty}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="recommendation-reason">
                                <span className="reason-text">{rec.reason}</span>
                                {rec.lastSolved && (
                                    <span className="last-solved">
                                        Last solved: {new Date(rec.lastSolved).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            <div className="recommendation-footer">
                                <span className="strategy-tag">{rec.strategy.replace(/_/g, ' ')}</span>
                                <span className={`priority-tag priority-${rec.priority}`}>
                                    {rec.priority} priority
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {recommendations.length > 0 && (
                <div className="recommendations-footer">
                    <p className="recommendation-tip">
                        💡 <strong>Tip:</strong> Focus on high-priority recommendations first.
                        They're tailored to address your specific learning needs!
                    </p>
                </div>
            )}
        </div>
    );
};

export default DailyRecommendations; 