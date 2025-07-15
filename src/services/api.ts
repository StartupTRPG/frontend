import { handleUnauthorizedError, isUnauthorizedError } from '../utils/authUtils';

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
  created_at: string;
  updated_at?: string;
}

export interface LoginResponse {
  data: {
    access_token: string;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
    room_id: string;
  };
  message: string;
  success: boolean;
}

export interface DeleteAccountResponse {
  data: {
    user_id: string;
    username: string;
    deleted_at: string;
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
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
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
  avatar_url: string | null;
  role: 'host' | 'player' | 'observer';
  joined_at: string;
  ready: boolean;
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
  profile_id: string;
  display_name: string;
  message_type: 'lobby' | 'game';
  message: string;
  timestamp: string;
  encrypted: boolean;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[API] 요청 URL: ${url}`);
    console.log(`[API] API_BASE_URL: ${API_BASE_URL}`);
    
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
        // 401 에러인 경우 인증 데이터 정리 및 로그인 페이지 리디렉션
        if (response.status === 401) {
          handleUnauthorizedError();
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
        
        throw new Error(data.message || 'API 요청 실패');
      }
      
      return data;
    } catch (error) {
      console.error('API 요청 오류:', error);
      
      // 401 에러인지 확인하고 처리
      if (isUnauthorizedError(error)) {
        handleUnauthorizedError();
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      throw error;
    }
  }

  private withAuthHeader(options: RequestInit, accessToken: string): RequestInit {
    return {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
    };
  }

  // Auth APIs
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const url = `${API_BASE_URL}/auth/login`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(url, { 
        ...defaultOptions, 
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      
      if (!response.ok) {
        // 로그인 시에는 401 에러를 일반적인 로그인 실패로 처리
        throw new Error(data.message || '로그인에 실패했습니다.');
      }
      
      return data;
    } catch (error) {
      console.error('로그인 요청 오류:', error);
      throw error;
    }
  }

  async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    const url = `${API_BASE_URL}/auth/register`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(url, { 
        ...defaultOptions, 
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      
      if (!response.ok) {
        // 회원가입 시에는 401 에러를 일반적인 회원가입 실패로 처리
        throw new Error(data.message || '회원가입에 실패했습니다.');
      }
      
      return data;
    } catch (error) {
      console.error('회원가입 요청 오류:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<RefreshResponse> {
    const url = `${API_BASE_URL}/auth/refresh`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(url, { 
        ...defaultOptions, 
        method: 'POST',
      });
      const data = await response.json();
      
      if (!response.ok) {
        // 토큰 갱신 시 401 에러는 인증 만료를 의미
        if (response.status === 401) {
          handleUnauthorizedError();
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
        
        throw new Error(data.message || '토큰 갱신에 실패했습니다.');
      }
      
      return data;
    } catch (error) {
      console.error('토큰 갱신 요청 오류:', error);
      
      // 401 에러인지 확인하고 처리
      if (isUnauthorizedError(error)) {
        handleUnauthorizedError();
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      throw error;
    }
  }

  async getCurrentUser(accessToken: string): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/me', 
      this.withAuthHeader({ method: 'GET' }, accessToken)
    );
  }

  async logout(): Promise<LogoutResponse> {
    const url = `${API_BASE_URL}/auth/logout`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(url, { 
        ...defaultOptions, 
        method: 'POST',
      });
      const data = await response.json();
      
      if (!response.ok) {
        // 로그아웃 시에는 401 에러를 무시하고 정상 처리
        console.warn('로그아웃 요청 실패:', data.message);
        return data; // 에러가 있어도 로그아웃은 성공으로 처리
      }
      
      return data;
    } catch (error) {
      console.error('로그아웃 요청 오류:', error);
      // 로그아웃 실패 시에도 클라이언트에서는 로그아웃 처리
      throw error;
    }
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

  async getUserProfile(accessToken: string, profileId: string): Promise<GetUserProfileResponse> {
    return this.request<GetUserProfileResponse>(`/profile/${profileId}`, {
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
      }, accessToken)
    );
  }

  async getRooms(accessToken: string, params?: {
    status?: string;
    visibility?: string;
    search?: string;
    page?: number;
    limit?: number;
    exclude_playing?: boolean;
  }): Promise<ApiResponse<RoomListResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.visibility) queryParams.append('visibility', params.visibility);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.exclude_playing !== undefined) queryParams.append('exclude_playing', params.exclude_playing.toString());

    const endpoint = `/rooms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<ApiResponse<RoomListResponse[]>>(endpoint, {
      method: 'GET',
      ...this.withAuthHeader({}, accessToken),
    });
  }

  async getMyRoom(accessToken: string): Promise<ApiResponse<RoomResponse>> {
    return this.request<ApiResponse<RoomResponse>>('/rooms/my', 
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

  // Chat APIs
  async getChatHistory(accessToken: string, roomId: string, page: number = 1, limit: number = 50): Promise<GetChatHistoryResponse> {
    console.log(`[API] getChatHistory 호출: roomId=${roomId}, page=${page}, limit=${limit}`);
    const response = await this.request<GetChatHistoryResponse>(`/chat/room/${roomId}/history?page=${page}&limit=${limit}`, 
      this.withAuthHeader({ method: 'GET' }, accessToken)
    );
    console.log(`[API] getChatHistory 응답: ${response.data.messages.length}개 메시지`);
    return response;
  }

  async getLobbyChatHistory(accessToken: string, page: number = 1, limit: number = 50): Promise<GetChatHistoryResponse> {
    return this.request<GetChatHistoryResponse>(`/rooms/chat/lobby?page=${page}&limit=${limit}`, 
      this.withAuthHeader({ method: 'GET' }, accessToken)
    );
  }

  async getGameChatHistory(accessToken: string, page: number = 1, limit: number = 50): Promise<GetChatHistoryResponse> {
    return this.request<GetChatHistoryResponse>(`/rooms/chat/game?page=${page}&limit=${limit}`, 
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