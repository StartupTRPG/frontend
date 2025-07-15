// 소켓 이벤트 및 데이터 타입 정의

export enum SocketEventType {
  // 기존 이벤트들
  CONNECT_SUCCESS = "connect_success",
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  ERROR = "error",
  FORCE_DISCONNECT = "force_disconnect",
  
  // 방 관련 이벤트
  JOIN_ROOM = "join_room",
  LEAVE_ROOM = "leave_room",
  ROOM_DELETED = "room_deleted",
  
  // 채팅 이벤트
  LOBBY_MESSAGE = "lobby_message",
  GAME_MESSAGE = "game_message",
  SYSTEM_MESSAGE = "system_message",
  
  // 레디 이벤트
  READY = "ready",
  
  // 게임 관련 이벤트
  START_GAME = "start_game",
  FINISH_GAME = "finish_game",
  RESET_READY = "reset_ready",
  
  // LLM 게임 관련 이벤트
  CREATE_GAME = "create_game",
  CREATE_CONTEXT = "create_context",
  CREATE_AGENDA = "create_agenda",
  CREATE_TASK = "create_task",
  CREATE_OVERTIME = "create_overtime",
  UPDATE_CONTEXT = "update_context",
  CREATE_EXPLANATION = "create_explanation",
  CALCULATE_RESULT = "calculate_result",
  GET_GAME_PROGRESS = "get_game_progress",
  GAME_PROGRESS_UPDATED = "game_progress_updated",
}

export interface UserInfo {
  user_id: string;
  username: string;
  access_token: string;
  connected_at: string;
  current_room?: string;
}

export interface RoomUser {
  profile_id: string;
  display_name: string;
  is_host: boolean;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  profile_id: string;
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
  profile_id?: string;
  display_name?: string;
  timestamp: string;
  data: Record<string, any>;
}

// 레디 관련 인터페이스
export interface ReadyRequest {
  room_id: string;
  ready: boolean;
}

export interface ReadyResponse {
  room_id: string;
  profile_id: string;
  ready: boolean;
  all_ready: boolean;
} 