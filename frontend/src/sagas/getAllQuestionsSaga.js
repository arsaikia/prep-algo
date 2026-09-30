import {
    all, call, put, takeEvery,
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

    return response.data.data;
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
        return response.data.data;
    } catch (error) {
        // Progress is an enhancement, not a prerequisite: a failure here must
        // cost the user their solved badges, never the question list itself.
        console.error(
            `[questions] progress lookup failed for "${userId}" — rendering without solved badges.`,
            error,
        );
        return null;
    }
}

function* fetchFromCdn(userId, domain) {
    const [index, progressRows] = yield all([
        call(loadIndex),
        call(fetchProgress, userId),
    ]);

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

    return groups;
}

function* fetchAllQuestions(action) {
    yield put({ type: SHOW_FETCH_LOADING });

    try {
        const { userId, domain } = action;

        const data = yield call(
            isCdnContentEnabled() ? fetchFromCdn : fetchFromApi,
            userId,
            domain,
        );

        yield put({
            payload: data,
            type: GET_ALL_QUESTIONS,
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
        });
    } catch (error) {
        console.error('[questions] failed to load the question list.', error);
    }

    yield put({ type: HIDE_FETCH_LOADING });
}

function* getQuestionsWatcher() {
    yield takeEvery(GET_QUESTIONS, fetchAllQuestions);
}

export default getQuestionsWatcher;
