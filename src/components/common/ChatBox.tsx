import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage, SocketEventType } from '../../types/socket';
import { useChat } from '../../hooks/useChat';
import { UserProfileResponse } from '../../services/api';

interface ChatBoxProps {
  roomId: string;
  socket: any;
  profile: UserProfileResponse;
  chatType?: 'lobby' | 'game';
  initialMessages?: ChatMessage[];
}

const ChatBox: React.FC<ChatBoxProps> = ({ roomId, socket, profile, chatType = 'lobby', initialMessages = [] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const { getChatHistory } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 채팅 기록 불러오기
  const loadChatHistory = useCallback(async () => {
    // 게임 채팅에서는 히스토리를 로드하지 않음
    if (chatType === 'game') {
      console.log('[ChatBox] 게임 채팅: 히스토리 로드 건너뜀');
      return;
    }
    
    if (initialMessages.length > 0) {
      console.log('[ChatBox] 초기 메시지 사용:', initialMessages.length);
      return;
    }
    
    try {
      const history = await getChatHistory(roomId);
      if (Array.isArray(history)) {
        // 채팅 타입에 따라 히스토리 필터링
        const filteredHistory = history.filter(msg => msg.message_type === chatType);
        console.log(`[ChatBox] 필터링된 히스토리: ${filteredHistory.length}개 (${chatType})`);
        setMessages(filteredHistory);
      }
    } catch (error) {
      console.error('채팅 기록 로드 실패:', error);
    }
  }, [roomId, getChatHistory, initialMessages.length, chatType]);

  // 소켓 메시지 핸들러
  const handleChatMessage = useCallback((msg: ChatMessage) => {
    console.log(`[ChatBox] 메시지 수신: ${msg.message} (${msg.id}) - 타입: ${msg.message_type}, 현재 채팅 타입: ${chatType}`);
    
    // 채팅 타입에 따라 메시지 필터링
    if (msg.message_type !== chatType) {
      console.log(`[ChatBox] 메시지 타입 불일치로 무시: ${msg.message_type} !== ${chatType}`);
      return;
    }
    
    setMessages((prev) => {
      const isDuplicate = prev.some(existingMsg => existingMsg.id === msg.id);
      if (isDuplicate) {
        console.log(`[ChatBox] 중복 메시지 무시: ${msg.id}`);
        return prev;
      }
      console.log(`[ChatBox] 메시지 추가: ${msg.message} (${msg.message_type})`);
      return [...prev, msg];
    });
  }, [chatType]);

  // 메시지 전송
  const sendMessage = useCallback(() => {
    console.log('[ChatBox] 메시지 전송 시도:', { input: input.trim(), socket: !!socket, profile: !!profile, chatType });
    
    if (!input.trim() || !socket || !profile) {
      console.log('[ChatBox] 메시지 전송 실패: 조건 불만족');
      return;
    }
    
    const messageText = input.trim();
    const messageData = {
      room_id: roomId,
      message: messageText,
      message_type: chatType, // 'lobby' 또는 'game'
    };

    console.log('[ChatBox] 메시지 데이터:', messageData);

    // 낙관적 업데이트 제거 - 서버에서 broadcast로 받은 메시지만 표시
    setInput('');

    // 채팅 타입에 따라 다른 이벤트로 전송
    if (chatType === 'game') {
      console.log('[ChatBox] GAME_MESSAGE 이벤트 전송');
      socket.emit(SocketEventType.GAME_MESSAGE, messageData);
    } else {
      console.log('[ChatBox] LOBBY_MESSAGE 이벤트 전송');
      socket.emit(SocketEventType.LOBBY_MESSAGE, messageData);
    }
  }, [input, socket, profile, roomId, chatType]);

  // 한글 조합 상태 핸들러
  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  // 엔터로 메시지 전송
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) sendMessage();
  }, [sendMessage, isComposing]);

  // 초기 메시지가 변경될 때 messages 상태 업데이트
  useEffect(() => {
    if (initialMessages.length > 0) {
      console.log('[ChatBox] 초기 메시지 업데이트:', initialMessages.length);
      // 채팅 타입에 따라 초기 메시지 필터링
      const filteredMessages = initialMessages.filter(msg => msg.message_type === chatType);
      console.log(`[ChatBox] 필터링된 초기 메시지: ${filteredMessages.length}개 (${chatType})`);
      setMessages(filteredMessages);
    }
  }, [initialMessages, chatType]);

  // 채팅 기록 불러오기
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // 채팅 타입이 변경될 때 메시지 필터링
  useEffect(() => {
    console.log(`[ChatBox] 채팅 타입 변경: ${chatType}`);
    // 기존 메시지를 현재 채팅 타입에 맞게 필터링
    setMessages(prev => {
      const filteredMessages = prev.filter(msg => msg.message_type === chatType);
      console.log(`[ChatBox] 채팅 타입 변경 후 필터링된 메시지: ${filteredMessages.length}개`);
      return filteredMessages;
    });
  }, [chatType]);

  // 소켓 메시지 수신
  useEffect(() => {
    if (!socket) {
      console.log('[ChatBox] 소켓이 없어서 이벤트 리스너 등록 건너뜀');
      return;
    }
    
    const messageEvent = chatType === 'game' ? SocketEventType.GAME_MESSAGE : SocketEventType.LOBBY_MESSAGE;
    
    console.log(`[ChatBox] 이벤트 리스너 등록: ${messageEvent} (${chatType})`, { socket: !!socket, socketConnected: socket?.connected });
    
    socket.on(messageEvent, handleChatMessage);
    return () => {
      console.log(`[ChatBox] 이벤트 리스너 해제: ${messageEvent} (${chatType})`);
      socket.off(messageEvent, handleChatMessage);
    };
  }, [socket, handleChatMessage, chatType]);

  // 스크롤 하단 고정
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 메시지 상태 디버깅
  useEffect(() => {
    console.log(`[ChatBox] 메시지 상태 업데이트: ${messages.length}개 메시지`, messages);
  }, [messages]);

  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      border: '1px solid #ddd', 
      borderRadius: 8, 
      background: '#fff', 
      overflow: 'hidden'
    }}>
      {/* 채팅 타입 헤더 */}
      <div style={{ 
        padding: '8px 12px', 
        background: chatType === 'game' ? '#ff6b6b' : '#4CAF50', 
        color: 'white', 
        fontWeight: 'bold',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        {chatType === 'game' ? '🎮 게임 채팅' : '💬 로비 채팅'}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#f9f9f9' }}>
        {messages.map((msg, idx) => (
          <div key={msg.id || idx} style={{ marginBottom: 8 }}>
            <div>
              <span style={{
                fontWeight: String(msg.profile_id) === String(profile.id) ? 700 : 500,
                color: String(msg.profile_id) === String(profile.id) ? '#1976d2' : '#333'
              }}>
                {msg.display_name}
              </span>
              <span style={{ marginLeft: 8, color: '#aaa', fontSize: 12 }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              <div style={{ marginLeft: 4 }}>{msg.message}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #eee', padding: 8, background: '#fafafa' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="메시지를 입력하세요..."
          style={{ 
            flex: 1, 
            padding: 8, 
            border: '1px solid #ccc', 
            borderRadius: 4, 
            marginRight: 8 
          }}
        />
        <button 
          onClick={sendMessage} 
          style={{ 
            padding: '8px 16px', 
            background: '#1976d2', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 4, 
            cursor: 'pointer' 
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default ChatBox; 