import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSocket } from './hooks/useSocket';
import Loading from './components/common/Loading';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateProfile from './pages/CreateProfile';
import RoomLobby from './pages/RoomLobby';
import GamePage from './pages/GamePage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketMessageLogger } from './components/common/SocketMessageLogger';

function AppWithSocket() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { isConnected, error: connectionError } = useSocket({
    token: accessToken || '',
  });
  const showLoading = isAuthenticated && !isConnected;

  return (
    <>
      {/* 소켓 메시지 로거 (개발 환경에서만 활성화) */}
      <SocketMessageLogger 
        enabled={process.env.NODE_ENV === 'development'}
        logLevel="all"
      />
      
      {showLoading && <Loading message="소켓 연결 중..." />}
      
      {/* 소켓 연결 에러 표시 */}
      {isAuthenticated && connectionError && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: '#f44336',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '4px',
          zIndex: 1000,
          maxWidth: '300px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            연결 오류
          </div>
          <div style={{ fontSize: '14px', marginBottom: '10px' }}>
            {connectionError}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            새로고침
          </button>
        </div>
      )}

      {/* 소켓 연결 상태 표시 */}
      {isAuthenticated && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          backgroundColor: isConnected ? '#4CAF50' : '#ff9800',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          {isConnected ? '🔗 연결됨' : '⏳ 연결 중...'}
        </div>
      )}

      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-profile" 
            element={
              <ProtectedRoute>
                <CreateProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/room/:roomId" 
            element={
              <ProtectedRoute>
                <RoomLobby />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/game/:roomId" 
            element={
              <ProtectedRoute>
                <GamePage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

export default AppWithSocket; 