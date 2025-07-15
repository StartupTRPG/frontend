import { useEffect, useRef } from 'react';
import { registerSocketInterceptor, unregisterSocketInterceptor } from './useSocket';

interface UseSocketInterceptorOptions {
  eventType: string;
  handler: (data: any) => void;
  priority?: number;
  enabled?: boolean;
}

/**
 * 소켓 메시지 인터셉터를 사용하는 훅
 * 모든 소켓 메시지를 중앙에서 처리할 수 있습니다.
 * 
 * @example
 * ```tsx
 * useSocketInterceptor({
 *   eventType: 'lobby_message',
 *   handler: (data) => {
 *     console.log('로비 메시지 수신:', data);
 *   },
 *   priority: 1
 * });
 * ```
 */
export const useSocketInterceptor = (options: UseSocketInterceptorOptions) => {
  const { eventType, handler, priority = 0, enabled = true } = options;
  const handlerRef = useRef(handler);
  
  // 핸들러가 변경될 때 ref 업데이트
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  useEffect(() => {
    if (!enabled) return;
    
    // 인터셉터 등록
    const interceptor = {
      eventType,
      handler: (data: any) => handlerRef.current(data),
      priority
    };
    
    registerSocketInterceptor(interceptor);
    
    // 컴포넌트 언마운트 시 인터셉터 해제
    return () => {
      unregisterSocketInterceptor(eventType, interceptor.handler);
    };
  }, [eventType, priority, enabled]);
};

/**
 * 여러 소켓 메시지 인터셉터를 한 번에 등록하는 훅
 * 
 * @example
 * ```tsx
 * useSocketInterceptors([
 *   {
 *     eventType: 'lobby_message',
 *     handler: (data) => console.log('로비 메시지:', data),
 *     priority: 1
 *   },
 *   {
 *     eventType: 'game_message', 
 *     handler: (data) => console.log('게임 메시지:', data),
 *     priority: 2
 *   }
 * ]);
 * ```
 */
export const useSocketInterceptors = (interceptors: UseSocketInterceptorOptions[]) => {
  useEffect(() => {
    const registeredInterceptors: Array<{ eventType: string; handler: (data: any) => void }> = [];
    
    interceptors.forEach(({ eventType, handler, priority = 0, enabled = true }) => {
      if (!enabled) return;
      
      const interceptor = {
        eventType,
        handler,
        priority
      };
      
      registerSocketInterceptor(interceptor);
      registeredInterceptors.push({ eventType, handler });
    });
    
    // 컴포넌트 언마운트 시 모든 인터셉터 해제
    return () => {
      registeredInterceptors.forEach(({ eventType, handler }) => {
        unregisterSocketInterceptor(eventType, handler);
      });
    };
  }, [interceptors]);
}; 