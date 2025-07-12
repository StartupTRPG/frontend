import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAuth } from './useAuth';

export const useAutoRefresh = () => {
  const { accessToken } = useAuthStore();
  const { refreshAccessToken } = useAuth();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (accessToken) {
      // 토큰 만료 5분 전에 갱신
      const expiresIn = 3600; // 1시간
      const refreshTime = (expiresIn - 300) * 1000; // 5분 전

      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          await refreshAccessToken();
        } catch (error) {
          console.error('토큰 갱신 실패:', error);
        }
      }, refreshTime);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [accessToken, refreshAccessToken]);
}; 