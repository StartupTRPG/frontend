import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEventType, UserInfo } from '../types/socket';
import { handleUnauthorizedError } from '../utils/authUtils';
import { useSocketStore } from '../stores/socketStore';
import {
  GameProgressResponse,
  CreateGameRequest,
  CreateContextRequest,
  CreateAgendaRequest,
  CreateTaskRequest,
  CreateOvertimeRequest,
  UpdateContextRequest,
  CreateExplanationRequest,
  CalculateResultRequest,
  GetGameProgressRequest,
  GameCreatedResponse,
  ContextCreatedResponse,
  AgendaCreatedResponse,
  TaskCreatedResponse,
  OvertimeCreatedResponse,
  ContextUpdatedResponse,
  ExplanationCreatedResponse,
  ResultCalculatedResponse,
  ErrorResponse,
  Player
} from '../types/game';

interface UseSocketOptions {
  token: string;
  onConnect?: (userInfo: UserInfo) => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onRoomRejoin?: (roomId: string) => void; // 재연결 후 방 재입장 시 호출
  onGameStateChange?: (gameState: GameProgressResponse | null) => void; // 게임 상태 변경 콜백
}

// 소켓 메시지 인터셉터 타입 정의
interface SocketMessageInterceptor {
  eventType: string;
  handler: (data: any) => void;
  priority?: number; // 우선순위 (낮을수록 높은 우선순위)
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

// 게임 상태 관리
let globalGameState: GameProgressResponse | null = null;
let globalGameEventListenersRegistered = false; // 게임 이벤트 리스너 등록 여부 추적

// 소켓 메시지 인터셉터 관리
let messageInterceptors: SocketMessageInterceptor[] = [];
let isInterceptorRegistered = false; // 인터셉터 등록 여부 추적

// 소켓 메시지 인터셉터 등록 함수
export const registerSocketInterceptor = (interceptor: SocketMessageInterceptor) => {
  messageInterceptors.push(interceptor);
  // 우선순위에 따라 정렬
  messageInterceptors.sort((a, b) => (a.priority || 0) - (b.priority || 0));
};

// 소켓 메시지 인터셉터 해제 함수
export const unregisterSocketInterceptor = (eventType: string, handler: (data: any) => void) => {
  messageInterceptors = messageInterceptors.filter(
    interceptor => !(interceptor.eventType === eventType && interceptor.handler === handler)
  );
};

// 소켓 메시지 인터셉터 처리 함수
const handleSocketMessage = (eventType: string, data: any) => {
  console.log(`[SOCKET INTERCEPTOR] 수신: ${eventType}`, data);
  
  // 해당 이벤트 타입의 인터셉터들을 찾아서 실행
  const interceptors = messageInterceptors.filter(interceptor => interceptor.eventType === eventType);
  
  interceptors.forEach(interceptor => {
    try {
      interceptor.handler(data);
    } catch (error) {
      console.error(`[SOCKET INTERCEPTOR] 인터셉터 실행 오류 (${eventType}):`, error);
    }
  });
};

export const useSocket = (options: UseSocketOptions) => {
  const { token, onConnect, onDisconnect, onError, onRoomRejoin, onGameStateChange } = options;
  const onRoomRejoinRef = useRef(onRoomRejoin);
  const onGameStateChangeRef = useRef(onGameStateChange);
  
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

  useEffect(() => {
    onGameStateChangeRef.current = onGameStateChange;
  }, [onGameStateChange]);

  // 소켓 연결
  const connect = useCallback(() => {
    // 토큰이 없거나 빈 문자열인 경우 연결 시도하지 않음
    if (!token || token.trim() === '') {
      setError('유효한 토큰이 필요합니다.');
      setIsConnected(false);
      return;
    }

    // 이미 연결 중이거나 연결된 경우 중복 연결 방지
    if (isConnecting || (globalSocket?.connected && globalToken === token)) {
      return;
    }

    // 토큰이 변경되었거나 연결이 끊어진 경우 새로 연결
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
      globalEventListenersRegistered = false; // 이벤트 리스너 재등록 필요
      isInterceptorRegistered = false; // 인터셉터 재등록 필요
    }

    isConnecting = true;
    const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', {
      auth: { token },
      transports: ['websocket'],
    });

