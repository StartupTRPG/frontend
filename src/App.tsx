import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import RoomLobby from './pages/RoomLobby';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/common/Loading';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useSocket } from './hooks/useSocket';
import { useAuthStore } from './stores/authStore';

function App() {
  return (
    <Router>
      <AppWithSocket />
    </Router>
  );
}

function AppWithSocket() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { isConnected, error: connectionError } = useSocket({
    token: accessToken || '',
  });
  const showLoading = isAuthenticated && !isConnected;

  return (
    <>
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
      {isAuthenticated && isConnected && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: '#4caf50',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          zIndex: 1000,
          fontSize: '12px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          연결됨
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Home />
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/room/:roomId" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <RoomLobby />
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  );
}

export default App; 