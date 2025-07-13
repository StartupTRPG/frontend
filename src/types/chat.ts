export interface ChatMessageResponse {
  id: string;
  room_id: string;
  profile_id: string;
  display_name: string;
  message_type: 'lobby' | 'game';
  message: string;
  timestamp: string;
  encrypted: boolean;
}

export interface RoomChatHistoryResponse {
  room_id: string;
  messages: ChatMessageResponse[];
  total_count: number;
  page: number;
  limit: number;
}

export interface GetChatHistoryResponse {
  data: RoomChatHistoryResponse;
  message: string;
  success: boolean;
}

export interface DeleteChatHistoryResponse {
  data: {
    deleted_count: number;
    room_id: string;
  };
  message: string;
  success: boolean;
}

export interface ChatHistoryRequest {
  room_id: string;
  page?: number;
  limit?: number;
}

export interface ChatMessageRequest {
  room_id: string;
  message: string;
  message_type?: 'text' | 'system';
}

export interface SystemMessageResponse {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  message: string;
  timestamp: string;
  message_type: 'system';
  chat_category?: 'lobby' | 'game' | 'general';
}

export interface UserJoinedResponse {
  user_id: string;
  username: string;
  display_name: string;
  message: string;
  timestamp: string;
}

export interface UserLeftResponse {
  user_id: string;
  username: string;
  display_name: string;
  message: string;
  timestamp: string;
}

export interface RoomUsersResponse {
  room_id: string;
  users: Array<{
    user_id: string;
    username: string;
    display_name: string;
    role: 'host' | 'player' | 'observer';
    is_host: boolean;
    joined_at: string;
  }>;
}

export interface GameEventResponse {
  room_id: string;
  event: string;
  message: string;
  timestamp: string;
}
