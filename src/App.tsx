import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

// 임시 홈 페이지 컴포넌트
const Home: React.FC = () => {
  const { user, logout } = useAuthStore();
  
  return (
    <div>
      <h1>홈페이지</h1>
      <p>환영합니다, {user?.nickname}님!</p>
      <button onClick={logout}>로그아웃</button>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
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
      </Routes>
    </Router>
  );
}

export default App; 