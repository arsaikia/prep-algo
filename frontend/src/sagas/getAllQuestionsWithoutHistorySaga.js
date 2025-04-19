import {
    takeEvery,
    put,
    call,
} from 'redux-saga/effects';

import {
    GET_ALL_QUESTIONS_WITHOUT_HISTORY,
    GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
    HIDE_FETCH_LOADING,
    SHOW_FETCH_LOADING,
} from '../actions/types';
import { getQuestions } from '../api/getQuestions';
import groupBy from '../utils/groupBy';
import { getAllQuestionsWithoutHistorySuccess, getAllQuestionsWithoutHistoryFailure } from '../actions/actions';

// worker Saga
function* fetchAllQuestionsWithoutHistory() {
    console.log('Saga: fetchAllQuestionsWithoutHistory started');

    // Make loading true
    yield put({
        type: SHOW_FETCH_LOADING,
    });

    try {
        console.log('Saga: Making API call to getQuestions');
        const questionsDataResponse = yield call(getQuestions);
        console.log('Saga: API call successful', questionsDataResponse);

        // Check if the response has the expected structure
        if (!questionsDataResponse || !questionsDataResponse.data) {
            console.error('Saga: Invalid API response structure', questionsDataResponse);
            throw new Error('Invalid API response structure');
        }

        const allQuestions = questionsDataResponse?.data;
        console.log('Saga: All questions data', allQuestions);

        // Check if we have any questions
        if (!allQuestions || !Array.isArray(allQuestions) || allQuestions.length === 0) {
            console.error('Saga: No questions returned from API', allQuestions);
            throw new Error('No questions returned from API');
        }

        const groupedQuestions = groupBy(allQuestions, (question) => question.group);
        console.log('Saga: Grouped questions Map', groupedQuestions);

        const questionsGroupNames = Array.from(groupedQuestions.keys());
        console.log('Saga: Question group names', questionsGroupNames);

        const questionWithGroups = {
            groups: questionsGroupNames,
            questions: Object.fromEntries(groupedQuestions),
        };

        console.log('Saga: Final grouped questions object', questionWithGroups);

        // fire action -> reducer to get all questions
        const successAction = getAllQuestionsWithoutHistorySuccess(questionWithGroups);
        console.log('Saga: About to dispatch success action:', successAction);
        yield put(successAction);
        console.log('Saga: Successfully dispatched GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS action');
    } catch (error) {
        console.error('Error fetching questions without history:', error);
        yield put(getAllQuestionsWithoutHistoryFailure(error.message));
    } finally {
        // Make loading False -> Questions fetched
        yield put({
            type: HIDE_FETCH_LOADING,
        });
        console.log('Saga: Dispatched HIDE_FETCH_LOADING action');
    }
}

// Watcher Saga
function* getAllQuestionsWithoutHistoryWatcher() {
    console.log('Saga: getAllQuestionsWithoutHistoryWatcher registered');
    yield takeEvery(GET_ALL_QUESTIONS_WITHOUT_HISTORY, fetchAllQuestionsWithoutHistory);
}

export default getAllQuestionsWithoutHistoryWatcher; 