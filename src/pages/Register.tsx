import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    nickname: '',
    password: '',
    confirmPassword: '',
  });
  
  const { register, loading, error, success, resetState } = useRegister();
  const navigate = useNavigate();

  // 회원가입 성공 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 2000); // 2초 후 리다이렉트

      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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

  // 회원가입 성공 시 성공 메시지 표시
  if (success) {
    return (
      <div>
        <h1>회원가입 완료</h1>
        <p>회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.</p>
        <p>잠시만 기다려주세요...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>회원가입</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="nickname">Nickname:</label>
          <input
            type="text"
            id="nickname"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? '회원가입 중...' : '회원가입'}
        </button>
      </form>
      <p>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
};

export default Register; 