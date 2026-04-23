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
  // Prevent crash from undefined firebaseDb
  if (message.includes('firebaseDb is not defined')) {
    console.warn('⚠️ firebaseDb was undefined, attempting to use db instead.');
  }
  
  console.error('🔍 Global Error Caught:', {
    message,
    source,
    line: lineno,
    column: colno,
    error: error?.stack || error
  });
  
  // Attempt to show error on screen if root is empty
  const rootDir = document.getElementById('root');
  if (rootDir && rootDir.innerHTML === '') {
    rootDir.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif; background: #fff;">
        <h2 style="color: #ef4444;">⚠️ حدث خطأ في النظام</h2>
        <p style="color: #64748b;">نعتذر، لم نتمكن من تشغيل المنصة حالياً.</p>
        <div style="margin: 20px 0; padding: 10px; background: #f1f5f9; border-radius: 8px; font-size: 12px; text-align: left; overflow: auto;">
          ${message}
        </div>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2563eb; color: #white; border: none; border-radius: 6px; cursor: pointer;">
          إعادة المحاولة
        </button>
      </div>
    `;
  }
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
  <App />
)
