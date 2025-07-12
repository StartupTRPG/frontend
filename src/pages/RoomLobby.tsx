import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { RoomResponse } from '../services/api';

const RoomLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const { user } = useAuthStore();
  const { getRoom, startGame, endGame, getMyProfile } = useApi();

  useEffect(() => {
    if (roomId) {
      fetchRoom();
      fetchMyProfile();
    }
  }, [roomId]);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const response = await getRoom(roomId!);
      setRoom(response.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '방 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const response = await getMyProfile();
      setMyProfile(response);
    } catch (error) {
      console.error('프로필 조회 실패:', error);
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    
    try {
      await startGame(roomId);
      // 게임 시작 후 게임 페이지로 이동 (나중에 구현)
      alert('게임이 시작되었습니다!');
    } catch (error) {
      alert(error instanceof Error ? error.message : '게임 시작에 실패했습니다.');
    }
  };

  const handleEndGame = async () => {
    if (!roomId) return;
    
    try {
      await endGame(roomId);
      alert('게임이 종료되었습니다.');
      fetchRoom(); // 방 상태 새로고침
    } catch (error) {
      alert(error instanceof Error ? error.message : '게임 종료에 실패했습니다.');
    }
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

  // 프로필 정보를 사용하여 호스트 여부 확인
  const isHost = room?.host_id === user?.id;

  if (loading) {
    return <div>방 정보를 불러오는 중...</div>;
  }

  if (error) {
    return <div>오류: {error}</div>;
  }

  if (!room) {
    return <div>방을 찾을 수 없습니다.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/home')} style={{ marginRight: '10px' }}>
          홈으로 돌아가기
        </button>
        <button onClick={fetchRoom}>새로고침</button>
      </div>

      <h1>{room.title}</h1>
      {room.description && <p>{room.description}</p>}
      
      <div style={{ marginBottom: '20px' }}>
        <div>
          <strong>방장:</strong> {room.host_username}
        </div>
        <div>
          <strong>인원:</strong> {room.current_players}/{room.max_players}
        </div>
        <div>
          <strong>상태:</strong> {getStatusText(room.status)}
        </div>
        <div>
          <strong>공개:</strong> {getVisibilityText(room.visibility)}
        </div>
        {room.has_password && <div><strong>비밀번호 보호</strong></div>}
        <div>
          <strong>생성일:</strong> {new Date(room.created_at).toLocaleString()}
        </div>
      </div>

      {/* 내 프로필 정보 표시 */}
      {myProfile && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
          <h3>내 정보</h3>
          <div>
            <strong>표시명:</strong> {myProfile.display_name}
          </div>
          <div>
            <strong>레벨:</strong> {myProfile.user_level}
          </div>
          {myProfile.bio && (
            <div>
              <strong>자기소개:</strong> {myProfile.bio}
            </div>
          )}
        </div>
      )}

      {/* 플레이어 목록 */}
      <div style={{ marginBottom: '20px' }}>
        <h2>플레이어 목록</h2>
        {room.players.length === 0 ? (
          <p>아직 참가한 플레이어가 없습니다.</p>
        ) : (
          <div>
            {room.players.map((player) => (
              <div key={player.user_id} style={{ 
                border: '1px solid #ddd', 
                padding: '10px', 
                margin: '5px 0',
                backgroundColor: player.is_host ? '#f0f8ff' : 'white'
              }}>
                <div>
                  <strong>{player.username}</strong>
                  {player.is_host && <span style={{ color: 'blue', marginLeft: '10px' }}>👑 방장</span>}
                </div>
                <div>
                  <small>역할: {player.role === 'host' ? '방장' : player.role === 'player' ? '플레이어' : '관찰자'}</small>
                </div>
                <div>
                  <small>참가일: {new Date(player.joined_at).toLocaleString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 호스트 전용 버튼 */}
      {isHost && (
        <div style={{ marginBottom: '20px' }}>
          {room.status === 'waiting' && (
            <button 
              onClick={handleStartGame}
              style={{ 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px',
                marginRight: '10px'
              }}
            >
              게임 시작
            </button>
          )}
          {room.status === 'playing' && (
            <button 
              onClick={handleEndGame}
              style={{ 
                backgroundColor: '#f44336', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px' 
              }}
            >
              게임 종료
            </button>
          )}
        </div>
      )}

      {/* 게임 상태에 따른 메시지 */}
      {room.status === 'waiting' && (
        <p>모든 플레이어가 준비되면 방장이 게임을 시작할 수 있습니다.</p>
      )}
      {room.status === 'playing' && (
        <p>게임이 진행 중입니다.</p>
      )}
      {room.status === 'finished' && (
        <p>게임이 종료되었습니다.</p>
      )}
    </div>
  );
};

export default RoomLobby; 