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

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState<RoomListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5); // 0: 비활성화, 1, 5, 10초 (기본값: 5초)
  
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
    <div>
      {/* 상단 우측 로그아웃 버튼 */}
      <div style={{ position: 'absolute', top: 20, right: 30, zIndex: 100 }}>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 18px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
          }}
        >
          로그아웃
        </button>
      </div>
      <h1>방 목록</h1>
      
      {/* 프로필 정보 카드 */}
      {profile && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <img 
            src={profile.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'}
            alt="프로필 이미지"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>
              {profile.display_name}
            </h3>
            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
              레벨 {profile.user_level}
            </p>
            {profile.bio && (
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      )}
      
      <p>안녕하세요, {profile?.display_name}님!</p>
      
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => fetchRooms(true)} style={{ marginRight: '10px' }}>새로고침</button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <label>자동 새로고침:</label>
          <select 
            value={autoRefreshInterval} 
            onChange={(e) => handleAutoRefreshChange(Number(e.target.value))}
            style={{ padding: '5px', borderRadius: '4px' }}
          >
            <option value={0}>비활성화</option>
            <option value={1}>1초</option>
            <option value={5}>5초</option>
            <option value={10}>10초</option>
          </select>
          {autoRefreshInterval > 0 && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              ({autoRefreshInterval}초마다 자동 새로고침)
            </span>
          )}
        </div>
        
        <button 
          onClick={() => navigate('/create-profile')}
          style={{ backgroundColor: '#FF9800', color: 'white', border: 'none', padding: '10px 20px', marginRight: '10px' }}
        >
          프로필
        </button>
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px' }}
        >
          방 생성
        </button>
      </div>

      {rooms.length === 0 ? (
        <p>현재 생성된 방이 없습니다.</p>
      ) : (
        <div>
          {rooms.map((room) => (
            <div key={room.id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '15px' }}>
              <h3>{room.title}</h3>
              {room.description && <p>{room.description}</p>}
              <div>
                <span>방장: {room.host_display_name}</span>
                <span> | </span>
                <span>인원: {room.current_players}/{room.max_players}</span>
                <span> | </span>
                <span>상태: {getStatusText(room.status)}</span>
                <span> | </span>
                <span>공개: {getVisibilityText(room.visibility)}</span>
              </div>
              <div>
                <small>생성일: {new Date(room.created_at).toLocaleString()}</small>
              </div>
              <button 
                onClick={() => handleJoinRoom(room)}
                style={{ 
                  backgroundColor: '#2196F3', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                방 입장
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 방 생성 모달 */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 8, minWidth: 350 }}>
            <h2>방 생성</h2>
            <form onSubmit={handleCreateRoom}>
              <div style={{ marginBottom: 10 }}>
                <label>방 제목</label>
                <input 
                  type="text" 
                  value={createForm.title} 
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })} 
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                  required
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>설명</label>
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
                {createLoading ? '생성 중...' : '방 생성'}
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
      
      {/* Modal */}
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