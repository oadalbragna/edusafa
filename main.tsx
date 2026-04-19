import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for offline support and faster loads
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[SW] Service Worker registration failed:', error);
      });
  });
}

// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
  console.error('🔍 Global Error Caught:', {
    message,
    source,
    line: lineno,
    column: colno,
    error: error?.stack || error
  });
  return false;
};

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('🔍 Unhandled Promise Rejection:', event.reason);
});

// Module loading error detector
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  
  // Check for common React/Vite errors
  if (message.includes('Cannot read properties') || 
      message.includes('is not defined') ||
      message.includes('Cannot find module') ||
      message.includes('Failed to resolve')) {
    console.warn('⚠️ Potential Module Import Error:', message);
  }
  
  originalConsoleError.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
