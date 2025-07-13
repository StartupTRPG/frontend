import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { UserProfileCreate } from '../types/profile';

const CreateProfile: React.FC = () => {
  const navigate = useNavigate();
  const { createProfile, loading, error } = useProfile();
  const [formData, setFormData] = useState<UserProfileCreate>({
    display_name: '',
    bio: '',
    avatar_url: '',
    user_level: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.display_name.trim()) {
      alert('표시명을 입력해주세요.');
      return;
    }

    try {
      await createProfile(formData);
      alert('프로필이 성공적으로 생성되었습니다!');
      navigate('/home');
    } catch (error) {
      console.error('프로필 생성 실패:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '50px auto', 
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>프로필 생성</h1>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            표시명 *
          </label>
          <input
            type="text"
            name="display_name"
            value={formData.display_name}
            onChange={handleInputChange}
            placeholder="게임에서 사용할 표시명을 입력하세요"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
            maxLength={30}
            required
          />
          <small style={{ color: '#666' }}>
            {formData.display_name.length}/30자
          </small>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            자기소개
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="자신을 소개해주세요 (선택사항)"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              minHeight: '100px',
              resize: 'vertical'
            }}
            maxLength={500}
          />
          <small style={{ color: '#666' }}>
            {formData.bio?.length || 0}/500자
          </small>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            아바타 URL
          </label>
          <input
            type="url"
            name="avatar_url"
            value={formData.avatar_url}
            onChange={handleInputChange}
            placeholder="프로필 이미지 URL을 입력하세요 (선택사항)"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            사용자 레벨
          </label>
          <input
            type="number"
            name="user_level"
            value={formData.user_level}
            onChange={(e) => setFormData(prev => ({ ...prev, user_level: parseInt(e.target.value) || 1 }))}
            min="1"
            max="100"
            style={{
              width: '100px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
          <small style={{ color: '#666', marginLeft: '10px' }}>
            1-100 사이의 값을 입력하세요
          </small>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/home')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '생성 중...' : '프로필 생성'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProfile; 