/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React, { Suspense, lazy } from 'react';

import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import FullScreenLoader from './components/Loader/FullScreenLoader';

// Routes are split into their own chunks so the initial download only carries
// the page the visitor actually landed on. CodeSandbox in particular pulls in
// the Monaco editor, which dwarfs the rest of the app.
const Home = lazy(() => import('./pages/Home'));
const AllQuestions = lazy(() => import('./pages/AllQuestions'));
const Login = lazy(() => import('./pages/Login'));
const CodeSandbox = lazy(() => import('./pages/CodeSandbox'));
// System Design is read, not solved, so it has its own index and reader
// rather than reusing the question list.
const SystemDesign = lazy(() => import('./pages/SystemDesign'));
const TopicReader = lazy(() => import('./pages/TopicReader'));
const Error = lazy(() => import('./pages/Error'));

function AllRoutes() {
  return (
    <Suspense fallback={<FullScreenLoader show />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/all" element={<AllQuestions />} />
        <Route path="/questions" element={<AllQuestions />} />
        <Route path="/algorithms" element={<AllQuestions domain="algorithms" />} />
        <Route path="/system-design" element={<SystemDesign />} />
        <Route path="/system-design/:slug" element={<TopicReader />} />
        <Route path="/frontend" element={<AllQuestions domain="frontend" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/codesandbox" element={<CodeSandbox />} />
        <Route path="/404" element={<Error />} />
        <Route path="*" element={<Navigate replace to="/404" />} />
      </Routes>
    </Suspense>
  );
}

export default AllRoutes;
