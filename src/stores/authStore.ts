import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../services/api'; // 경로 수정

interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  login: (user: User, accessToken: string) => void; // refreshToken 파라미터 제거
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateAccessToken: (accessToken: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      loading: false,
      error: null,

      login: (user, accessToken) => {
        console.log('Login called with:', { user, accessToken });
        set({
          isAuthenticated: true,
          user,
          accessToken,
          loading: false,
          error: null,
        });
      },

      logout: () => set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        loading: false,
        error: null,
      }),

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      updateAccessToken: (accessToken) => set({ accessToken }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
        // refreshToken 제거 - 쿠키에서 자동 관리
      }),
    }
  )
); 