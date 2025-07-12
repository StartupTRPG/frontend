export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email?: string;
  nickname?: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
  created_at: string;
  last_login: string;
  updated_at: string;
}

export interface LoginResponse {
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
  message: string;
  success: boolean;
}

export interface RegisterResponse {
  data: {
    user_id: string;
    username: string;
    email: string;
    created_at: string;
  };
  message: string;
  success: boolean;
}

export interface UserResponse {
  data: User;
  message: string;
  success: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
} 