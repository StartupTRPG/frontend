import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEventType, UserInfo } from '../types/socket';
import { handleUnauthorizedError } from '../utils/authUtils';
import { useSocketStore } from '../stores/socketStore';

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
let globalLastRoom: string | null = null;
let globalEventListenersRegistered = false; // 이벤트 리스너 등록 여부 추적
let isConnecting = false; // 연결 중인지 추적
let isJoiningRoom = false; // 방 입장 중인지 추적
let currentJoiningRoomId: string | null = null; // 현재 입장 시도 중인 방 ID
let lastLeaveTime = 0; // 마지막 방 나가기 시간 (재입장 방지용)

export const useSocket = (options: UseSocketOptions) => {
  const { token, onConnect, onDisconnect, onError, onRoomRejoin } = options;
  const onRoomRejoinRef = useRef(onRoomRejoin);
  
  // 전역 소켓 상태 사용
  const {
    socket,
    isConnected,
    userInfo,
    currentRoom,
    error,
    setSocket,
    setIsConnected,
    setUserInfo,
    setCurrentRoom,
    setError,
    reset,
  } = useSocketStore();
  
  // 콜백이 변경될 때 ref 업데이트
  useEffect(() => {
    onRoomRejoinRef.current = onRoomRejoin;
  }, [onRoomRejoin]);

  // 소켓 연결
  const connect = useCallback(() => {
    // 토큰이 없거나 빈 문자열인 경우 연결 시도하지 않음
    if (!token || token.trim() === '') {
      console.log('[useSocket] 토큰이 없거나 빈 문자열 - 소켓 연결 시도하지 않음');
      setError('유효한 토큰이 필요합니다.');
      setIsConnected(false);
      return;
    }

    // 이미 연결 중이거나 연결된 경우 중복 연결 방지
    if (isConnecting || (globalSocket?.connected && globalToken === token)) {
      console.log('[useSocket] 이미 연결 중이거나 연결됨 - 중복 연결 방지');
      return;
    }

    // 토큰이 변경되었거나 연결이 끊어진 경우 새로 연결
    if (globalSocket) {
      console.log('[useSocket] 기존 소켓 연결 해제');
      globalSocket.disconnect();
      globalSocket = null;
      globalEventListenersRegistered = false; // 이벤트 리스너 재등록 필요
    }

    console.log('[useSocket] 새 소켓 연결 생성');
    isConnecting = true;
    const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', {
      auth: { token },
      transports: ['websocket'],
    });

    // 이벤트 리스너가 아직 등록되지 않은 경우에만 등록
    if (!globalEventListenersRegistered) {
      console.log('[useSocket] 전역 이벤트 리스너 등록');
      
      // 소켓 기본 연결 이벤트 처리
      socket.on('connect', () => {
        console.log('[useSocket] 소켓 기본 연결 성공, sid:', socket.id);
        isConnecting = false;
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('[useSocket] 소켓 기본 연결 해제, reason:', reason);
        isConnecting = false;
        setIsConnected(false);
        setUserInfo(null);
        setCurrentRoom(null);
        globalLastRoom = null;
        isJoiningRoom = false;
        currentJoiningRoomId = null;
        onDisconnect?.();
      });

      socket.on(SocketEventType.CONNECT_SUCCESS, (data: UserInfo) => {
        console.log('[useSocket] CONNECT_SUCCESS 이벤트 수신:', data);
        setIsConnected(true);
        setUserInfo(data);
        setError(null);
        onConnect?.(data);
        
        // 재연결 시 마지막 방에 자동으로 다시 입장 (지연 추가)
        if (globalLastRoom && globalSocket) {
          console.log('[useSocket] 재연결 시 방 자동 입장 예약:', globalLastRoom);
          setTimeout(() => {
            if (globalSocket?.connected && globalLastRoom) {
              console.log('[useSocket] 재연결 후 방 자동 입장 실행:', globalLastRoom);
              globalSocket.emit(SocketEventType.JOIN_ROOM, { room_id: globalLastRoom }, (response: any) => {
                if (!response?.error) {
                  setCurrentRoom(globalLastRoom);
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
          }, 1000); // 1초 지연으로 안정성 확보
        }
      });

      socket.on('connect_failed', (data: { message: string }) => {
        console.log('[useSocket] connect_failed 이벤트 수신:', data);
        isConnecting = false;
        setIsConnected(false);
        setError(data.message);
        
        // 빈 토큰이나 유효하지 않은 토큰 에러인 경우에만 인증 정보 삭제
        if (data.message.includes('Valid token is required') || 
            data.message.includes('No token provided') ||
            data.message.includes('토큰이 필요합니다')) {
          console.log('[useSocket] 토큰 관련 에러 - 인증 정보 삭제 및 로그인 페이지 이동');
          handleUnauthorizedError();
        }
        onError?.(data.message);
      });

      socket.on(SocketEventType.ERROR, (data: { message: string }) => {
        console.log('[useSocket] ERROR 이벤트 수신:', data);
        setError(data.message);
        onError?.(data.message);
      });

      socket.on(SocketEventType.DISCONNECT, () => {
        console.log('[useSocket] DISCONNECT 이벤트 수신');
        isConnecting = false;
        setIsConnected(false);
        setUserInfo(null);
        setCurrentRoom(null);
        globalLastRoom = null; // 전역 변수도 초기화
        onDisconnect?.();
      });

      globalEventListenersRegistered = true;
    }

    globalSocket = socket;
    globalToken = token;
    setSocket(socket);
  }, [token, onConnect, onDisconnect, onError, setSocket, setIsConnected, setUserInfo, setCurrentRoom, setError]);

  // 소켓 연결 해제
  const disconnect = useCallback(() => {
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
      globalToken = null;
      globalEventListenersRegistered = false;
      globalLastRoom = null;
      isConnecting = false;
      isJoiningRoom = false; // 방 입장 상태 초기화
      currentJoiningRoomId = null; // 현재 입장 시도 중인 방 ID 초기화
      lastLeaveTime = 0; // 방 나가기 시간 초기화
      reset();
    }
  }, [reset]);

  // 방 입장
  const joinRoom = useCallback((roomId: string, password?: string) => {
    if (!globalSocket || !globalSocket.connected) {
      console.warn('[useSocket] 소켓이 연결되지 않음, 방 입장 대기');
      return Promise.reject(new Error('Socket is not connected'));
    }
    
    // 이미 같은 방에 있으면 중복 입장 방지
    if (currentRoom === roomId) {
      console.log('[useSocket] 이미 방에 입장되어 있음:', roomId);
      return Promise.resolve();
    }
    
    // 방 나가기 후 500ms 이내 재입장 방지 (1초에서 500ms로 단축)
    if (Date.now() - lastLeaveTime < 500) {
      console.warn('[useSocket] 방 나가기 후 짧은 시간 내 재입장 시도 방지:', roomId);
      return Promise.reject(new Error('Please wait before rejoining the room'));
    }
    
    // 이미 방 입장 중이면 중복 요청 방지
    if (isJoiningRoom) {
      console.warn('[useSocket] 이미 방 입장 중:', currentJoiningRoomId);
      if (currentJoiningRoomId === roomId) {
        return Promise.reject(new Error('Already joining this room'));
      } else {
        return Promise.reject(new Error('Already joining another room'));
      }
    }
    
    return new Promise<void>((resolve, reject) => {
      console.log('[useSocket] 방 입장 시도:', roomId);
      
      // 방 입장 상태 설정
      isJoiningRoom = true;
      currentJoiningRoomId = roomId;
      
      // 타임아웃 설정 (10초)
      const timeout = setTimeout(() => {
        console.error('[useSocket] 방 입장 타임아웃:', roomId);
        isJoiningRoom = false;
        currentJoiningRoomId = null;
        reject(new Error('Room join timeout'));
      }, 10000);
      
      globalSocket!.emit(SocketEventType.JOIN_ROOM, { room_id: roomId, password }, (response: any) => {
        clearTimeout(timeout);
        
        // 방 입장 상태 초기화
        isJoiningRoom = false;
        currentJoiningRoomId = null;
        
        if (response?.error) {
          console.error('[useSocket] 방 입장 실패:', response.error);
          
          // 방이 삭제된 경우 특별 처리
          if (response.error.includes('Room not found') || 
              response.error.includes('deleted') ||
              response.error.includes('존재하지 않습니다')) {
            console.log('[useSocket] 방이 삭제됨, 상태 초기화:', roomId);
            setCurrentRoom(null);
            globalLastRoom = null;
            reject(new Error('Room has been deleted'));
          } else {
            reject(new Error(response.error));
          }
        } else {
          console.log('[useSocket] 방 입장 성공:', roomId);
          setCurrentRoom(roomId);
          globalLastRoom = roomId;
          resolve();
        }
      });
    });
  }, [currentRoom, setCurrentRoom]);

  // 방 나가기
  const leaveRoom = useCallback(() => {
    if (!globalSocket?.connected || !currentRoom) return;

    // 마지막 방 나가기 시간이 500ms 이내면 재입장 방지 (1초에서 500ms로 단축)
    if (Date.now() - lastLeaveTime < 500) {
      console.warn('[useSocket] 짧은 시간 내 방 나가기 시도, 재입장 방지');
      return;
    }

    console.log('[useSocket] 방 나가기:', currentRoom);
    
    // 상태를 먼저 초기화 (낙관적 업데이트)
    setCurrentRoom(null);
    globalLastRoom = null;
    lastLeaveTime = Date.now(); // 방 나가기 시간 기록
    
    // 소켓 이벤트 전송
    globalSocket.emit(SocketEventType.LEAVE_ROOM, { room_id: currentRoom });
  }, [currentRoom, setCurrentRoom]);

  // 레디 상태 변경
  const toggleReady = useCallback((roomId: string, ready: boolean) => {
    if (!globalSocket?.connected) return;
    globalSocket.emit(SocketEventType.READY, { room_id: roomId, ready });
  }, []);

  // 게임 시작
  const startGame = useCallback((roomId: string) => {
    if (!globalSocket?.connected) return;
    globalSocket.emit(SocketEventType.START_GAME, { room_id: roomId });
  }, []);

  // 게임 종료
  const finishGame = useCallback((roomId: string) => {
    if (!globalSocket?.connected) return;
    globalSocket.emit(SocketEventType.FINISH_GAME, { room_id: roomId });
  }, []);

  // 로비 메시지 전송
  const sendLobbyMessage = useCallback((roomId: string, message: string) => {
    if (!globalSocket?.connected) return;
    globalSocket.emit(SocketEventType.LOBBY_MESSAGE, {
      room_id: roomId,
      message,
      message_type: 'lobby'
    });
  }, []);

  // 게임 메시지 전송
  const sendGameMessage = useCallback((roomId: string, message: string) => {
    if (!globalSocket?.connected) return;
    globalSocket.emit(SocketEventType.GAME_MESSAGE, {
      room_id: roomId,
      message,
      message_type: 'game'
    });
  }, []);

  // 컴포넌트 마운트 시 연결
  useEffect(() => {
    connect();
  }, [connect]);

  return {
    socket: globalSocket, // 전역 소켓 인스턴스 반환
    isConnected,
    userInfo,
    currentRoom,
    error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    finishGame,
    sendLobbyMessage,
    sendGameMessage,
  };
};

// 전역 소켓 연결을 완전히 해제하는 함수 (로그아웃 시 사용)
export const disconnectGlobalSocket = () => {
  console.log('[useSocket] 전역 소켓 연결 완전 해제');
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
  globalToken = null;
  globalEventListenersRegistered = false;
  globalLastRoom = null;
  isConnecting = false;
  isJoiningRoom = false; // 방 입장 상태 초기화
  currentJoiningRoomId = null; // 현재 입장 시도 중인 방 ID 초기화
  lastLeaveTime = 0; // 방 나가기 시간 초기화
  
  // 전역 상태도 초기화
  const { reset } = useSocketStore.getState();
  reset();
}; 