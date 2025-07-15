import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { RoomListResponse, RoomCreateRequest, UserProfileResponse } from '../services/api';
import { useProfile } from '../hooks/useProfile';
import { SocketEventType } from '../types/socket';
import { useSocket } from '../hooks/useSocket';
import useModal from '../hooks/useModal';
import Modal from '../components/common/Modal';
import './Home.css'; // 새로 만든 CSS 파일 import

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState<RoomListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5); // 0: 비활성화, 1, 5, 10초 (기본값: 5초)
  const DEFAULT_AVATAR_URL = "https://ssl.pstatic.net/static/pwe/address/img_profile.png";

  // 인증 관련 user는 그대로 두고, 나머지는 profile 사용
  const { user, logout } = useAuthStore();
  const { getRooms, createRoom, logout: apiLogout } = useApi();
  const { socket, isConnected } = useSocket({
    token: useAuthStore.getState().accessToken || '',
  });
  const { getMyProfile } = useProfile();
  const { modalState, showError, showWarning, hideModal } = useModal();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 방 생성 폼 상태
  const [createForm, setCreateForm] = useState<RoomCreateRequest>({
    title: '',
    description: '',
    max_players: 4, // 6에서 4로 변경
    visibility: 'public',
    game_settings: {},
  });

  useEffect(() => {
    setTimeout(() => {
      fetchRooms();
    }, 700); // 0.7초 딜레이 후 실행
    fetchMyProfile();
  }, [location.pathname]);

  // 게임 종료 이벤트 리스너 (Home 페이지에서도 처리)
  useEffect(() => {
    if (!socket) return;
    
    const handleGameFinish = (data: any) => {
      console.log('[Home] 게임 종료됨:', data);
      // 방 목록 새로고침
      fetchRooms(false);
    };

    console.log('[Home] FINISH_GAME 이벤트 리스너 등록');
    socket.on(SocketEventType.FINISH_GAME, handleGameFinish);
    
    return () => {
      console.log('[Home] FINISH_GAME 이벤트 리스너 해제');
      socket.off(SocketEventType.FINISH_GAME, handleGameFinish);
    };
  }, [socket]); // 홈 경로로 이동할 때마다 실행

  // 페이지 포커스 시 방 리스트 새로고침
  useEffect(() => {
    const handleFocus = () => {
      console.log('[Home] 페이지 포커스 - 방 리스트 새로고침');
      fetchRooms(false); // 로딩 상태 없이 방 리스트만 새로고침
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Home 페이지 진입 시 방 리스트 새로고침
  useEffect(() => {
    console.log('[Home] 페이지 진입 - 방 리스트 새로고침');
    fetchRooms(false); // 로딩 상태 없이 방 리스트만 새로고침
  }, [location.pathname]);

  // 자동 새로고침 설정
  useEffect(() => {
    // 기존 인터벌 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 새로운 인터벌 설정
    if (autoRefreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchRooms(false); // 로딩 상태 없이 방 리스트만 업데이트
      }, autoRefreshInterval * 1000);
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefreshInterval]);

  const fetchRooms = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await getRooms();
      setRooms(response.data);
      setError(null); // 에러 상태 초기화
    } catch (error) {
      setError(error instanceof Error ? error.message : '방 목록을 불러오는데 실패했습니다.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchMyProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await getMyProfile();
      setProfile(response as UserProfileResponse);
    } catch (error) {
      console.error('[Home] 프로필 조회 실패:', error);
      
      // 프로필이 없는 경우 프로필 생성 페이지로 이동
      if (error instanceof Error && error.message.includes('Profile not found')) {
        showWarning('프로필이 없습니다. 프로필을 먼저 생성해주세요.', '프로필 필요');
        navigate('/create-profile');
        return;
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.title.trim()) {
      showError('방 제목을 입력해주세요.', '입력 오류');
      return;
    }

    try {
      setCreateLoading(true);
      const response = await createRoom(createForm);
      
      // 방 생성 성공 후 생성된 방으로 바로 이동
      if (response && response.data && response.data.id) {
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          max_players: 4, // 6에서 4로 변경
          visibility: 'public',
          game_settings: {},
        });
        
        // 소켓으로 방 입장 요청 (호스트이므로 비밀번호 없이)
        joinRoomViaSocket(response.data.id);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : '방 생성에 실패했습니다.', '방 생성 실패');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = (room: RoomListResponse) => {
    // 바로 소켓으로 입장 요청
    joinRoomViaSocket(room.id);
  };

  const joinRoomViaSocket = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const handleAutoRefreshChange = (interval: number) => {
    setAutoRefreshInterval(interval);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return '대기중';
      case 'profile_setup': return '프로필 설정';
      case 'playing': return '게임 진행중';
      case 'finished': return '게임 종료';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'waiting': return 'status-waiting'; // 채용 중 (초록색)
      case 'playing': return 'status-playing'; // 마감 (빨간색)
      case 'finished': return 'status-playing'; // 마감 (빨간색)
      default: return 'status-waiting';
    }
  }

  const getVisibilityText = (visibility: string) => {
    return visibility === 'public' ? '공개' : '비공개';
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (e) {}
    logout(); // 상태 초기화
    navigate('/login');
  };

  if (loading || profileLoading) {
    return <div>정보를 불러오는 중...</div>;
  }

  if (error) {
    return <div>오류: {error}</div>;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="home-logo-container">
          <img src="/images/ChatGPT Image 2025년 7월 14일 오후 11_26_38.png" alt="뽀롱인 로고" className="home-logo-img" />
        </div>
        <div className="home-profile-icon" onClick={() => navigate('/create-profile')} title="프로필 보기">
          <img src={profile?.avatar_url || DEFAULT_AVATAR_URL} alt="프로필 아이콘" className="home-profile-img" />
        </div>
      </header>
      
      <div className="filter-container">
        <button className="filter-button active">채용 중인 회사만 보기</button>
        <button className="filter-button">모두 선택</button>
      </div>

      {rooms.length === 0 ? (
        <p>현재 생성된 방이 없습니다. (현재 모집중인 회사가 없습니다.)</p>
      ) : (
        <main className="room-list">
          {rooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-header">
                <span className={`room-status ${getStatusClass(room.status)}`}>
                  {room.status === 'waiting' ? '채용중' : '마감'}
                </span>
                <span className="room-visibility">{getVisibilityText(room.visibility)}</span>
                <span className="room-date">{new Date(room.created_at).toLocaleDateString()}</span>
              </div>
              <div className="room-card-body">
                <h3 className="room-title">{room.title}</h3>
                <p className="room-description">{room.description || '경력무관 / 전 부문 모집'}</p>
              </div>
              <div className="room-positions-container">
                <p className="room-positions-title">모집 포지션</p>
                <div className="room-positions-tags">
                  <span className="room-position-tag designer">디자이너</span>
                  <span className="room-position-tag developer">개발자</span>
                </div>
              </div>
              <div className="room-card-footer">
                <button 
                  onClick={() => handleJoinRoom(room)}
                  className="join-button"
                >
                  지원하기
                </button>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* 기존 기능 버튼들 (Floating Action Buttons) */}
      <div className="home-actions">
         <button 
          onClick={() => setShowCreateModal(true)}
          className="home-action-btn"
          title="새 회사 등록 (방 생성)"
        >
          +
        </button>
        <button
          onClick={handleLogout}
          className="home-action-btn"
          title="로그아웃"
          style={{backgroundColor: '#f44336'}}
        >
          ⏻
        </button>
      </div>


      {/* 방 생성 모달 (기존 로직 그대로 사용) */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 8, minWidth: 350 }}>
            <h2>새 회사 등록 (방 생성)</h2>
            <form onSubmit={handleCreateRoom}>
              <div style={{ marginBottom: 10 }}>
                <label>회사명 (방 제목)</label>
                <input 
                  type="text" 
                  value={createForm.title} 
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })} 
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                  required
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>한 줄 소개 (설명)</label>
                <input 
                  type="text" 
                  value={createForm.description} 
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })} 
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>최대 인원</label>
                <input 
                  type="number" 
                  value={createForm.max_players} 
                  min={2} max={10}
                  onChange={e => setCreateForm({ ...createForm, max_players: Number(e.target.value) })} 
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                  required
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>공개 여부</label>
                <select 
                  value={createForm.visibility} 
                  onChange={e => setCreateForm({ ...createForm, visibility: e.target.value as 'public' | 'private' })}
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                >
                  <option value="public">공개</option>
                  <option value="private">비공개</option>
                </select>
              </div>
              <button 
                type="submit"
                style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', marginTop: 10 }}
                disabled={createLoading}
              >
                {createLoading ? '등록 중...' : '회사 등록'}
              </button>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ marginLeft: 10, padding: '10px 20px' }}
              >
                취소
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal (기존 로직 그대로 사용) */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        showCloseButton={modalState.showCloseButton}
      />
    </div>
  );
};

export default Home; 