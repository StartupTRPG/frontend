// 소켓 이벤트 및 데이터 타입 정의

export enum SocketEventType {
  // 인증 관련
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  CONNECT_SUCCESS = "connect_success",
  
  // 방 관련
  JOIN_ROOM = "join_room",
  LEAVE_ROOM = "leave_room",
  ROOM_DELETED = "room_deleted",
  
  // 채팅 관련
  LOBBY_MESSAGE = "lobby_message",
  SYSTEM_MESSAGE = "system_message",
  GAME_MESSAGE = "game_message",
  
  // 공통
  ERROR = "error",
  FORCE_DISCONNECT = "force_disconnect",
}

export interface UserInfo {
  user_id: string;
  username: string;
  access_token: string;
  connected_at: string;
  current_room?: string;
}

export interface RoomUser {
  user_id: string;
  username: string;
  display_name: string;
  is_host: boolean;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  message: string;
  message_type: 'lobby' | 'game';
  timestamp: string;
  room_id: string;
}

export interface LobbyMessage extends ChatMessage {
  event_type: SocketEventType.LOBBY_MESSAGE;
}

export interface GameMessage extends ChatMessage {
  event_type: SocketEventType.GAME_MESSAGE;
}

export interface SystemMessage {
  event_type: SocketEventType;
  room_id: string;
  content: string;
  message_type: 'system';
  timestamp: string;
}

export interface RoomMessage {
  event_type: SocketEventType;
  room_id: string;
  user_id?: string;
  username?: string;
  timestamp: string;
  data: Record<string, any>;
} 