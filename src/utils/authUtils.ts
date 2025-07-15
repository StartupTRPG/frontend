import { useAuthStore } from '../stores/authStore';

/**
 * 401 에러 발생 시 모든 인증 관련 데이터를 정리하고 로그인 페이지로 리디렉션
 */
export const handleUnauthorizedError = () => {
  
  // 1. Zustand 스토어에서 인증 상태 초기화
  const { logout } = useAuthStore.getState();
  logout();
  
  // 2. 로컬스토리지 완전 정리
  localStorage.clear();
  
  // 3. 세션스토리지 완전 정리
  sessionStorage.clear();
  
  // 4. 모든 쿠키 삭제
  clearAllCookies();
  
  // 5. Authorization 헤더 제거 (fetch 요청에서 자동으로 처리됨)
  
  // 6. 로그인 페이지로 리디렉션
  window.location.href = '/login';
};

/**
 * 모든 쿠키를 삭제하는 함수
 */
const clearAllCookies = () => {
  const cookies = document.cookie.split(';');
  
  cookies.forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    
    // 쿠키 삭제 (만료일을 과거로 설정)
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
  });
};

/**
 * API 응답에서 401 에러인지 확인하는 함수
 */
export const isUnauthorizedError = (error: any): boolean => {
  // fetch 에러의 경우
  if (error instanceof Response) {
    return error.status === 401;
  }
  
  // 일반 에러 객체의 경우
  if (error && typeof error === 'object') {
    // status 속성이 있는 경우
    if ('status' in error && error.status === 401) {
      return true;
    }
    
    // message에 401이 포함된 경우
    if ('message' in error && typeof error.message === 'string') {
      return error.message.includes('401') || error.message.includes('Unauthorized');
    }
  }
  
  return false;
}; 