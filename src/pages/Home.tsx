import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { RoomListResponse, RoomCreateRequest } from '../services/api';


const Home: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const { user } = useAuthStore();
  const { getRooms, createRoom } = useApi();

  // 방 생성 폼 상태
  const [createForm, setCreateForm] = useState<RoomCreateRequest>({
    title: '',
    description: '',
    max_players: 4, // 6에서 4로 변경
    visibility: 'public',
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
      alert(error instanceof Error ? error.message : '방 생성에 실패했습니다.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = (room: RoomListResponse) => {
    // 비밀번호가 있는 경우 모달 표시
    // 비밀번호가 없는 경우 바로 소켓으로 입장 요청
    if (room.has_password) {
      alert('비밀번호가 필요한 방입니다.');
      // 비밀번호 입력 모달 표시 로직 제거
    } else {
      joinRoomViaSocket(room.id);
    }
  };

  const joinRoomViaSocket = (roomId: string) => {
    navigate(`/room/${roomId}`);
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
    </div>
  );
};

export default Home; 