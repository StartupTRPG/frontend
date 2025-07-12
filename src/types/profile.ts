export interface UserProfileCreate {
  display_name: string;
  bio?: string;
  avatar_url?: string;
  user_level?: number;
}

export interface UserProfileUpdate {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  user_level?: number;
}

export interface UserProfileResponse {
  id?: string;
  user_id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  user_level: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfilePublicResponse {
  user_id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  user_level: number;
  created_at: string;
} 