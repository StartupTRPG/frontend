import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { RoomListResponse, RoomCreateRequest } from '../services/api';
import { socketService } from '../services/socketService';


const Home: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomListResponse | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { getRooms, createRoom } = useApi();

  // 방 생성 폼 상태
  const [createForm, setCreateForm] = useState<RoomCreateRequest>({
    title: '',
    description: '',
    max_players: 4, // 6에서 4로 변경
    visibility: 'public',
    password: '',
    game_settings: {},
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await getRooms();
      setRooms(response.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '방 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.title.trim()) {
      alert('방 제목을 입력해주세요.');
      return;
    }

    // 비밀번호 검증 제거 (선택사항이므로)
    // if (!createForm.password.trim()) {
    //   alert('방 비밀번호를 입력해주세요.');
    //   return;
    // }

    try {
      setCreateLoading(true);
      await createRoom(createForm);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        max_players: 4, // 6에서 4로 변경
        visibility: 'public',
        password: '',
        game_settings: {},
      });
      // 방 생성 후 목록 새로고침
      await fetchRooms();
    } catch (error) {
      alert(error instanceof Error ? error.message : '방 생성에 실패했습니다.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = (room: RoomListResponse) => {
    if (room.has_password) {
      // 비밀번호가 있는 경우 모달 표시
      setSelectedRoom(room);
      setShowPasswordModal(true);
      setPassword('');
      setPasswordError(null);
    } else {
      // 비밀번호가 없는 경우 바로 소켓으로 입장 요청
      joinRoomViaSocket(room.id);
    }
  };

  const joinRoomViaSocket = (roomId: string, password?: string) => {
    try {
      // 타입 안전한 방 입장
      socketService.joinRoom(roomId, password);
      
      // 페이지 이동
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('방 입장 실패:', error);
      alert('방 입장에 실패했습니다.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRoom || !password.trim()) {
      setPasswordError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      // 소켓으로 비밀번호와 함께 방 입장 요청
      joinRoomViaSocket(selectedRoom.id, password);
      
      setShowPasswordModal(false);
      setSelectedRoom(null);
      setPassword('');
      setPasswordError(null);
    } catch (error) {
      setPasswordError('방 입장 중 오류가 발생했습니다.');
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setSelectedRoom(null);
    setPassword('');
    setPasswordError(null);
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

  if (loading) {
    return <div>방 목록을 불러오는 중...</div>;
  }

  if (error) {
    return <div>오류: {error}</div>;
  }

  return (
    <div>
      <h1>방 목록</h1>
      <p>안녕하세요, {user?.username}님!</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={fetchRooms} style={{ marginRight: '10px' }}>새로고침</button>
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
                <span>방장: {room.host_username}</span>
                <span> | </span>
                <span>인원: {room.current_players}/{room.max_players}</span>
                <span> | </span>
                <span>상태: {getStatusText(room.status)}</span>
                <span> | </span>
                <span>공개: {getVisibilityText(room.visibility)}</span>
                {room.has_password && <span> | 🔒 비밀번호</span>}
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%',
          }}>
            <h2>방 생성</h2>
            <form onSubmit={handleCreateRoom}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="title" style={{ display: 'block', marginBottom: '5px' }}>
                  방 제목 *
                </label>
                <input
                  type="text"
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>
                  방 설명
                </label>
                <textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', height: '80px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="max_players" style={{ display: 'block', marginBottom: '5px' }}>
                  최대 인원
                </label>
                <select
                  id="max_players"
                  value={createForm.max_players}
                  onChange={(e) => setCreateForm({ ...createForm, max_players: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                >
                  <option value={4}>4명</option>
                  <option value={5}>5명</option>
                  <option value={6}>6명</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="visibility" style={{ display: 'block', marginBottom: '5px' }}>
                  공개 설정
                </label>
                <select
                  id="visibility"
                  value={createForm.visibility}
                  onChange={(e) => setCreateForm({ ...createForm, visibility: e.target.value as 'public' | 'private' })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                >
                  <option value="public">공개</option>
                  <option value="private">비공개</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>
                  방 비밀번호 (선택사항)
                </label>
                <input
                  type="password"
                  id="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="비밀번호를 입력하면 비공개 방이 됩니다"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    cursor: createLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {createLoading ? '생성 중...' : '방 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 비밀번호 입력 모달 */}
      {showPasswordModal && selectedRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%',
          }}>
            <h2>방 비밀번호 입력</h2>
            <p>"{selectedRoom.title}" 방에 입장하려면 비밀번호를 입력하세요.</p>
            
            <form onSubmit={handlePasswordSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="roomPassword" style={{ display: 'block', marginBottom: '5px' }}>
                  비밀번호
                </label>
                <input
                  type="password"
                  id="roomPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                  autoFocus
                />
                {passwordError && (
                  <p style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
                    {passwordError}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handlePasswordCancel}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  입장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 