import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider><BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}><AuthProvider><App /></AuthProvider></BrowserRouter></ThemeProvider>
  </React.StrictMode>
);

// Lets browsers offer "Install app". Only in production builds, so it never gets in the way of local development.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
