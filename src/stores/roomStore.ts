import { create } from 'zustand';

interface RoomInfo {
  id: string;
  title: string;
  description: string;
  max_players: number;
  current_players: number;
  visibility: string;
  status: string;
  host_profile_id: string;
  host_display_name: string;
  created_at: string;
  players: any[];
  [key: string]: any;
}

interface RoomStore {
  rooms: Map<string, RoomInfo>;
  loading: boolean;
  error: string | null;
  setRoom: (roomId: string, roomInfo: RoomInfo) => void;
  setRooms: (rooms: RoomInfo[]) => void;
  getRoom: (roomId: string) => RoomInfo | null;
  updateRoom: (roomId: string, updates: Partial<RoomInfo>) => void;
  removeRoom: (roomId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearRooms: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: new Map(),
  loading: false,
  error: null,
  
  setRoom: (roomId, roomInfo) => set((state) => {
    const newRooms = new Map(state.rooms);
    newRooms.set(roomId, roomInfo);
    return { rooms: newRooms };
  }),
  
  setRooms: (rooms) => set((state) => {
    const newRooms = new Map();
    rooms.forEach(room => {
      newRooms.set(room.id, room);
    });
    return { rooms: newRooms };
  }),
  
  getRoom: (roomId) => {
    const { rooms } = get();
    return rooms.get(roomId) || null;
  },
  
  updateRoom: (roomId, updates) => set((state) => {
    const existingRoom = state.rooms.get(roomId);
    if (!existingRoom) return state;
    
    const newRooms = new Map(state.rooms);
    newRooms.set(roomId, { ...existingRoom, ...updates });
    return { rooms: newRooms };
  }),
  
  removeRoom: (roomId) => set((state) => {
    const newRooms = new Map(state.rooms);
    newRooms.delete(roomId);
    return { rooms: newRooms };
  }),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  clearRooms: () => set({ rooms: new Map() }),
})); 