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

// 전역 소켓 인스턴스 관리
let globalSocket: Socket | null = null;
let globalToken: string | null = null;
let globalState: SocketState = {
  isConnected: false,
  userInfo: null,
  currentRoom: null,
  error: null,
};
let globalLastRoom: string | null = null;

export const useSocket = (options: UseSocketOptions) => {
  const { token, onConnect, onDisconnect, onError, onRoomRejoin } = options;
  const [state, setState] = useState<SocketState>(globalState);
  const onRoomRejoinRef = useRef(onRoomRejoin);
  
  // 콜백이 변경될 때 ref 업데이트
  useEffect(() => {
    onRoomRejoinRef.current = onRoomRejoin;
  }, [onRoomRejoin]);

  // 소켓 연결
  const connect = useCallback(() => {
    // 이미 같은 토큰으로 연결되어 있으면 재사용
    if (globalSocket?.connected && globalToken === token) {
      console.log('[useSocket] 기존 소켓 연결 재사용');
      setState(globalState);
      return;
    }

    // 토큰이 변경되었거나 연결이 끊어진 경우 새로 연결
    if (globalSocket) {
      console.log('[useSocket] 기존 소켓 연결 해제');
      globalSocket.disconnect();
      globalSocket = null;
    }

    console.log('[useSocket] 새 소켓 연결 생성');
    const socket = io('http://localhost:8000', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on(SocketEventType.CONNECT_SUCCESS, (data: UserInfo) => {
      globalState = {
        ...globalState,
        isConnected: true,
        userInfo: data,
        error: null,
      };
      setState(globalState);
      onConnect?.(data);
      
      // 재연결 시 마지막 방에 자동으로 다시 입장
      if (globalLastRoom && globalSocket) {
        console.log('[useSocket] 재연결 시 방 자동 입장:', globalLastRoom);
        globalSocket.emit(SocketEventType.JOIN_ROOM, { room_id: globalLastRoom }, (response: any) => {
          if (!response?.error) {
            globalState.currentRoom = globalLastRoom;
            setState(globalState);
            console.log('[useSocket] 재연결 후 방 입장 성공:', globalLastRoom);
            if (globalLastRoom) {
              onRoomRejoinRef.current?.(globalLastRoom);
            }
          } else {
            console.error('[useSocket] 재연결 후 방 입장 실패:', response.error);
            globalLastRoom = null;
          }
        });
      }
    });

    socket.on('connect_failed', (data: { message: string }) => {
      globalState = {
        ...globalState,
        isConnected: false,
        error: data.message,
      };
      setState(globalState);
      onError?.(data.message);
    });

    socket.on(SocketEventType.ERROR, (data: { message: string }) => {
      globalState = {
        ...globalState,
        error: data.message,
      };
      setState(globalState);
      onError?.(data.message);
    });

    socket.on(SocketEventType.DISCONNECT, () => {
      globalState = {
        ...globalState,
        isConnected: false,
        userInfo: null,
        currentRoom: null,
      };
      setState(globalState);
      onDisconnect?.();
    });

    globalSocket = socket;
    globalToken = token;
  }, [token, onConnect, onDisconnect, onError]);

  // 소켓 연결 해제
  const disconnect = useCallback(() => {
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
      globalToken = null;
      globalState = {
        isConnected: false,
        userInfo: null,
        currentRoom: null,
        error: null,
      };
      setState(globalState);
    }
  }, []);

  // 방 입장
  const joinRoom = useCallback((roomId: string, password?: string) => {
    if (!globalSocket || !globalSocket.connected) {
      console.warn('[useSocket] 소켓이 연결되지 않음, 방 입장 대기');
      return Promise.reject(new Error('Socket is not connected'));
    }
    
    // 이미 같은 방에 있으면 중복 입장 방지
    if (globalState.currentRoom === roomId) {
      console.log('[useSocket] 이미 방에 입장되어 있음:', roomId);
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve, reject) => {
      console.log('[useSocket] 방 입장 시도:', roomId);
      globalSocket!.emit(SocketEventType.JOIN_ROOM, { room_id: roomId, password }, (response: any) => {
        if (response?.error) {
          console.error('[useSocket] 방 입장 실패:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('[useSocket] 방 입장 성공:', roomId);
          globalState.currentRoom = roomId;
          globalLastRoom = roomId;
          setState(globalState);
          resolve();
        }
      });
    });
  }, []);

  // 방 나가기
  const leaveRoom = useCallback(() => {
    if (!globalSocket?.connected || !globalState.currentRoom) return;
    globalSocket.emit(SocketEventType.LEAVE_ROOM, { room_id: globalState.currentRoom });
    globalState.currentRoom = null;
    globalLastRoom = null;
    setState(globalState);
  }, []);

  // 컴포넌트 마운트 시 연결
  useEffect(() => {
    connect();
  }, [connect]);

  return {
    socket: globalSocket,
    ...state,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
  };
}; 