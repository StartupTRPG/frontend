import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { SocketEventType } from '../types/socket';

interface UseSocketHandlersProps {
  socket: Socket | null;
  roomId: string;
  onRoomUpdate?: () => void;
}

export const useSocketHandlers = ({ socket, roomId, onRoomUpdate }: UseSocketHandlersProps) => {
  const navigate = useNavigate();

  // 방 삭제 이벤트 핸들러
  const handleRoomDeleted = useCallback((data: any) => {
    if (data.room_id === roomId) {
      alert('방이 삭제되었습니다.');
      navigate('/home');
    }
  }, [roomId, navigate]);

  // 사용자 입장/퇴장 이벤트 핸들러
  const handleUserChange = useCallback(() => {
    if (onRoomUpdate) {
      onRoomUpdate();
    }
  }, [onRoomUpdate]);

  // 에러 이벤트 핸들러
  const handleError = useCallback((error: any) => {
    console.error('소켓 에러:', error);
    alert('소켓 연결에 문제가 발생했습니다.');
  }, []);

  // 강제 연결 해제 이벤트 핸들러
  const handleForceDisconnect = useCallback((data: any) => {
    console.log('강제 연결 해제:', data);
    alert('서버에서 연결을 해제했습니다.');
    navigate('/home');
  }, [navigate]);

  // 이벤트 리스너 등록
  const registerEventHandlers = useCallback(() => {
    if (!socket) return;

    // 방 관련 이벤트
    socket.on(SocketEventType.ROOM_DELETED, handleRoomDeleted);
    
    // 사용자 변경 이벤트
    socket.on(SocketEventType.JOIN_ROOM, handleUserChange);
    socket.on(SocketEventType.LEAVE_ROOM, handleUserChange);
    
    // 공통 이벤트
    socket.on(SocketEventType.ERROR, handleError);
    socket.on(SocketEventType.FORCE_DISCONNECT, handleForceDisconnect);

    // 클린업 함수 반환
    return () => {
      socket.off(SocketEventType.ROOM_DELETED, handleRoomDeleted);
      socket.off(SocketEventType.JOIN_ROOM, handleUserChange);
      socket.off(SocketEventType.LEAVE_ROOM, handleUserChange);
      socket.off(SocketEventType.ERROR, handleError);
      socket.off(SocketEventType.FORCE_DISCONNECT, handleForceDisconnect);
    };
  }, [socket, handleRoomDeleted, handleUserChange, handleError, handleForceDisconnect]);

  return {
    registerEventHandlers,
  };
}; 