    // 소켓 메시지 인터셉터 등록 (한 번만)
    if (!isInterceptorRegistered) {
      // 모든 이벤트를 캐치하는 인터셉터 등록
      // Socket.IO의 onAny가 없을 수 있으므로 개별 이벤트로 처리
      const allEvents = [
        'connect', 'disconnect', 'connect_failed',
        SocketEventType.CONNECT_SUCCESS, SocketEventType.ERROR, SocketEventType.DISCONNECT,
        SocketEventType.JOIN_ROOM, SocketEventType.LEAVE_ROOM, SocketEventType.ROOM_DELETED,
        SocketEventType.LOBBY_MESSAGE, SocketEventType.GAME_MESSAGE, SocketEventType.SYSTEM_MESSAGE,
        SocketEventType.READY, SocketEventType.START_GAME, SocketEventType.FINISH_GAME,
        SocketEventType.CREATE_GAME, SocketEventType.CREATE_CONTEXT, SocketEventType.CREATE_AGENDA,
        SocketEventType.CREATE_TASK, SocketEventType.CREATE_OVERTIME, SocketEventType.UPDATE_CONTEXT,
        SocketEventType.CREATE_EXPLANATION, SocketEventType.CALCULATE_RESULT, SocketEventType.GET_GAME_PROGRESS,
        SocketEventType.GAME_PROGRESS_UPDATED
      ];
      
      allEvents.forEach(eventType => {
        socket.on(eventType, (data: any) => {
          handleSocketMessage(eventType, data);
        });
      });
      
      isInterceptorRegistered = true;
    }

    // 이벤트 리스너가 아직 등록되지 않은 경우에만 등록
    if (!globalEventListenersRegistered) {
      // 소켓 기본 연결 이벤트 처리
      socket.on('connect', () => {
        isConnecting = false;
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', (reason) => {
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
        setIsConnected(true);
        setUserInfo(data);
        setError(null);
        onConnect?.(data);
        
        // 재연결 시 마지막 방에 자동으로 다시 입장 (지연 추가)
        if (globalLastRoom && globalSocket) {
          setTimeout(() => {
            if (globalSocket?.connected && globalLastRoom) {
              globalSocket.emit(SocketEventType.JOIN_ROOM, { room_id: globalLastRoom }, (response: any) => {
                if (!response?.error) {
                  setCurrentRoom(globalLastRoom);
                  if (globalLastRoom) {
                    onRoomRejoinRef.current?.(globalLastRoom);
                  }
                } else {
                  globalLastRoom = null;
                }
              });
            }
          }, 1000); // 1초 지연으로 안정성 확보
        }
      });

      socket.on('connect_failed', (data: { message: string }) => {      
        isConnecting = false;
        setIsConnected(false);
        setError(data.message);
        
        // 빈 토큰이나 유효하지 않은 토큰 에러인 경우에만 인증 정보 삭제
        if (data.message.includes('Valid token is required') || 
            data.message.includes('No token provided') ||
            data.message.includes('토큰이 필요합니다')) {
          handleUnauthorizedError();
        }
        onError?.(data.message);
      });

      socket.on(SocketEventType.ERROR, (data: { message: string }) => {
        setError(data.message);
        onError?.(data.message);
      });

      socket.on(SocketEventType.DISCONNECT, () => {
        isConnecting = false;
        setIsConnected(false);
        setUserInfo(null);
        setCurrentRoom(null);
        globalLastRoom = null; // 전역 변수도 초기화
        onDisconnect?.();
      });

      globalEventListenersRegistered = true;
    }

    // 게임 이벤트 리스너 등록
    if (!globalGameEventListenersRegistered) {
      // game_progress_updated 이벤트 리스너 (중복 제거)
      socket.on(SocketEventType.GAME_PROGRESS_UPDATED, (data: GameProgressResponse) => {
        globalGameState = data;
        onGameStateChangeRef.current?.(globalGameState);
        // socketStore에 게임 상태 저장
        useSocketStore.getState().setGameState(globalGameState);  
      });

      globalGameEventListenersRegistered = true;
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
      globalGameEventListenersRegistered = false; // 게임 이벤트 리스너도 초기화
      isInterceptorRegistered = false; // 인터셉터도 초기화
      globalLastRoom = null;
      globalGameState = null; // 게임 상태도 초기화
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
      return Promise.reject(new Error('Socket is not connected'));
    }
    
    // 이미 같은 방에 있으면 중복 입장 방지
    if (currentRoom === roomId) {
      return Promise.resolve();
    }
    
    // 방 나가기 후 500ms 이내 재입장 방지 (1초에서 500ms로 단축)
    if (Date.now() - lastLeaveTime < 500) {
      return Promise.reject(new Error('Please wait before rejoining the room'));
    }
    
    // 이미 방 입장 중이면 중복 요청 방지
    if (isJoiningRoom) {
      if (currentJoiningRoomId === roomId) {
        return Promise.reject(new Error('Already joining this room'));
      } else {
        return Promise.reject(new Error('Already joining another room'));
      }
    }
    
