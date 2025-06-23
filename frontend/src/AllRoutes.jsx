/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';

import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import AllQuestions from './pages/AllQuestions';
import CodeSandbox from './pages/CodeSandbox';
import Error from './pages/Error';
import Login from './pages/Login';
import Home from './pages/Home';

function AllRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/all" element={<AllQuestions />} />
      <Route path="/questions" element={<AllQuestions />} />
      <Route path="/login" element={<Login />} />
      <Route path="/codesandbox" element={<CodeSandbox />} />
      <Route path="/404" element={<Error />} />
      <Route path="*" element={<Navigate replace to="/404" />} />
    </Routes>
  );
}

export default AllRoutes;
