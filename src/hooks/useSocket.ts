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
}

export const useSocket = (options: UseSocketOptions) => {
  const { token, onConnect, onDisconnect, onError } = options;
  const socketRef = useRef<Socket | null>(null);
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
    if (!socketRef.current?.connected) throw new Error('Socket is not connected');
    
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