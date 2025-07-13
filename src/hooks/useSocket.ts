import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEventType, UserInfo } from '../types/socket';

interface SocketState {
  isConnected: boolean;
  userInfo: UserInfo | null;
  currentRoom: string | null;
  error: string | null;
}

interface UseSocketOptions {
  token: string;
  onConnect?: (userInfo: UserInfo) => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onRoomRejoin?: (roomId: string) => void; // 재연결 후 방 재입장 시 호출
}

export const useSocket = (options: UseSocketOptions) => {
  const { token, onConnect, onDisconnect, onError, onRoomRejoin } = options;
  const socketRef = useRef<Socket | null>(null);
  const lastRoomRef = useRef<string | null>(null); // 마지막으로 입장한 방 ID 저장
  const onRoomRejoinRef = useRef(onRoomRejoin); // 콜백을 ref로 저장
  
  // 콜백이 변경될 때 ref 업데이트
  useEffect(() => {
    onRoomRejoinRef.current = onRoomRejoin;
  }, [onRoomRejoin]);
  
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    userInfo: null,
    currentRoom: null,
    error: null,
  });

  // 소켓 연결
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    const socket = io('http://localhost:8000', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on(SocketEventType.CONNECT_SUCCESS, (data: UserInfo) => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        userInfo: data,
        error: null,
      }));
      onConnect?.(data);
      
      // 재연결 시 마지막 방에 자동으로 다시 입장
      if (lastRoomRef.current && socketRef.current) {
        console.log('[useSocket] 재연결 시 방 자동 입장:', lastRoomRef.current);
        socketRef.current.emit(SocketEventType.JOIN_ROOM, { room_id: lastRoomRef.current }, (response: any) => {
          if (!response?.error) {
            setState(prev => ({ ...prev, currentRoom: lastRoomRef.current }));
            console.log('[useSocket] 재연결 후 방 입장 성공:', lastRoomRef.current);
            if (lastRoomRef.current) {
              onRoomRejoinRef.current?.(lastRoomRef.current); // 재연결 후 방 재입장 성공 시 콜백 호출
            }
          } else {
            console.error('[useSocket] 재연결 후 방 입장 실패:', response.error);
            lastRoomRef.current = null; // 실패 시 마지막 방 정보 초기화
          }
        });
      }
    });

    socket.on('connect_failed', (data: { message: string }) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: data.message,
      }));
      onError?.(data.message);
    });

    socket.on(SocketEventType.ERROR, (data: { message: string }) => {
      setState(prev => ({
        ...prev,
        error: data.message,
      }));
      onError?.(data.message);
    });

    socket.on(SocketEventType.DISCONNECT, () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        userInfo: null,
        currentRoom: null,
      }));
      onDisconnect?.();
    });

    socketRef.current = socket;
  }, [token, onConnect, onDisconnect, onError]);

  // 소켓 연결 해제
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // 방 입장
  const joinRoom = useCallback((roomId: string, password?: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn('[useSocket] 소켓이 연결되지 않음, 방 입장 대기');
      return Promise.reject(new Error('Socket is not connected'));
    }
    
    // 이미 같은 방에 있으면 중복 입장 방지
    if (state.currentRoom === roomId) {
      console.log('[useSocket] 이미 방에 입장되어 있음:', roomId);
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve, reject) => {
      console.log('[useSocket] 방 입장 시도:', roomId);
      socketRef.current!.emit(SocketEventType.JOIN_ROOM, { room_id: roomId, password }, (response: any) => {
        if (response?.error) {
          console.error('[useSocket] 방 입장 실패:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('[useSocket] 방 입장 성공:', roomId);
          setState(prev => ({ ...prev, currentRoom: roomId }));
          lastRoomRef.current = roomId; // 마지막 방 ID 저장
          resolve();
        }
      });
    });
  }, [state.currentRoom]);

  // 방 나가기
  const leaveRoom = useCallback(() => {
    if (!socketRef.current?.connected || !state.currentRoom) return;
    socketRef.current.emit(SocketEventType.LEAVE_ROOM, { room_id: state.currentRoom });
    setState(prev => ({ ...prev, currentRoom: null }));
    lastRoomRef.current = null; // 마지막 방 ID 초기화
  }, [state.currentRoom]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    ...state,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
  };
}; 