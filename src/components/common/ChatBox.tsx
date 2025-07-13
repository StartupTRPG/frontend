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
    if (initialMessages.length > 0) {
      console.log('[ChatBox] 초기 메시지 사용:', initialMessages.length);
      return;
    }
    
    try {
      const history = await getChatHistory(roomId);
      if (Array.isArray(history)) {
        setMessages(history);
      }
    } catch (error) {
      console.error('채팅 기록 로드 실패:', error);
    }
  }, [roomId, getChatHistory, initialMessages.length]);

  // 소켓 메시지 핸들러
  const handleChatMessage = useCallback((msg: ChatMessage) => {
    console.log(`[ChatBox] 메시지 수신: ${msg.message} (${msg.id})`);
    setMessages((prev) => {
      const isDuplicate = prev.some(existingMsg => existingMsg.id === msg.id);
      if (isDuplicate) {
        console.log(`[ChatBox] 중복 메시지 무시: ${msg.id}`);
        return prev;
      }
      return [...prev, msg];
    });
  }, []);

  // 메시지 전송
  const sendMessage = useCallback(() => {
    if (!input.trim() || !socket || !profile) return;
    
    const messageText = input.trim();
    const messageData = {
      room_id: roomId,
      message: messageText,
      message_type: 'text',
    };

    // 낙관적 업데이트 제거 - 서버에서 broadcast로 받은 메시지만 표시
    setInput('');

    // 채팅 타입에 따라 다른 이벤트로 전송
    if (chatType === 'game') {
      socket.emit(SocketEventType.GAME_MESSAGE, messageData);
    } else {
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
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // 채팅 기록 불러오기
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // 소켓 메시지 수신
  useEffect(() => {
    if (!socket) return;
    
    const messageEvent = chatType === 'game' ? SocketEventType.GAME_MESSAGE : SocketEventType.LOBBY_MESSAGE;
    
    console.log(`[ChatBox] 이벤트 리스너 등록: ${messageEvent} (${chatType})`);
    
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