import React from 'react';

interface LoadingProps {
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = "소켓 연결 중..." }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{
          color: '#374151',
          fontWeight: '500',
          margin: 0,
          fontSize: '16px'
        }}>{message}</p>
        <div style={{
          display: 'flex',
          gap: '4px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'bounce 1.4s ease-in-out infinite both'
          }}></div>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'bounce 1.4s ease-in-out infinite both',
            animationDelay: '0.16s'
          }}></div>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'bounce 1.4s ease-in-out infinite both',
            animationDelay: '0.32s'
          }}></div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Loading; 