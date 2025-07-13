import { useState } from 'react';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { RoomCreateRequest, RoomUpdateRequest, RoomResponse, RoomListResponse } from '../types/room';

export const useRoom = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  const createRoom = async (roomData: RoomCreateRequest) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.createRoom(accessToken, roomData);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '방 생성 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getRooms = async (params?: {
    status?: string;
    visibility?: string;
    search?: string;
    page?: number;
    limit?: number;
    exclude_playing?: boolean;
  }) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getRooms(accessToken, params);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '방 목록 조회 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getMyRoom = async () => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getMyRoom(accessToken);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '내 방 조회 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getRoom = async (roomId: string) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getRoom(accessToken, roomId);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '방 정보 조회 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateRoom = async (roomId: string, roomData: RoomUpdateRequest) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.updateRoom(accessToken, roomId, roomData);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '방 수정 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.deleteRoom(accessToken, roomId);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '방 삭제 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const startGame = async (roomId: string) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.startGame(accessToken, roomId);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '게임 시작 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const endGame = async (roomId: string) => {
    if (!accessToken) throw new Error('인증이 필요합니다.');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.endGame(accessToken, roomId);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : '게임 종료 중 오류가 발생했습니다.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createRoom,
    getRooms,
    getMyRoom,
    getRoom,
    updateRoom,
    deleteRoom,
    startGame,
    endGame,
  };
}; 