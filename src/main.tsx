import './polyfills';
import React from 'react';

// Global Chunk Load Error Handler
window.addEventListener('error', (e) => {
  if (/Loading chunk [\d]+ failed/.test(e.message)) {
    console.error('Chunk loading failed, reloading...', e);
    window.location.reload();
  }
});

import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { DatabaseProvider } from './hooks/useDatabase';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DatabaseProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </DatabaseProvider>
  </React.StrictMode>
);
