import React from 'react';
import { useSocketInterceptors } from '../../hooks/useSocketInterceptor';
import { SocketEventType } from '../../types/socket';

interface SocketMessageLoggerProps {
  enabled?: boolean;
  logLevel?: 'all' | 'error' | 'important';
}

/**
 * 모든 소켓 메시지를 로깅하는 컴포넌트
 * 개발 환경에서 소켓 통신을 디버깅할 때 유용합니다.
 */
export const SocketMessageLogger: React.FC<SocketMessageLoggerProps> = ({ 
  enabled = process.env.NODE_ENV === 'development',
  logLevel = 'all'
}) => {
  // 중요 이벤트들 (항상 로깅)
  const importantEvents = [
    SocketEventType.CONNECT_SUCCESS,
    SocketEventType.ERROR,
    SocketEventType.DISCONNECT,
    SocketEventType.JOIN_ROOM,
    SocketEventType.LEAVE_ROOM,
    SocketEventType.START_GAME,
    SocketEventType.FINISH_GAME,
    SocketEventType.GAME_PROGRESS_UPDATED
  ];

  // 에러 이벤트들
  const errorEvents = [
    SocketEventType.ERROR,
    'connect_failed'
  ];

  useSocketInterceptors([
    // 연결 관련 이벤트
    {
      eventType: SocketEventType.CONNECT_SUCCESS,
      handler: (data) => {
        console.log('🔗 [SOCKET] 연결 성공:', data);
      },
      priority: 1,
      enabled
    },
    {
      eventType: 'connect_failed',
      handler: (data) => {
        console.error('❌ [SOCKET] 연결 실패:', data);
      },
      priority: 1,
      enabled
    },
    {
      eventType: SocketEventType.DISCONNECT,
      handler: (data) => {
        console.warn('🔌 [SOCKET] 연결 해제:', data);
      },
      priority: 1,
      enabled
    },
    
    // 방 관련 이벤트
    {
      eventType: SocketEventType.JOIN_ROOM,
      handler: (data) => {
        console.log('🚪 [SOCKET] 방 입장:', data);
      },
      priority: 2,
      enabled
    },
    {
      eventType: SocketEventType.LEAVE_ROOM,
      handler: (data) => {
        console.log('🚪 [SOCKET] 방 나가기:', data);
      },
      priority: 2,
      enabled
    },
    
    // 게임 관련 이벤트
    {
      eventType: SocketEventType.START_GAME,
      handler: (data) => {
        console.log('🎮 [SOCKET] 게임 시작:', data);
      },
      priority: 2,
      enabled
    },
    {
      eventType: SocketEventType.FINISH_GAME,
      handler: (data) => {
        console.log('🏁 [SOCKET] 게임 종료:', data);
      },
      priority: 2,
      enabled
    },
    {
      eventType: SocketEventType.GAME_PROGRESS_UPDATED,
      handler: (data) => {
        console.log('📊 [SOCKET] 게임 진행 상황 업데이트:', data);
      },
      priority: 3,
      enabled
    },
    
    // 채팅 관련 이벤트
    {
      eventType: SocketEventType.LOBBY_MESSAGE,
      handler: (data) => {
        if (logLevel === 'all') {
          console.log('💬 [SOCKET] 로비 메시지:', data);
        }
      },
      priority: 4,
      enabled: enabled && logLevel === 'all'
    },
    {
      eventType: SocketEventType.GAME_MESSAGE,
      handler: (data) => {
        if (logLevel === 'all') {
          console.log('🎮 [SOCKET] 게임 메시지:', data);
        }
      },
      priority: 4,
      enabled: enabled && logLevel === 'all'
    },
    {
      eventType: SocketEventType.SYSTEM_MESSAGE,
      handler: (data) => {
        console.log('⚙️ [SOCKET] 시스템 메시지:', data);
      },
      priority: 3,
      enabled
    },
    
    // 에러 이벤트
    {
      eventType: SocketEventType.ERROR,
      handler: (data) => {
        console.error('❌ [SOCKET] 에러:', data);
      },
      priority: 1,
      enabled
    },
    
    // 기타 모든 이벤트 (개발 환경에서만)
    {
      eventType: '*',
      handler: (data) => {
        // 중요하지 않은 이벤트는 로그 레벨에 따라 필터링
        if (logLevel === 'all') {
          console.log('📡 [SOCKET] 기타 이벤트:', data);
        }
      },
      priority: 10,
      enabled: enabled && logLevel === 'all'
    }
  ]);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
}; 