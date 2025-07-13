import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import { useAuth } from './useAuth';
import { UserProfileUpdate, UserProfileCreate } from '../services/api';

export const useApi = () => {
  const { accessToken } = useAuthStore();
  const { refreshAccessToken } = useAuth();

  const authenticatedRequest = async <T>(
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
  };

  return {
    getMyProfile: () => authenticatedRequest(token => apiService.getMyProfile(token)),
    updateMyProfile: (userData: UserProfileUpdate) => 
      authenticatedRequest(token => apiService.updateMyProfile(token, userData)),
    createProfile: (profileData: UserProfileCreate) =>
      authenticatedRequest(token => apiService.createProfile(token, profileData)),
    getUserProfile: (profileId: string) =>
      authenticatedRequest(token => apiService.getUserProfile(token, profileId)),
    searchProfiles: (query: string, limit?: number) =>
      authenticatedRequest(token => apiService.searchProfiles(token, query, limit)),
    getRooms: (params?: any) => authenticatedRequest(token => apiService.getRooms(token, params)),
    getMyRoom: () => authenticatedRequest(token => apiService.getMyRoom(token)),
    createRoom: (roomData: any) => 
      authenticatedRequest(token => apiService.createRoom(token, roomData)),
    getRoom: (roomId: string) => authenticatedRequest(token => apiService.getRoom(token, roomId)),
    updateRoom: (roomId: string, roomData: any) =>
      authenticatedRequest(token => apiService.updateRoom(token, roomId, roomData)),
    deleteRoom: (roomId: string) =>
      authenticatedRequest(token => apiService.deleteRoom(token, roomId)),
    startGame: (roomId: string) =>
      authenticatedRequest(token => apiService.startGame(token, roomId)),
    endGame: (roomId: string) =>
      authenticatedRequest(token => apiService.endGame(token, roomId)),
    getChatHistory: (roomId: string, page?: number, limit?: number) =>
      authenticatedRequest(token => apiService.getChatHistory(token, roomId, page, limit)),
    getLobbyChatHistory: (page?: number, limit?: number) =>
      authenticatedRequest(token => apiService.getLobbyChatHistory(token, page, limit)),
    getGameChatHistory: (page?: number, limit?: number) =>
      authenticatedRequest(token => apiService.getGameChatHistory(token, page, limit)),
    deleteChatHistory: (roomId: string) =>
      authenticatedRequest(token => apiService.deleteChatHistory(token, roomId)),
    logout: () => apiService.logout(),
  };
}; 