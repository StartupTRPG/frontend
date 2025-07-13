import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { UserProfileCreate, UserProfileUpdate } from '../types/profile';

const CreateProfile: React.FC = () => {
  const navigate = useNavigate();
  const { createProfile, updateMyProfile, getMyProfile, loading, error } = useProfile();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState<UserProfileCreate>({
    display_name: '',
    bio: '',
    avatar_url: 'https://via.placeholder.com/150/007bff/ffffff?text=User',
    user_level: 1,
  });

  const DEFAULT_AVATAR_URL = "https://ssl.pstatic.net/static/pwe/address/img_profile.png";

  // 프로필 조회
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const existingProfile = await getMyProfile();
        setProfile(existingProfile);
        setFormData({
          display_name: existingProfile.display_name,
          bio: existingProfile.bio || '',
          avatar_url: DEFAULT_AVATAR_URL,
          user_level: existingProfile.user_level,
        });
        setIsViewMode(true);
      } catch (error) {
        // 프로필이 없으면 생성 모드로 전환
        console.log('기존 프로필이 없습니다. 새로 생성합니다.');
        setIsViewMode(false);
        setIsEditMode(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.display_name.trim()) {
      alert('표시명을 입력해주세요.');
      return;
    }

    try {
      if (isEditMode) {
        const updateData: UserProfileUpdate = {
          display_name: formData.display_name,
          bio: formData.bio,
          avatar_url: DEFAULT_AVATAR_URL,
          user_level: formData.user_level,
        };
        await updateMyProfile(updateData);
        alert('프로필이 성공적으로 수정되었습니다!');
        setIsEditMode(false);
        setIsViewMode(true);
        // 프로필 다시 조회
        const updatedProfile = await getMyProfile();
        setProfile(updatedProfile);
      } else {
        await createProfile({
          ...formData,
          avatar_url: DEFAULT_AVATAR_URL,
        });
        alert('프로필이 성공적으로 생성되었습니다!');
        navigate('/home');
      }
    } catch (error) {
      console.error('프로필 처리 실패:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditClick = () => {
    setIsEditMode(true);
    setIsViewMode(false);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setIsViewMode(true);
    // 원래 데이터로 복원
    if (profile) {
              setFormData({
          display_name: profile.display_name,
          bio: profile.bio || '',
          avatar_url: DEFAULT_AVATAR_URL,
          user_level: profile.user_level,
        });
    }
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
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        {isViewMode ? '프로필' : isEditMode ? '프로필 수정' : '프로필 생성'}
      </h1>
      
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

      {/* 프로필 조회 모드 */}
      {isViewMode && profile && (
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px', 
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <img 
              src={profile.avatar_url || DEFAULT_AVATAR_URL}
              alt="프로필 이미지"
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
                {profile.display_name}
              </h2>
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#007bff',
                color: 'white',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                레벨 {profile.user_level}
              </div>
              {profile.bio && (
                <p style={{ margin: '10px 0 0 0', color: '#666', lineHeight: '1.5' }}>
                  {profile.bio}
                </p>
              )}
            </div>
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
              홈으로
            </button>
            <button
              type="button"
              onClick={handleEditClick}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              프로필 수정
            </button>
          </div>
        </div>
      )}

      {/* 프로필 생성/수정 모드 */}
      {!isViewMode && (
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

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={isEditMode ? handleCancelEdit : () => navigate('/home')}
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
              {isEditMode ? '취소' : '홈으로'}
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
              {loading ? '처리 중...' : (isEditMode ? '프로필 수정' : '프로필 생성')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateProfile; 