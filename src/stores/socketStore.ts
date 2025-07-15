import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { UserInfo } from '../types/socket';
import { GameProgressResponse } from '../types/game';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  userInfo: UserInfo | null;
  currentRoom: string | null;
  error: string | null;
  gameState: GameProgressResponse | null;
  setSocket: (socket: Socket | null) => void;
  setIsConnected: (isConnected: boolean) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
  setCurrentRoom: (roomId: string | null) => void;
  setError: (error: string | null) => void;
  setGameState: (gameState: GameProgressResponse | null) => void;
  reset: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  isConnected: false,
  userInfo: null,
  currentRoom: null,
  error: null,
  gameState: null,
  
  setSocket: (socket) => set({ socket }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setUserInfo: (userInfo) => set({ userInfo }),
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  setError: (error) => set({ error }),
  setGameState: (gameState) => set({ gameState }),
  
  reset: () => set({
    socket: null,
    isConnected: false,
    userInfo: null,
    currentRoom: null,
    error: null,
    gameState: null,
  }),
})); 