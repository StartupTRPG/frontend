import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import './Login.css'; // 로그인과 동일한 스타일 적용
import './Register.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    nickname: '',
    password: '',
    confirmPassword: '',
  });
  
  const { register, loading, error, success } = useRegister();
  const navigate = useNavigate();

  useEffect(() => {
    if (success) {
      alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
      navigate('/login');
    }
  }, [success, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    const { confirmPassword, ...registerData } = formData;
    await register(registerData);
  };

  return (
    <div className="auth-container">
      <div className="register-card">
        <div className="auth-form-container">
          <h1 className="register-title">회원가입</h1>
          
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="사원번호"
                required
                className="auth-input"
              />
            </div>
            <div className="input-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="이메일"
                required
                className="auth-input"
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="닉네임"
                required
                className="auth-input"
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="암호"
                required
                className="auth-input"
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="암호 확인"
                required
                className="auth-input"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="auth-button"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              이미 계정이 있으신가요? 
              <Link to="/login" className="link">출근하기</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 