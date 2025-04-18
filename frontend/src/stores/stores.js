import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';

import authReducer from '../reducers/authReducer';
import codeModalReducer from '../reducers/codeReducer';
import questionReducer from '../reducers/questionsReducer';
import themeReducer from '../reducers/themeReducer';
import rootSaga from '../sagas';

// create the saga middleware
const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
  reducer: {
    auth: authReducer,
    codeModal: codeModalReducer,
    questions: questionReducer,
    theme: themeReducer,
  },
});

// then run the saga
sagaMiddleware.run(rootSaga);

export default store;
