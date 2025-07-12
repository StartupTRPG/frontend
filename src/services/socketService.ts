import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket && this.socket.connected) return this.socket;

    this.socket = io('http://localhost:8000', {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: any) {
    if (!this.socket?.connected) throw new Error('소켓이 연결되지 않았습니다.');
    this.socket.emit(event, data);
  }

  getSocket() {
    return this.socket;
  }

  get isConnected() {
    return !!this.socket?.connected;
  }
  
  joinRoom(roomId: string, password?: string) {
    this.emit('join_room', { room_id: roomId, password });
  }
}

export const socketService = new SocketService();