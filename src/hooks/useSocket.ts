import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../services/socketService';

export const useSocket = () => {
  const { isAuthenticated, accessToken, logout } = useAuthStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      setIsConnecting(true);
      const socket = socketService.connect(accessToken);

      // 인증 성공
      const onSuccess = (data: any) => {
        setIsConnecting(false);
        // 필요시 상태 업데이트
      };

      // 인증 실패
      const onFailed = (data: any) => {
        setIsConnecting(false);
        alert(data.message);
        socketService.disconnect();
        logout();
        navigate('/login');
      };

      socket.on('connect_success', onSuccess);
      socket.on('connect_failed', onFailed);

      // 기타 공통 이벤트 리스너 등록 (예: disconnect, error 등)
      socket.on('disconnect', (reason) => {
        // 필요시 처리
      });

      return () => {
        socket.off('connect_success', onSuccess);
        socket.off('connect_failed', onFailed);
        socket.off('disconnect');
        socketService.disconnect();
      };
    } else {
      socketService.disconnect();
      setIsConnecting(false);
    }
  }, [isAuthenticated, accessToken, logout, navigate]);

  return { socketService, isConnecting };
};