import {
    call,
    put,
    takeEvery,
} from 'redux-saga/effects';

import {
    GET_ALL_QUESTIONS_WITHOUT_HISTORY,
    GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
    HIDE_FETCH_LOADING,
    SHOW_FETCH_LOADING,
} from '../actions/types';
import { getQuestions } from '../api/getQuestions';
import groupBy from '../utils/groupBy';

// worker Saga
function* fetchAllQuestionsWithoutHistory() {
    yield put({
        type: SHOW_FETCH_LOADING,
    });

    try {
        const questionsDataResponse = yield call(getQuestions);

        if (!questionsDataResponse.success || !questionsDataResponse.data) {
            throw new Error('Invalid API response structure');
        }

        const allQuestions = questionsDataResponse.data;

        if (!allQuestions || allQuestions.length === 0) {
            throw new Error('No questions returned from API');
        }

        // Group questions by their group property
        const groupedQuestionsMap = groupBy(allQuestions, (question) => question.group);

        // Convert Map to Object and get group names
        const questionsGroupNames = Array.from(groupedQuestionsMap.keys());
        const groupedQuestions = Object.fromEntries(groupedQuestionsMap);

        // Create the final structure with groups and questions
        const questionWithGroups = {
            groups: questionsGroupNames,
            questions: groupedQuestions,
        };

        const successAction = {
            payload: questionWithGroups,
            type: GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
        };

        yield put(successAction);
    } catch (error) {
        // Error handling without logging
    } finally {
        yield put({
            type: HIDE_FETCH_LOADING,
        });
    }
}

// watcher Saga
function* getAllQuestionsWithoutHistoryWatcher() {
    yield takeEvery(GET_ALL_QUESTIONS_WITHOUT_HISTORY, fetchAllQuestionsWithoutHistory);
}

export default getAllQuestionsWithoutHistoryWatcher; 