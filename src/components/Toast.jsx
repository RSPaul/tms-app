import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div className={`toast animate-fade-in ${isSuccess ? 'toast-success' : 'toast-error'}`}>
      <style>{`
        .toast {
          position: fixed;
          top: 80px;
          right: 24px;
          padding: 16px 24px;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          z-index: 999999;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .toast-success {
          background: linear-gradient(135deg, #10b981, #059669);
          border: 1px solid #34d399;
        }
        .toast-error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: 1px solid #f87171;
        }
      `}</style>
      <span>{isSuccess ? '✅' : '❌'}</span>
      <span>{message}</span>
    </div>
  );
};

export default Toast;