    return new Promise<void>((resolve, reject) => {
      
      // 방 입장 상태 설정
      isJoiningRoom = true;
      currentJoiningRoomId = roomId;
      
      // 타임아웃 설정 (10초)
      const timeout = setTimeout(() => {
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
          
          // 방이 삭제된 경우 특별 처리
          if (response.error.includes('Room not found') || 
              response.error.includes('deleted') ||
              response.error.includes('존재하지 않습니다')) {
              
            setCurrentRoom(null);
            globalLastRoom = null;
            reject(new Error('Room has been deleted'));
          } 
          // 게임 진행 중 입장 차단 에러인 경우, 기존 사용자라면 재입장 허용
          else if (response.error.includes('Cannot join room while game is in progress')) {
            
            // 기존 사용자 재입장 시도 (서버에서 처리됨)
            reject(new Error('Game in progress - rejoining as existing player'));
          } else {
            reject(new Error(response.error));
          }
        } else {
          
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
      
      return;
    }

    
    
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

  // 게임 액션 함수들
  const createGame = useCallback((roomId: string, playerList: Player[]) => {
    if (!globalSocket?.connected) {
      
      return;
    }
    
    const request: CreateGameRequest = {
      room_id: roomId,
      player_list: playerList
    };
    
    
    globalSocket.emit(SocketEventType.CREATE_GAME, request);
  }, []);

  const createContext = useCallback((roomId: string, maxTurn: number = 10, story: string) => {
    if (!globalSocket?.connected) {

      return;
    }
    
    const request: CreateContextRequest = {
      room_id: roomId,
      max_turn: maxTurn,
      story: story // story를 입력으로 받음
    };
    
    
    globalSocket.emit(SocketEventType.CREATE_CONTEXT, request);
  }, []);

  const createAgenda = useCallback((roomId: string) => {
    if (!globalSocket?.connected) {
      
      return;
    }
    
    const request: CreateAgendaRequest = {
      room_id: roomId
    };
    
    
    globalSocket.emit(SocketEventType.CREATE_AGENDA, request);
  }, []);

  const createTask = useCallback((roomId: string) => {
    if (!globalSocket?.connected) {
      
      return;
    }
    
    const request: CreateTaskRequest = {
      room_id: roomId
    };
    
    
    globalSocket.emit(SocketEventType.CREATE_TASK, request);
  }, []);

  const createOvertime = useCallback((roomId: string) => {
    if (!globalSocket?.connected) {
      
      return;
    }
    
    const request: CreateOvertimeRequest = {
      room_id: roomId
    };
    
    
    globalSocket.emit(SocketEventType.CREATE_OVERTIME, request);
  }, []);

  const updateContext = useCallback((roomId: string, selections: Omit<UpdateContextRequest, 'room_id'>) => {
    if (!globalSocket?.connected) {
      
      return;
    }
    
    const request: UpdateContextRequest = {
      room_id: roomId,
      ...selections
    };
    
    
    globalSocket.emit(SocketEventType.UPDATE_CONTEXT, request);
  }, []);

  const createExplanation = useCallback((roomId: string) => {
    if (!globalSocket?.connected) {
      
      return;
    }
    
    const request: CreateExplanationRequest = {
      room_id: roomId
    };
    
    
    globalSocket.emit(SocketEventType.CREATE_EXPLANATION, request);
  }, []);

  const calculateResult = useCallback((roomId: string) => {
    if (!globalSocket?.connected) {
      
      return;
    }
    
    const request: CalculateResultRequest = {
      room_id: roomId
    };
    
    
    globalSocket.emit(SocketEventType.CALCULATE_RESULT, request);
  }, []);

  const getGameProgress = useCallback((roomId: string) => {
    if (!globalSocket?.connected) {
      
      return;
    }
    
    const request: GetGameProgressRequest = {
      room_id: roomId
    };
    
    
    globalSocket.emit(SocketEventType.GET_GAME_PROGRESS, request);
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
    // 게임 액션 함수들
    createGame,
    createContext,
    createAgenda,
    createTask,
    createOvertime,
    updateContext,
    createExplanation,
    calculateResult,
    getGameProgress,
  };
};

// 전역 소켓 연결을 완전히 해제하는 함수 (로그아웃 시 사용)
export const disconnectGlobalSocket = () => {
  
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
  globalToken = null;
  globalEventListenersRegistered = false;
  globalGameEventListenersRegistered = false; // 게임 이벤트 리스너도 초기화
  globalLastRoom = null;
  globalGameState = null; // 게임 상태도 초기화
  isConnecting = false;
  isJoiningRoom = false; // 방 입장 상태 초기화
  currentJoiningRoomId = null; // 현재 입장 시도 중인 방 ID 초기화
  lastLeaveTime = 0; // 방 나가기 시간 초기화
  
  // 전역 상태도 초기화
  const { reset } = useSocketStore.getState();
  reset();
}; 