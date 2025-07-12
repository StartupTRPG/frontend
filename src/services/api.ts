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

// 기존 타입들...

// 추가 타입들
export interface RefreshResponse {
  data: {
    access_token: string;
    expires_in: number;
    token_type: string;
  };
  message: string;
  success: boolean;
}

export interface CreateProfileResponse {
  data: UserProfileResponse;
  message: string;
  success: boolean;
}

export interface GetProfileResponse {
  data: UserProfileResponse;
  message: string;
  success: boolean;
}

export interface UpdateProfileResponse {
  data: UserProfileResponse;
  message: string;
  success: boolean;
}

export interface GetUserProfileResponse {
  data: UserProfilePublicResponse;
  message: string;
  success: boolean;
}

export interface SearchProfilesResponse {
  data: UserProfilePublicResponse[];
  message: string;
  success: boolean;
}

export interface GetChatHistoryResponse {
  data: RoomChatHistoryResponse;
  message: string;
  success: boolean;
}

export interface DeleteChatHistoryResponse {
  data: {
    deleted_count: number;
  };
  message: string;
  success: boolean;
}

export interface DeleteAccountResponse {
  data: {
    instructions: {
      client_action: string;
    };
  };
  message: string;
  success: boolean;
}

// 누락된 타입들 추가
export interface LogoutResponse {
  data: {
    instructions: {
      client_action: string;
    };
  };
  message: string;
  success: boolean;
}

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

export interface RoomCreateRequest {
  title: string;
  description?: string;
  max_players?: number;
  visibility?: 'public' | 'private';
  password: string;
  game_settings?: Record<string, any>;
}

export interface RoomUpdateRequest {
  title?: string;
  description?: string;
  max_players?: number;
  visibility?: 'public' | 'private';
  password?: string;
  game_settings?: Record<string, any>;
}

export interface RoomResponse {
  id: string;
  title: string;
  description?: string;
  host_id: string;
  host_username: string;
  current_players: number;
  max_players: number;
  status: 'waiting' | 'profile_setup' | 'playing' | 'finished';
  visibility: 'public' | 'private';
  has_password: boolean;
  created_at: string;
  updated_at: string;
  game_settings: Record<string, any>;
  players: RoomPlayerResponse[];
}

export interface RoomListResponse {
  id: string;
  title: string;
  description?: string;
  host_username: string;
  current_players: number;
  max_players: number;
  status: 'waiting' | 'profile_setup' | 'playing' | 'finished';
  visibility: 'public' | 'private';
  has_password: boolean;
  created_at: string;
}

export interface RoomPlayerResponse {
  user_id: string;
  username: string;
  role: 'host' | 'player' | 'observer';
  joined_at: string;
  is_host: boolean;
}

