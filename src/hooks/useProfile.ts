import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { UserProfileCreate, UserProfileUpdate } from '../types/profile';

export const useProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  const createProfile = useCallback(async (profileData: UserProfileCreate) => {
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
  }, [accessToken]);

  const getMyProfile = useCallback(async () => {
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
  }, [accessToken]);

  const updateMyProfile = useCallback(async (profileData: UserProfileUpdate) => {
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
  }, [accessToken]);

  const getUserProfile = useCallback(async (profileId: string) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getUserProfile(accessToken, profileId);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '사용자 프로필 조회 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const searchProfiles = useCallback(async (query: string, limit: number = 20) => {
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
  }, [accessToken]);

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