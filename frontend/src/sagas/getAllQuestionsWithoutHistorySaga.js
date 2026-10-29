import {
    call,
    put,
    takeEvery,
} from 'redux-saga/effects';

import {
    GET_ALL_QUESTIONS_WITHOUT_HISTORY,
    GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
    GET_ALL_QUESTIONS_WITHOUT_HISTORY_FAILURE,
    HIDE_FETCH_LOADING,
    SHOW_FETCH_LOADING,
} from '../actions/types';
import { getQuestions } from '../api/getQuestions';
import buildQuestionGroups from '../content/buildQuestionGroups';
import { loadIndex } from '../content/loader';
import { isCdnContentEnabled } from '../content/source';
import groupBy from '../utils/groupBy';

/** Legacy path: the backend returns fully-formed question documents. */
function* fetchFromApi() {
    const response = yield call(getQuestions);

    if (!response.success || !response.data) {
        throw new Error('Invalid API response structure');
    }

    const grouped = groupBy(response.data, (question) => question.group);

    return {
        groups: Array.from(grouped.keys()),
        questions: Object.fromEntries(grouped),
    };
}

/** Target path: the list is served entirely from the CDN, no backend call. */
function* fetchFromCdn() {
    const index = yield call(loadIndex);
    return buildQuestionGroups(index.items);
}

function* fetchAllQuestionsWithoutHistory() {
    yield put({ type: SHOW_FETCH_LOADING });

    try {
        const questionWithGroups = yield call(
            isCdnContentEnabled() ? fetchFromCdn : fetchFromApi,
        );

        yield put({
            payload: questionWithGroups,
            type: GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
        });
    } catch (error) {
        yield put({ type: GET_ALL_QUESTIONS_WITHOUT_HISTORY_FAILURE, payload: error.message || 'Could not load the question library.' });
    } finally {
        yield put({ type: HIDE_FETCH_LOADING });
    }
}

// watcher Saga
function* getAllQuestionsWithoutHistoryWatcher() {
    yield takeEvery(GET_ALL_QUESTIONS_WITHOUT_HISTORY, fetchAllQuestionsWithoutHistory);
}

export default getAllQuestionsWithoutHistoryWatcher;
