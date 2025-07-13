import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import { useAuth } from './useAuth';
import { UserProfileUpdate, UserProfileCreate } from '../services/api';

export const useApi = () => {
  const { accessToken } = useAuthStore();
  const { refreshAccessToken } = useAuth();

  const authenticatedRequest = useCallback(async <T>(
    requestFn: (token: string) => Promise<T>
  ): Promise<T> => {
    if (!accessToken) {
      throw new Error('인증 토큰이 없습니다.');
    }

    try {
      return await requestFn(accessToken);
    } catch (error: any) {
      // 401 에러 시 토큰 갱신 시도
      if (error.message?.includes('401') || error.status === 401) {
        const newToken = await refreshAccessToken();
        return await requestFn(newToken);
      }
      throw error;
    }
  }, [accessToken, refreshAccessToken]);

  return {
    getMyProfile: useCallback(() => authenticatedRequest(token => apiService.getMyProfile(token)), [authenticatedRequest]),
    updateMyProfile: useCallback((userData: UserProfileUpdate) => 
      authenticatedRequest(token => apiService.updateMyProfile(token, userData)), [authenticatedRequest]),
    createProfile: useCallback((profileData: UserProfileCreate) =>
      authenticatedRequest(token => apiService.createProfile(token, profileData)), [authenticatedRequest]),
    getUserProfile: useCallback((profileId: string) =>
      authenticatedRequest(token => apiService.getUserProfile(token, profileId)), [authenticatedRequest]),
    searchProfiles: useCallback((query: string, limit?: number) =>
      authenticatedRequest(token => apiService.searchProfiles(token, query, limit)), [authenticatedRequest]),
    getRooms: useCallback((params?: any) => authenticatedRequest(token => apiService.getRooms(token, params)), [authenticatedRequest]),
    getMyRoom: useCallback(() => authenticatedRequest(token => apiService.getMyRoom(token)), [authenticatedRequest]),
    createRoom: useCallback((roomData: any) => 
      authenticatedRequest(token => apiService.createRoom(token, roomData)), [authenticatedRequest]),
    getRoom: useCallback((roomId: string) => authenticatedRequest(token => apiService.getRoom(token, roomId)), [authenticatedRequest]),
    updateRoom: useCallback((roomId: string, roomData: any) =>
      authenticatedRequest(token => apiService.updateRoom(token, roomId, roomData)), [authenticatedRequest]),
    deleteRoom: useCallback((roomId: string) =>
      authenticatedRequest(token => apiService.deleteRoom(token, roomId)), [authenticatedRequest]),
    startGame: useCallback((roomId: string) =>
      authenticatedRequest(token => apiService.startGame(token, roomId)), [authenticatedRequest]),
    endGame: useCallback((roomId: string) =>
      authenticatedRequest(token => apiService.endGame(token, roomId)), [authenticatedRequest]),
    getChatHistory: useCallback((roomId: string, page?: number, limit?: number) =>
      authenticatedRequest(token => apiService.getChatHistory(token, roomId, page, limit)), [authenticatedRequest]),
    getLobbyChatHistory: useCallback((page?: number, limit?: number) =>
      authenticatedRequest(token => apiService.getLobbyChatHistory(token, page, limit)), [authenticatedRequest]),
    getGameChatHistory: useCallback((page?: number, limit?: number) =>
      authenticatedRequest(token => apiService.getGameChatHistory(token, page, limit)), [authenticatedRequest]),
    deleteChatHistory: useCallback((roomId: string) =>
      authenticatedRequest(token => apiService.deleteChatHistory(token, roomId)), [authenticatedRequest]),
    logout: useCallback(() => apiService.logout(), []),
  };
}; 