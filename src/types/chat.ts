export interface ChatMessageResponse {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  display_name: string;
  message_type: 'text' | 'system';
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
