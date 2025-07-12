// 소켓 이벤트 및 데이터 타입 정의

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
  
  // 게임 관련
  START_GAME = "start_game",
  END_GAME = "end_game",
  GAME_STARTED = "game_started",
  GAME_ENDED = "game_ended",
  GAME_ROOM_JOINED = "game_room_joined",
  RETURNED_TO_LOBBY = "returned_to_lobby",
  
  // 로비 메시지
  LOBBY_MESSAGE = "lobby_message",
  
  // 게임 메시지
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
  message_type: 'text' | 'system';
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