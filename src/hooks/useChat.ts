import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export const useChat = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  const getChatHistory = useCallback(async (roomId: string, page: number = 1, limit: number = 50) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getChatHistory(accessToken, roomId, page, limit);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '채팅 기록 조회 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const deleteChatHistory = useCallback(async (roomId: string) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.deleteChatHistory(accessToken, roomId);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '채팅 기록 삭제 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return {
    loading,
    error,
    getChatHistory,
    deleteChatHistory,
  };
}; 