export interface RoomChatHistoryResponse {
  room_id: string;
  messages: ChatMessageResponse[];
  total_count: number;
  page: number;
  limit: number;
}

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

  // Auth APIs
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

  async refreshToken(): Promise<RefreshResponse> {
    return this.request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
    });
  }

  async getCurrentUser(accessToken: string): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/me', 
      this.withAuthHeader({ method: 'GET' }, accessToken)
    );
  }

  async logout(): Promise<LogoutResponse> {
    return this.request<LogoutResponse>('/auth/logout', {
      method: 'POST',
    });
  }

  async deleteAccount(accessToken: string): Promise<DeleteAccountResponse> {
    return this.request<DeleteAccountResponse>('/auth/account', 
      this.withAuthHeader({ method: 'DELETE' }, accessToken)
    );
  }

  // Profile APIs
  async createProfile(accessToken: string, profileData: UserProfileCreate): Promise<CreateProfileResponse> {
    return this.request<CreateProfileResponse>('/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
      ...this.withAuthHeader({}, accessToken),
    });
  }

  async getMyProfile(accessToken: string): Promise<GetProfileResponse> {
    return this.request<GetProfileResponse>('/profile/me', 
      this.withAuthHeader({ method: 'GET' }, accessToken)
    );
  }

  async updateMyProfile(accessToken: string, profileData: UserProfileUpdate): Promise<UpdateProfileResponse> {
    return this.request<UpdateProfileResponse>('/profile/me', 
      this.withAuthHeader({
        method: 'PUT',
        body: JSON.stringify(profileData),
      }, accessToken)
    );
  }

  async getUserProfile(accessToken: string, userId: string): Promise<GetUserProfileResponse> {
    return this.request<GetUserProfileResponse>(`/profile/user/${userId}`, {
      method: 'GET',
      ...this.withAuthHeader({}, accessToken),
    });
  }

  async searchProfiles(accessToken: string, query: string, limit: number = 20): Promise<SearchProfilesResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    if (limit) queryParams.append('limit', limit.toString());

    return this.request<SearchProfilesResponse>(`/profile/search?${queryParams.toString()}`, {
      method: 'GET',
      ...this.withAuthHeader({}, accessToken),
    });
  }

  // Room APIs
  async createRoom(accessToken: string, roomData: RoomCreateRequest): Promise<ApiResponse<RoomResponse>> {
    return this.request<ApiResponse<RoomResponse>>('/rooms', 
      this.withAuthHeader({
        method: 'POST',
        body: JSON.stringify(roomData),
        headers:{
          'Content-Type': 'application/json',
        }
      }, accessToken)
    );
  }

  async getRooms(accessToken: string, params?: {
    status?: string;
    visibility?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<RoomListResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.visibility) queryParams.append('visibility', params.visibility);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/rooms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<ApiResponse<RoomListResponse[]>>(endpoint, {
      method: 'GET',
      ...this.withAuthHeader({}, accessToken),
    });
  }

  async getMyRooms(accessToken: string): Promise<ApiResponse<RoomListResponse[]>> {
    return this.request<ApiResponse<RoomListResponse[]>>('/rooms/my', 
      this.withAuthHeader({ method: 'GET' }, accessToken)
    );
  }

  async getRoom(accessToken: string, roomId: string): Promise<ApiResponse<RoomResponse>> {
    return this.request<ApiResponse<RoomResponse>>(`/rooms/${roomId}`, {
      method: 'GET',
      ...this.withAuthHeader({}, accessToken),
    });
  }

  async updateRoom(accessToken: string, roomId: string, roomData: RoomUpdateRequest): Promise<ApiResponse<RoomResponse>> {
    return this.request<ApiResponse<RoomResponse>>(`/rooms/${roomId}`, 
      this.withAuthHeader({
        method: 'PUT',
        body: JSON.stringify(roomData),
      }, accessToken)
    );
  }

  async deleteRoom(accessToken: string, roomId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/rooms/${roomId}`, 
      this.withAuthHeader({ method: 'DELETE' }, accessToken)
    );
  }

  async startGame(accessToken: string, roomId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/rooms/${roomId}/start`, 
      this.withAuthHeader({ method: 'POST' }, accessToken)
    );
  }

  async endGame(accessToken: string, roomId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/rooms/${roomId}/end`, 
      this.withAuthHeader({ method: 'POST' }, accessToken)
    );
  }

  // Chat APIs
  async getChatHistory(accessToken: string, roomId: string, page: number = 1, limit: number = 50): Promise<GetChatHistoryResponse> {
    return this.request<GetChatHistoryResponse>(`/chat/room/${roomId}/history?page=${page}&limit=${limit}`, 
      this.withAuthHeader({ method: 'GET' }, accessToken)
    );
  }

  async deleteChatHistory(accessToken: string, roomId: string): Promise<DeleteChatHistoryResponse> {
    return this.request<DeleteChatHistoryResponse>(`/chat/room/${roomId}/history`, 
      this.withAuthHeader({ method: 'DELETE' }, accessToken)
    );
  }

  // Health Check
  async healthCheck(): Promise<any> {
    return this.request<any>('/health', {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService(); 