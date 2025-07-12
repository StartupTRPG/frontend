import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import RoomLobby from './pages/RoomLobby';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/common/Loading';
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
  const { isAuthenticated } = useAuthStore();
  const { isConnecting } = useSocket();
  const showLoading = isAuthenticated && isConnecting;

  return (
    <>
      {showLoading && <Loading message="소켓 연결 중..." />}
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Home />
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
      </Routes>
    </>
  );
}

export default App; 