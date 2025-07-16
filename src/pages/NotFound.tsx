import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 5초 카운트다운 후 홈으로 자동 이동
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '90%'
      }}>
        {/* 404 아이콘 */}
        <div style={{
          fontSize: '120px',
          color: '#e74c3c',
          marginBottom: '20px',
          fontWeight: 'bold'
        }}>
          404
        </div>

        {/* 메인 메시지 */}
        <h1 style={{
          fontSize: '28px',
          color: '#2c3e50',
          marginBottom: '15px',
          fontWeight: '600'
        }}>
          페이지를 찾을 수 없습니다
        </h1>

        {/* 상세 메시지 */}
        <p style={{
          fontSize: '16px',
          color: '#7f8c8d',
          marginBottom: '30px',
          lineHeight: '1.6'
        }}>
          요청하신 페이지가 존재하지 않거나 삭제되었을 수 있습니다.
          <br />
          {location.pathname.startsWith('/room/') && (
            <span style={{ color: '#e74c3c', fontWeight: '500' }}>
              해당 방이 존재하지 않거나 삭제되었습니다.
            </span>
          )}
        </p>

        {/* 카운트다운 메시지 */}
        <p style={{
          fontSize: '14px',
          color: '#95a5a6',
          marginBottom: '30px'
        }}>
          {countdown}초 후 홈 페이지로 자동 이동됩니다.
        </p>

        {/* 버튼들 */}
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleGoHome}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2980b9'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3498db'}
          >
            홈으로 이동
          </button>

          <button
            onClick={handleGoBack}
            style={{
              padding: '12px 24px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7f8c8d'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#95a5a6'}
          >
            이전 페이지로
          </button>
        </div>

        {/* 현재 경로 정보 (개발용) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#ecf0f1',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#7f8c8d'
          }}>
            <strong>현재 경로:</strong> {location.pathname}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound; 