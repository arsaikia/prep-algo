/* eslint-disable react/jsx-filename-extension */
/* eslint-disable import/order */
import React from 'react';

import ReactDOM from 'react-dom/client';

import './index.css';
import { Provider } from 'react-redux';

import App from './App';
import store from './stores/stores';

import { CookiesProvider } from 'react-cookie';

// eslint-disable-next-line no-undef
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <CookiesProvider>
        <App />
      </CookiesProvider>
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
