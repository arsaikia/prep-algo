/* eslint-disable no-console */
import axios from 'axios';
import {
    call, put, takeEvery,
} from 'redux-saga/effects';

import {
    GET_QUESTIONS,
    GET_ALL_QUESTIONS,
    GET_SOLVED_QUESTIONS,
    HIDE_FETCH_LOADING,
    SHOW_FETCH_LOADING,
} from '../actions/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';

function* fetchAllQuestions(action) {
    // Make loading true
    yield put({
        type: SHOW_FETCH_LOADING,
    });

    try {
        const userId = action.userId; // Action structure: { type: GET_QUESTIONS, userId }
        console.log('Fetching questions for userId:', userId);

        const response = yield call(axios.get, `${API_BASE_URL}/questions/get-questions/${userId}`);

        if (response.status === 200) {
            const { data } = response.data; // API returns { success, count, data }

            // Store all questions (data contains both questions and solve status)
            yield put({
                payload: data,
                type: GET_ALL_QUESTIONS,
            });

            // Extract solved questions from the data for the solved questions store
            const solvedQuestions = [];
            if (data.questions) {
                Object.values(data.questions).flat().forEach(question => {
                    if (question.solved) {
                        solvedQuestions.push({
                            questionId: question._id,
                            solveCount: question.solveCount,
                            lastSolved: question.lastSolved,
                            firstSolved: question.firstSolved
                        });
                    }
                });
            }

            // Store solved questions
            yield put({
                payload: solvedQuestions,
                type: GET_SOLVED_QUESTIONS,
            });

            console.log('Questions fetched successfully');
        } else {
            console.error('Failed to fetch questions:', response.status);
        }
    } catch (error) {
        console.error('Error fetching questions:', error);
    }

    // Make loading False -> Questions fetched
    yield put({
        type: HIDE_FETCH_LOADING,
    });
}

function* getQuestionsWatcher() {
    yield takeEvery(GET_QUESTIONS, fetchAllQuestions);
}

export default getQuestionsWatcher; 