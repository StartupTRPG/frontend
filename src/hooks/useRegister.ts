import { useState } from 'react';
import { RegisterCredentials } from '../types/auth';
import { apiService } from '../services/api';

interface RegisterState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export const useRegister = () => {
  const [registerState, setRegisterState] = useState<RegisterState>({
    loading: false,
    error: null,
    success: false,
  });

  const register = async (credentials: RegisterCredentials) => {
    setRegisterState({ loading: true, error: null, success: false });
    
    try {
      const response = await apiService.register(credentials);
      setRegisterState({
        loading: false,
        error: null,
        success: true,
      });
      return response;
    } catch (error) {
      setRegisterState({
        loading: false,
        error: error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.',
        success: false,
      });
      throw error;
    }
  };

  const resetState = () => {
    setRegisterState({ loading: false, error: null, success: false });
  };

  return {
    ...registerState,
    register,
    resetState,
  };
}; 