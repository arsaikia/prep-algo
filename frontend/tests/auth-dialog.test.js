import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { ThemeProvider } from 'styled-components';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const theme = { colors: {
  background: '#fafafa', backgroundSecondary: '#f5f5f5', backgroundTertiary: '#e5e5e5',
  borderLight: '#e5e5e5', text: '#111827', textSecondary: '#4b5563', primary: '#8b5cf6', error: '#e74c3c',
} };

test('sign-in dialog preserves dismissal and authentication feedback', async (t) => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLCollection', 'NodeList',
    'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT'];
  const saved = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of keys.slice(0, -1)) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const temporary = await mkdtemp(fileURLToPath(new URL('./.auth-build-', import.meta.url)));
  let root;
  try {
    await build({
      entryPoints: [fileURLToPath(new URL('../src/components/Auth/GoogleLoginModal.jsx', import.meta.url))],
      outfile: `${temporary}/dialog.cjs`, bundle: true, platform: 'node', format: 'cjs',
      packages: 'external', logLevel: 'silent',
      plugins: [{
        name: 'google-provider-fixture',
        setup(build) {
          build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', external: true }));
          build.onResolve({ filter: /^styled-components$/ }, ({ kind }) => kind === 'require-call'
            ? { path: 'styled-components', external: true }
            : { path: 'styled', namespace: 'fixture' });
          build.onResolve({ filter: /^@react-oauth\/google$/ }, () => ({ path: 'google', namespace: 'fixture' }));
          build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
            contents: path === 'styled'
              ? 'const { default: styled, keyframes } = require("styled-components"); export { keyframes }; export default styled;'
              : `const React = require('react');
                export function GoogleLogin({ theme, shape, onError }) {
                  return React.createElement('div', null, React.createElement('button', {
                    'data-google': true, 'data-theme': theme, 'data-shape': shape, onClick: onError,
                  }, 'Continue with Google'));
                }`,
          }));
        },
      }],
    });
    const GoogleLoginModal = require(`${temporary}/dialog.cjs`).default;
    const initialAuth = { status: 'guest', signingIn: false, error: null };
    const store = createStore((state = { auth: initialAuth, theme: { isDarkModeEnabled: false } }, action) => {
      if (action.type === 'auth-state') return { ...state, auth: { ...state.auth, ...action.payload } };
      if (action.type === 'GOOGLE_LOGIN_FAILURE') return { ...state, auth: { ...state.auth, error: action.payload } };
      return state;
    });
    let closed = 0;
    let authenticated = 0;
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return React.createElement(React.Fragment, null,
        React.createElement('button', { id: 'open-sign-in', onClick: () => setOpen(true) }, 'Open sign-in'),
        React.createElement(GoogleLoginModal, {
          isOpen: open,
          onClose: () => { closed++; setOpen(false); },
          onAuthenticated: () => { authenticated++; setOpen(false); },
        }));
    }
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Provider, { store },
      React.createElement(ThemeProvider, { theme }, React.createElement(Harness)))));
    const dialog = () => document.querySelector('[role="dialog"]');
    const open = async () => {
      const opener = document.getElementById('open-sign-in');
      opener.focus();
      await act(async () => opener.click());
      assert.ok(dialog());
    };

    await t.test('close, Escape and backdrop dismiss without losing the page or opener focus', async () => {
      await open();
      const close = document.querySelector('[aria-label="Close sign-in"]');
      assert.equal(close.type, 'button');
      await act(async () => close.click());
      assert.equal(dialog(), null);
      assert.equal(document.activeElement.id, 'open-sign-in');

      await open();
      await act(async () => dialog().dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'Escape', code: 'Escape', bubbles: true,
      })));
      assert.equal(dialog(), null);

      await open();
      await act(async () => document.querySelector('.ReactModal__Overlay').click());
      assert.equal(dialog(), null);
      assert.equal(closed, 3);
      assert.equal(window.location.href, 'http://localhost/');
    });

    await t.test('Google errors and loading stay visible beneath the sign-in heading', async () => {
      await open();
      const google = document.querySelector('[data-google]');
      assert.equal(google.dataset.shape, 'pill');
      assert.equal(google.dataset.theme, 'outline');
      await act(async () => google.click());
      assert.equal(document.querySelector('[role="alert"]').textContent, 'Google sign-in failed. Please try again.');
      await act(async () => store.dispatch({ type: 'auth-state', payload: { signingIn: true, error: null } }));
      assert.equal(document.querySelector('[data-google]'), null);
      assert.equal(document.querySelector('[role="status"]').textContent, 'Signing in…');
      assert.equal(document.querySelector('[aria-busy="true"]') !== null, true);
    });

    await t.test('successful authentication invokes its callback and closes the dialog', async () => {
      await act(async () => store.dispatch({ type: 'auth-state', payload: { status: 'authenticated', signingIn: false } }));
      assert.equal(authenticated, 1);
      assert.equal(closed, 3);
      assert.equal(dialog(), null);
    });
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await rm(temporary, { recursive: true, force: true });
  }
});
