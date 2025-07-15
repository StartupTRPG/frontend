import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAuth } from './useAuth';
import { handleUnauthorizedError } from '../utils/authUtils';

export const useAutoRefresh = () => {
  const { accessToken } = useAuthStore();
  const { refreshAccessToken } = useAuth();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleTokenRefresh = useCallback(async () => {
    if (!accessToken) return;

    // 토큰 만료 10분 전에 갱신 (더 안전한 시간)
    const expiresIn = 3600; // 1시간 (실제 토큰 만료 시간에 맞춰 조정 필요)
    const refreshTime = (expiresIn - 600) * 1000; // 10분 전

    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        await refreshAccessToken();
        // 갱신 후 다음 갱신 스케줄링
        scheduleTokenRefresh();
      } catch (error) {
        console.error('토큰 갱신 실패:', error);
        // 401 에러인 경우 인증 데이터 정리 및 로그인 페이지 리디렉션
        if (error instanceof Error && error.message.includes('인증이 만료되었습니다')) {
          handleUnauthorizedError();
        }
      }
    }, refreshTime);
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    // 기존 타이머 정리
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // 토큰이 있으면 갱신 스케줄링
    if (accessToken) {
      scheduleTokenRefresh();
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [accessToken, scheduleTokenRefresh]);
}; 