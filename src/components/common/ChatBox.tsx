import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { SocketEventType } from '../../types/socket';
import { UserProfileResponse } from '../../services/api';
import { useApi } from '../../hooks/useApi';

interface ChatBoxProps {
  roomId: string;
  socket: Socket | null;
  profile: UserProfileResponse | null;
  chatType: 'lobby' | 'game';
  initialMessages?: any[];
  onSendLobbyMessage?: (roomId: string, message: string) => void;
  onSendGameMessage?: (roomId: string, message: string) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ 
  roomId, 
  socket, 
  profile, 
  chatType = 'lobby', 
  initialMessages = [],
  onSendLobbyMessage,
  onSendGameMessage
}) => {
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const { getChatHistory } = useApi();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 소켓 메시지 핸들러
  const handleChatMessage = useCallback((msg: any) => {
    // 채팅 타입에 따라 메시지 필터링
    if (msg.message_type !== chatType) {
      return;
    }
    setMessages((prev) => {
      const isDuplicate = prev.some(existingMsg => existingMsg.id === msg.id);
      if (isDuplicate) {
        return prev;
      }
      return [...prev, msg];
    });
  }, [chatType]);

  // 메시지 전송
  const sendMessage = useCallback(() => {
    const currentInput = inputRef.current?.value || '';
    if (!currentInput.trim() || !profile) {
      return;
    }
    const messageText = currentInput.trim();
    setInput('');
    // 채팅 타입에 따라 다른 메서드 사용
    if (chatType === 'game') {
      if (onSendGameMessage) {
        onSendGameMessage(roomId, messageText);
      }
    } else {
      if (onSendLobbyMessage) {
        onSendLobbyMessage(roomId, messageText);
      }
    }
  }, [profile, roomId, chatType, onSendLobbyMessage, onSendGameMessage]); // input 의존성 제거

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
      // 채팅 타입에 따라 초기 메시지 필터링
      const filteredMessages = initialMessages.filter(msg => msg.message_type === chatType);
      setMessages(filteredMessages);
    }
  }, [initialMessages, chatType]);

  // 채팅 기록 불러오기 (한 번만 실행)
  useEffect(() => {
    // 게임 채팅에서는 히스토리를 로드하지 않음
    if (chatType === 'game') {
      return;
    }
    if (initialMessages.length > 0) {
      return;
    }
    // 채팅 히스토리 로드
    const fetchHistory = async () => {
      try {
        const history = await getChatHistory(roomId);
        if (Array.isArray(history)) {
          // 채팅 타입에 따라 히스토리 필터링
          const filteredHistory = history.filter(msg => msg.message_type === chatType);
          setMessages(filteredHistory);
        }
      } catch (error) {
        // 에러는 무시
      }
    };
    fetchHistory();
  }, [roomId, chatType]); // roomId나 chatType이 변경될 때만 실행

  // 채팅 타입이 변경될 때 메시지 필터링
  useEffect(() => {
    setMessages(prev => {
      const filteredMessages = prev.filter(msg => msg.message_type === chatType);
      return filteredMessages;
    });
  }, [chatType]);

  // 소켓 메시지 수신
  useEffect(() => {
    if (!socket) {
      return;
    }
    const messageEvent = chatType === 'game' ? SocketEventType.GAME_MESSAGE : SocketEventType.LOBBY_MESSAGE;
    socket.on(messageEvent, handleChatMessage);
    return () => {
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
                fontWeight: String(msg.profile_id) === String(profile?.id) ? 700 : 500,
                color: String(msg.profile_id) === String(profile?.id) ? '#1976d2' : '#333'
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
          ref={inputRef}
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