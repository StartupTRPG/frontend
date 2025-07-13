import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  showCloseButton: boolean;
}

const useModal = () => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    message: '',
    type: 'info',
    showCloseButton: true
  });

  const showModal = useCallback((
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    title?: string,
    showCloseButton: boolean = true
  ) => {
    setModalState({
      isOpen: true,
      message,
      type,
      title,
      showCloseButton
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showModal(message, 'success', title);
  }, [showModal]);

  const showError = useCallback((message: string, title?: string) => {
    showModal(message, 'error', title);
  }, [showModal]);

  const showWarning = useCallback((message: string, title?: string) => {
    showModal(message, 'warning', title);
  }, [showModal]);

  const showInfo = useCallback((message: string, title?: string) => {
    showModal(message, 'info', title);
  }, [showModal]);

  return {
    modalState,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default useModal; 