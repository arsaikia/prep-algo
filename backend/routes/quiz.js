import express from 'express';
import { gradeQuiz } from '../utils/contentStore.js';

const router = express.Router();

/**
 * Grade a content-authored quiz by slug.
 *
 * Deliberately unauthenticated. A quiz is a teaching device embedded in a
 * topic, and gating instant feedback behind a login would make the curriculum
 * unreadable to a guest. Nothing is written here — recording that a user
 * answered correctly is a separate, authenticated progress call.
 */
router.post('/:slug/grade', (req, res) => {
    const { slug } = req.params;
    const { selectedOptionId } = req.body || {};

    if (typeof selectedOptionId !== 'string' || !selectedOptionId) {
        return res.status(400).json({
            success: false,
            message: 'selectedOptionId is required',
        });
    }

    const result = gradeQuiz(slug, selectedOptionId);
    if (!result) {
        return res.status(404).json({
            success: false,
            message: `No answer key for quiz "${slug}"`,
        });
    }

    return res.json({ success: true, data: result });
});

export default router;
