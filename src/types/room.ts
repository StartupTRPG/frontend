export interface RoomCreateRequest {
  title: string;
  description?: string;
  max_players?: number;
  visibility?: 'public' | 'private';
  game_settings?: Record<string, any>;
}

export interface RoomUpdateRequest {
  title?: string;
  description?: string;
  max_players?: number;
  visibility?: 'public' | 'private';
  game_settings?: Record<string, any>;
}

export interface RoomResponse {
  id: string;
  title: string;
  description: string;
  host_profile_id: string;
  host_display_name: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
  game_settings: Record<string, any>;
  players: RoomPlayerResponse[];
}

export interface RoomListResponse {
  id: string;
  title: string;
  description: string;
  host_profile_id: string;
  host_display_name: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
  game_settings: Record<string, any>;
}

export interface RoomPlayerResponse {
  profile_id: string;
  display_name: string;
  role: 'host' | 'player' | 'observer';
  joined_at: string;
}

export interface RoomOperationResponse {
  data: {
    room_id: string;
    operation: string;
    timestamp: string;
  };
  message: string;
  success: boolean;
} 