import React from 'react';
// Polyfill for Twilio Voice SDK in Vite
if (typeof global === 'undefined') {
  (window as any).global = window;
}

import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);