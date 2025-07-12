import { useState } from 'react';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { UserProfileCreate, UserProfileUpdate } from '../types/profile';

export const useProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  const createProfile = async (profileData: UserProfileCreate) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.createProfile(accessToken, profileData);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '프로필 생성 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getMyProfile = async () => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getMyProfile(accessToken);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '프로필 조회 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateMyProfile = async (profileData: UserProfileUpdate) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.updateMyProfile(accessToken, profileData);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '프로필 수정 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getUserProfile = async (userId: string) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getUserProfile(accessToken, userId);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '사용자 프로필 조회 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const searchProfiles = async (query: string, limit: number = 20) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.searchProfiles(accessToken, query, limit);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '프로필 검색 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createProfile,
    getMyProfile,
    updateMyProfile,
    getUserProfile,
    searchProfiles,
  };
}; 