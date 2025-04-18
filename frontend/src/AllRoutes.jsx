/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';

import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import All from './components/All';
import Todo from './components/Todo';
import Error from './pages/Error';
import Login from './pages/Login';
import Playground from './pages/Playground';
import Signup from './pages/Signup';

function AllRoutes(props) {
  const {
    allQuestionsProps,
    todoProps,
  } = props;

  return (
    <Routes>
      <Route path="/" element={<All allQuestionsProps={allQuestionsProps} />} />
      <Route path="/todo" element={<Todo {...todoProps} />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/404" element={<Error />} />
      <Route path="*" element={<Navigate replace to="/404" />} />
    </Routes>
  );
}

export default AllRoutes;
