// API 명세에 맞춘 타입 정의
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API 요청 실패');
      }
      
      return data;
    } catch (error) {
      console.error('API 요청 오류:', error);
      throw error;
    }
  }

  private withAuthHeader(options: RequestInit, accessToken: string): RequestInit {
    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
    };
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(): Promise<LoginResponse> {
    // refresh token을 요청 본문에 보내지 않음 - 쿠키에서 자동 전송
    return this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      // body 제거 - 쿠키에서 자동으로 refresh token 전송
    });
  }

  async getCurrentUser(accessToken: string): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/me', 
      this.withAuthHeader({ method: 'GET' }, accessToken)
    );
  }

  async logout(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/auth/logout', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService(); 