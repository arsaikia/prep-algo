/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React, { Suspense, lazy, useEffect } from 'react';

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import FullScreenLoader from './components/Loader/FullScreenLoader';
import { loadIndex } from './content/loader';
import { routeTitle, systemDesignSlug } from './utils/documentTitle';

// Routes are split into their own chunks so the initial download only carries
// the page the visitor actually landed on. CodeSandbox in particular pulls in
// the Monaco editor, which dwarfs the rest of the app.
const Home = lazy(() => import('./pages/Home'));
const AllQuestions = lazy(() => import('./pages/AllQuestions'));
const Login = lazy(() => import('./pages/Login'));
const CodeSandbox = lazy(() => import('./pages/CodeSandbox'));
// System Design is read, not solved, so it has its own index and reader
// rather than reusing the question list.
const SystemDesignLayout = lazy(() => import('./pages/systemDesign/SystemDesignLayout'));
const SystemDesignOverview = lazy(() => import('./pages/systemDesign/SystemDesignOverview'));
const TopicReader = lazy(() => import('./pages/TopicReader'));
const Error = lazy(() => import('./pages/Error'));

function SandboxRoute() {
  const { search } = useLocation();
  return <CodeSandbox key={search} />;
}

/**
 * Gives every route a default document title. Effects run child-first, so
 * this resets the title on navigation before any page has data; pages such as
 * CodeSandbox then refine it with `useDocumentTitle` once their content loads.
 * System Design lessons are titled from the (memoised) content index because
 * the reader does not set its own title.
 */
function RouteTitle() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    document.title = routeTitle(pathname);
    const slug = systemDesignSlug(pathname);
    if (!slug) return undefined;
    let cancelled = false;
    loadIndex()
      .then((index) => {
        const lesson = (index?.items || []).find((item) => item.slug === slug);
        if (!cancelled && lesson?.title) document.title = routeTitle(pathname, { lessonTitle: lesson.title });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname, search]);

  return null;
}

function AllRoutes() {
  return (
    <>
      <RouteTitle />
      <Suspense fallback={<FullScreenLoader show />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/all" element={<AllQuestions />} />
          <Route path="/questions" element={<AllQuestions />} />
          <Route path="/algorithms" element={<AllQuestions domain="algorithms" />} />
          {/*
            * Nested so the curriculum sidebar stays mounted while you move
            * between topics: the outline is the navigation, and remounting it on
            * every click would reset its scroll and expansion state.
            */}
          <Route path="/system-design" element={<SystemDesignLayout />}>
              <Route index element={<SystemDesignOverview />} />
              <Route path=":slug" element={<TopicReader />} />
          </Route>
          <Route path="/frontend" element={<AllQuestions domain="frontend" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/codesandbox" element={<SandboxRoute />} />
          <Route path="/404" element={<Error />} />
          <Route path="*" element={<Navigate replace to="/404" />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default AllRoutes;
