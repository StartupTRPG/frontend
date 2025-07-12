// Socket 이벤트 타입 정의
export enum SocketEventType {
  // 인증 관련
  CONNECT = "connect",
  DISCONNECT = "disconnect", 
  CONNECT_SUCCESS = "connect_success",
  
  // 방 관련
  JOIN_ROOM = "join_room",
  LEAVE_ROOM = "leave_room",
  ROOM_JOINED = "room_joined",
  ROOM_LEFT = "room_left",
  USER_JOINED = "user_joined",
  USER_LEFT = "user_left",
  GET_ROOM_USERS = "get_room_users",
  ROOM_USERS = "room_users",
  
  // 채팅 관련
  SEND_MESSAGE = "send_message",
  NEW_MESSAGE = "new_message",
  GET_CHAT_HISTORY = "get_chat_history",
  CHAT_HISTORY = "chat_history",
  SYSTEM_MESSAGE = "system_message",
  
  // 공통
  ERROR = "error"
}

// 기본 Socket 메시지 인터페이스
export interface BaseSocketMessage {
  event_type: SocketEventType;
  timestamp: string; // ISO string
  data: Record<string, any>;
}

// 인증 메시지
export interface AuthMessage extends BaseSocketMessage {
  token?: string;
  user_id?: string;
  username?: string;
}

// 방 관련 메시지
export interface RoomMessage extends BaseSocketMessage {
  room_id: string;
  password?: string;
  user_id?: string;
  username?: string;
}

// 채팅 메시지
export interface ChatMessage extends BaseSocketMessage {
  room_id: string;
  user_id: string;
  username: string;
  display_name: string;
  message: string;
  message_type: string;
  encrypted: boolean;
}

// 시스템 메시지
export interface SystemMessage extends BaseSocketMessage {
  room_id: string;
  content: string;
  message_type: string;
} 