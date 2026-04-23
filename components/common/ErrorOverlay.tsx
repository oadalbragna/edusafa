import React, { useState, useEffect } from 'react';

const ErrorOverlay: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const handleError = (event: any) => {
      const msg = event.message || event.reason || 'Unknown Error';
      setErrors((prev) => [msg, ...prev].slice(0, 5)); // Keep last 5 errors
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (errors.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'red', color: 'white', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
      <h3>System Error Tracker (Fix required):</h3>
      {errors.map((err, i) => <div key={i}>{err}</div>)}
    </div>
  );
};

export default ErrorOverlay;
