import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import { LoginCredentials, RegisterCredentials } from '../services/api';
import { handleUnauthorizedError } from '../utils/authUtils';
import { disconnectGlobalSocket } from './useSocket';

export const useAuth = () => {
  const {
    isAuthenticated,
    user,
    accessToken,
    loading,
    error,
    login: storeLogin,
    logout: storeLogout,
    setLoading,
    setError,
    updateAccessToken,
  } = useAuthStore();

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.login(credentials);
      const accessToken = response.data.access_token;
      // refreshToken은 쿠키에서 자동 관리되므로 저장하지 않음
      
      // 사용자 정보 가져오기
      const userResponse = await apiService.getCurrentUser(accessToken);
      const user = userResponse.data;
      
      // store에 로그인 상태 저장
      storeLogin(user, accessToken);
      
      return { user, accessToken };
    } catch (error) {
      setError(error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.register(credentials);
      return response;
    } catch (error) {
      setError(error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.');
      throw error;
    }
  };

  const logout = async () => {
    try {
      // 전역 소켓 연결 해제
      disconnectGlobalSocket();
      await apiService.logout();
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      storeLogout();
      // 페이지 새로고침으로 모든 상태 완전 초기화
      window.location.href = '/login';
    }
  };

  const refreshAccessToken = async () => {
    try {
      // refresh token은 쿠키에서 자동으로 전송됨
      const response = await apiService.refreshToken();
      updateAccessToken(response.data.access_token);
      return response.data.access_token;
    } catch (error) {
      // 401 에러인 경우 인증 데이터 정리 및 로그인 페이지 리디렉션
      if (error instanceof Error && error.message.includes('인증이 만료되었습니다')) {
        handleUnauthorizedError();
      } else {
        storeLogout(); // 다른 에러의 경우 로그아웃만
      }
      throw error;
    }
  };

  const getCurrentUser = async () => {
    if (!accessToken) return null;
    
    try {
      const response = await apiService.getCurrentUser(accessToken);
      return response.data;
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      return null;
    }
  };

  return {
    isAuthenticated,
    user,
    accessToken,
    loading,
    error,
    login,
    register,
    logout,
    refreshAccessToken,
    getCurrentUser,
  };
}; 