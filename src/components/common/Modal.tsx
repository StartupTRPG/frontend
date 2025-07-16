import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showCloseButton = true
}) => {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          color: '#166534'
        };
      case 'warning':
        return {
          backgroundColor: '#fffbeb',
          borderColor: '#fde68a',
          color: '#92400e'
        };
      case 'error':
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          color: '#991b1b'
        };
      default:
        return {
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          color: '#1e40af'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Backdrop */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div style={{
        position: 'relative',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: '400px',
        width: '100%',
        margin: '0 16px',
        border: `1px solid ${typeStyles.borderColor}`,
        ...typeStyles
      }}>
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '16px' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              <span style={{ 
                fontSize: '24px', 
                marginRight: '12px' 
              }}>
                {getIcon()}
              </span>
              {title && (
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  margin: 0,
                  color: typeStyles.color
                }}>
                  {title}
                </h3>
              )}
            </div>
            {/* X 버튼 */}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: typeStyles.color,
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ✕
            </button>
          </div>
          
          {/* Content */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ 
              fontSize: '14px', 
              lineHeight: '1.6',
              margin: 0,
              color: typeStyles.color
            }}>
              {message}
            </p>
          </div>
          
          {/* Footer */}
          {showCloseButton && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280';
                }}
              >
                확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal; 