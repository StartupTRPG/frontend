import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import { useAuth } from './useAuth';

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
    getProfile: () => authenticatedRequest(apiService.getProfile),
    updateProfile: (userData: Partial<User>) => 
      authenticatedRequest(token => apiService.updateProfile(token, userData)),
  };
}; 