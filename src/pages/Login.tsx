import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
    } catch (error) {
      // The useAuth hook handles the error state
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* 왼쪽 이미지 영역 */}
        <div className="auth-illustration"></div>

        {/* 오른쪽 폼 영역 */}
        <div className="auth-form-section">
          <div className="auth-form-container">
            <img 
              src="/images/image-removebg-preview.png" 
              alt="노는게 제일 좋아" 
              className="auth-title-image" 
            />
            
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className={error ? 'auth-form error' : 'auth-form'}>
              <div className="input-group">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="사원번호"
                  required
                  className="auth-input"
                />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="암호"
                  required
                  className="auth-input"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="auth-button"
              >
                {loading ? '출근 중...' : '출근하기'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                아직 회원이 아니신가요? 
                <Link to="/register" className="link">회원가입</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 