import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { RoomResponse } from '../services/api';
// import LobbyChatBox from '../components/game/LobbyChatBox'; // 삭제된 컴포넌트
import { useSocket } from '../hooks/useSocket';
import ChatBox from '../components/common/ChatBox';
import { SocketEventType } from '../types/socket';

const RoomLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const { user } = useAuthStore();
  const { getRoom, startGame, endGame, getMyProfile } = useApi();
  const { isConnected, error: connectionError, joinRoom, leaveRoom, socket } = useSocket({
    token: useAuthStore.getState().accessToken || '',
  });

  // 1. useLocation import 및 password 변수 삭제
  // const location = useLocation();
  // const password = location.state?.password;

  useEffect(() => {
    if (!roomId) return;
    if (!isConnected) return; // 소켓 연결될 때까지 대기

    fetchRoom();
    fetchMyProfile();

    // 2. useEffect에서 joinRoom(roomId)만 호출하도록 수정
    joinRoom(roomId).catch((error) => {
      setError('방 입장에 실패했습니다. 소켓 연결을 확인해주세요.');
    });
    // 필요시 socket.on(...)으로 이벤트 리스너 등록 가능
  }, [roomId, isConnected, navigate]);

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
      // 소켓 연결 상태 확인
      if (!socket?.connected) {
        alert('소켓이 연결되지 않았습니다. 게임을 시작할 수 없습니다.');
        return;
      }
      
      // 소켓으로 게임 시작 요청
      socket.emit(SocketEventType.START_GAME, { room_id: roomId });
      
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

  const handleLeaveRoom = () => {
    if (!roomId) return;
    try {
      if (socket?.connected) {
        socket.emit(SocketEventType.LEAVE_ROOM, { room_id: roomId });
      }
      navigate('/home');
    } catch (error) {
      console.error('방 퇴장 실패:', error);
      navigate('/home');
    }
  };

  // 소켓 이벤트 리스너 등록
  useEffect(() => {
    if (!socket || !roomId) return;

    // 게임 시작 성공 이벤트 리스너
    const handleGameStarted = (data: any) => {
      if (data.room_id === roomId) {
        alert('게임이 시작되었습니다!');
        navigate(`/game/${roomId}`);
      }
    };

    // 방 퇴장 성공 이벤트 리스너
    const handleRoomLeft = (data: any) => {
      if (data.room_id === roomId) {
        navigate('/home');
      }
    };

    // 이벤트 리스너 등록
    socket.on(SocketEventType.GAME_STARTED, handleGameStarted);
    socket.on(SocketEventType.ROOM_LEFT, handleRoomLeft);

    // 클린업 함수
    return () => {
      socket.off(SocketEventType.GAME_STARTED, handleGameStarted);
      socket.off(SocketEventType.ROOM_LEFT, handleRoomLeft);
    };
  }, [socket, roomId, navigate]);

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

  if (connectionError) {
    // "Token is required." 에러 메시지 한글화 및 안내
    const isTokenError = connectionError === 'Token is required.';
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>소켓 연결 오류</h2>
        <p>
          {isTokenError
            ? '로그인 정보가 만료되었거나 인증에 실패했습니다.\n다시 로그인 해주세요.'
            : connectionError}
        </p>
        {isTokenError && (
          <button onClick={() => window.location.href = '/login'}>
            로그인 페이지로 이동
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return <div>방 정보를 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>오류가 발생했습니다</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          페이지 새로고침
        </button>
      </div>
    );
  }

  if (!room) {
    return <div>방을 찾을 수 없습니다.</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #ddd',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <button onClick={() => navigate('/home')} style={{ marginRight: '10px' }}>
              홈으로 돌아가기
            </button>
            <button onClick={fetchRoom} style={{ marginRight: '10px' }}>새로고침</button>
            <button 
              onClick={handleLeaveRoom}
              style={{ 
                backgroundColor: '#f44336', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              방 나가기
            </button>
          </div>
          <h1 style={{ margin: 0 }}>{room.title}</h1>
        </div>
        
        {room.description && <p style={{ margin: '5px 0', color: '#666' }}>{room.description}</p>}
        
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
          <span><strong>방장:</strong> {room.host_username}</span>
          <span><strong>인원:</strong> {room.current_players}/{room.max_players}</span>
          <span><strong>상태:</strong> {getStatusText(room.status)}</span>
          <span><strong>공개:</strong> {getVisibilityText(room.visibility)}</span>
          {room.has_password && <span><strong>🔒 비밀번호</strong></span>}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        gap: '20px', 
        padding: '20px',
        overflow: 'hidden'
      }}>
        {/* 왼쪽 패널 - 방 정보 및 플레이어 목록 */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto'
        }}>
          {/* 내 프로필 정보 */}
          {myProfile && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>내 정보</h3>
              <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                <span><strong>표시명:</strong> {myProfile.display_name}</span>
                <span><strong>레벨:</strong> {myProfile.user_level}</span>
              </div>
              {myProfile.bio && (
                <div style={{ marginTop: '10px', fontSize: '14px' }}>
                  <strong>자기소개:</strong> {myProfile.bio}
                </div>
              )}
            </div>
          )}

          {/* 플레이어 목록 */}
          <div style={{ 
            flex: 1,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px'
          }}>
            <h2 style={{ margin: '0 0 15px 0' }}>플레이어 목록</h2>
            {room.players.length === 0 ? (
              <p style={{ color: '#666' }}>아직 참가한 플레이어가 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {room.players.map((player) => (
                  <div key={player.user_id} style={{ 
                    border: '1px solid #ddd', 
                    padding: '12px', 
                    borderRadius: '6px',
                    backgroundColor: player.is_host ? '#f0f8ff' : '#fafafa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{player.username}</strong>
                        {player.is_host && <span style={{ color: 'blue', marginLeft: '10px' }}>👑 방장</span>}
                      </div>
                      <small style={{ color: '#666' }}>
                        {player.role === 'host' ? '방장' : player.role === 'player' ? '플레이어' : '관찰자'}
                      </small>
                    </div>
                    <div style={{ marginTop: '5px' }}>
                      <small style={{ color: '#999' }}>
                        참가일: {new Date(player.joined_at).toLocaleString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 호스트 전용 버튼 */}
          {isHost && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>방장 기능</h3>
              {room.status === 'waiting' && (
                <button 
                  onClick={handleStartGame}
                  style={{ 
                    backgroundColor: '#4CAF50', 
                    color: 'white', 
                    border: 'none', 
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer'
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
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  게임 종료
                </button>
              )}
            </div>
          )}

          {/* 게임 상태 메시지 */}
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '6px',
            border: '1px solid #bbdefb'
          }}>
            {room.status === 'waiting' && (
              <p style={{ margin: 0, color: '#1976d2' }}>
                모든 플레이어가 준비되면 방장이 게임을 시작할 수 있습니다.
              </p>
            )}
            {room.status === 'playing' && (
              <p style={{ margin: 0, color: '#1976d2' }}>
                게임이 진행 중입니다.
              </p>
            )}
            {room.status === 'finished' && (
              <p style={{ margin: 0, color: '#1976d2' }}>
                게임이 종료되었습니다.
              </p>
            )}
          </div>
        </div>

        {/* 오른쪽 패널 - 로비 채팅창 */}
        <div style={{ 
          width: '350px',
          flexShrink: 0
        }}>
          <ChatBox roomId={roomId!} socket={socket} user={user} chatType="lobby" />
        </div>
      </div>
    </div>
  );
};

export default RoomLobby; 