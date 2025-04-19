/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';

import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import Todo from './components/Todo';
import AllQuestions from './pages/AllQuestions';
import Error from './pages/Error';
import Login from './pages/Login';
import Playground from './pages/Playground';

function AllRoutes(props) {
  const {
    todoProps,
  } = props;

  return (
    <Routes>
      <Route path="/" element={<AllQuestions />} />
      <Route path="/all" element={<AllQuestions />} />
      <Route path="/questions" element={<AllQuestions />} />
      <Route path="/todo" element={<Todo {...todoProps} />} />
      <Route path="/login" element={<Login />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/404" element={<Error />} />
      <Route path="*" element={<Navigate replace to="/404" />} />
    </Routes>
  );
}

export default AllRoutes;
