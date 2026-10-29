import {
    all, call, put, select, takeLatest,
} from 'redux-saga/effects';
import apiClient from '../api/client.js';

import {
    GET_QUESTIONS,
    GET_ALL_QUESTIONS,
    GET_SOLVED_QUESTIONS,
    HIDE_FETCH_LOADING,
    SHOW_FETCH_LOADING,
} from '../actions/types';
import buildQuestionGroups from '../content/buildQuestionGroups';
import { loadIndex } from '../content/loader';
import { isCdnContentEnabled } from '../content/source';

/**
 * Legacy path: one request that joins every question document onto the
 * user's solve history server-side.
 */
function* fetchFromApi(userId, domain) {
    const url = domain
        ? `/questions/get-questions/${userId}?domain=${domain}`
        : `/questions/get-questions/${userId}`;
    const response = yield call([apiClient, 'get'], url);

    if (response.status !== 200) {
        throw new Error(`Question request failed with status ${response.status}`);
    }

    return { data: response.data.data, progressRows: null, progressError: null };
}

/**
 * Target path: static content from the CDN, progress from the API, joined
 * in the browser.
 *
 * The two requests are independent, so they run concurrently — the join
 * cost is a Map lookup per item and does not justify serialising them.
 */
function* fetchProgress(userId) {
    try {
        const response = yield call([apiClient, 'get'], `/progress/${userId}`);
        if (!Array.isArray(response.data.data)) throw new Error('Invalid progress response');
        return { rows: response.data.data, error: null };
    } catch (error) {
        // Progress is an enhancement, not a prerequisite: a failure here must
        // cost the user their solved badges, never the question list itself.
        console.error(
            `[questions] progress lookup failed for "${userId}" — rendering without solved badges.`,
            error,
        );
        const cached = yield select((state) => state.questions);
        return {
            rows: cached.progressUserId === userId ? cached.progressRows : null,
            error: 'Your saved progress is unavailable. Any displayed solved badges may be out of date.',
        };
    }
}

function* fetchFromCdn(userId, domain) {
    const [index, progressResult] = yield all([
        call(loadIndex),
        call(fetchProgress, userId),
    ]);
    const progressRows = progressResult.rows;

    const items = domain
        ? index.items.filter((item) => item.domain === domain)
        : index.items;

    const groups = buildQuestionGroups(items, progressRows);

    // The join is `progress.questionId` -> `indexEntry.legacyId`. If those key
    // spaces ever drift apart the badges vanish silently, which reads exactly
    // like "solved nothing" — so say so out loud instead.
    if (progressRows?.length && !Object.values(groups.questions).flat().some((q) => q.solved)) {
        console.error(
            `[questions] received ${progressRows.length} progress rows but matched none against the content index — `
            + 'questionId/legacyId mismatch.',
        );
    }

    return { data: groups, progressRows, progressError: progressResult.error };
}

function* fetchAllQuestions(action) {
    yield put({ type: SHOW_FETCH_LOADING });

    try {
        const { userId, domain } = action;

        const result = yield call(
            isCdnContentEnabled() ? fetchFromCdn : fetchFromApi,
            userId,
            domain,
        );
        const { data, progressRows, progressError } = result;

        yield put({
            payload: data,
            type: GET_ALL_QUESTIONS,
            userId,
            domain,
            progressRows,
            progressError,
        });

        // The solved-questions store holds only the progress half, so derive
        // it from the same merged payload rather than fetching twice.
        const solvedQuestions = [];
        if (data.questions) {
            Object.values(data.questions).flat().forEach((question) => {
                if (question.solved) {
                    solvedQuestions.push({
                        questionId: question._id,
                        solveCount: question.solveCount,
                        lastSolved: question.lastSolved,
                        firstSolved: question.firstSolved,
                    });
                }
            });
        }

        yield put({
            payload: solvedQuestions,
            type: GET_SOLVED_QUESTIONS,
            userId,
            domain,
        });
    } catch (error) {
        console.error('[questions] failed to load the question list.', error);
        yield put({ type: 'QUESTION_LIST_FAILURE', userId: action.userId, domain: action.domain, payload: error.message || 'Could not load questions.' });
    }

    yield put({ type: HIDE_FETCH_LOADING });
}

function* getQuestionsWatcher() {
    yield takeLatest(GET_QUESTIONS, fetchAllQuestions);
}

export default getQuestionsWatcher;
