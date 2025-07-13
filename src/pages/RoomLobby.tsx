import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { RoomResponse } from '../services/api';
// import LobbyChatBox from '../components/game/LobbyChatBox'; // 삭제된 컴포넌트
import { useSocket } from '../hooks/useSocket';
import { useSocketHandlers } from '../hooks/useSocketHandlers';
import ChatBox from '../components/common/ChatBox';
import NotFound from './NotFound';
import { SocketEventType } from '../types/socket';

const RoomLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false); // 방 입장 상태 추적
  const [profileLoading, setProfileLoading] = useState(true); // 프로필 로딩 상태
  const { user } = useAuthStore();
  const { getRoom, startGame, endGame, getMyProfile, getMyRoom, getChatHistory } = useApi();
  const { isConnected, error: connectionError, joinRoom, leaveRoom, socket } = useSocket({
    token: useAuthStore.getState().accessToken || '',
  });

  // 소켓 이벤트 핸들러
  const { registerEventHandlers } = useSocketHandlers({
    socket,
    roomId: roomId!,
    onRoomUpdate: () => {
      getMyRoom().then((res: { data: RoomResponse }) => {
        if (res.data && res.data.id === roomId) {
          setRoom(res.data);
        }
      });
    },
  });

  useEffect(() => {
    if (!roomId) return;

    // 먼저 프로필을 확인하고, 방 정보를 가져옴
    fetchMyProfile();
    fetchRoom();
  }, [roomId]);

  // 프로필과 방 정보를 모두 가져온 후에만 소켓 연결 및 입장
  useEffect(() => {
    if (!roomId || !room || !isConnected || !myProfile || hasJoinedRoom) return;

    console.log('[RoomLobby] 방 입장 시도:', { roomId, isConnected, hasProfile: !!myProfile });
    
    fetchChatHistory(); // 채팅 이력 가져오기

    // 방이 존재하고 프로필이 있을 때만 소켓으로 입장
    joinRoom(roomId)
      .then(() => {
        console.log('[RoomLobby] 방 입장 성공');
        setHasJoinedRoom(true);
      })
      .catch((error) => {
        console.error('[RoomLobby] 방 입장 실패:', error);
        setError('방 입장에 실패했습니다. 소켓 연결을 확인해주세요.');
      });
  }, [roomId, room, isConnected, myProfile, hasJoinedRoom]);

  const fetchRoom = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getRoom(roomId!);
      setRoom(response.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '방 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [roomId, getRoom]);

  const fetchMyProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const response = await getMyProfile();
      console.log('[RoomLobby] 프로필 조회 성공:', response);
      setMyProfile(response);
    } catch (error) {
      console.error('[RoomLobby] 프로필 조회 실패:', error);
      
      // 프로필이 없는 경우 프로필 생성 페이지로 이동
      if (error instanceof Error && error.message.includes('Profile not found')) {
        alert('프로필이 없습니다. 프로필을 먼저 생성해주세요.');
        navigate('/create-profile');
        return;
      }
      
      // 다른 에러의 경우 사용자에게 알림
      alert('프로필 조회에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setProfileLoading(false);
    }
  }, [getMyProfile, navigate]);

  const fetchChatHistory = useCallback(async () => {
    if (!roomId) return;
    
    try {
      const response = await getChatHistory(roomId, 1, 50); // 최근 50개 메시지
      setChatHistory(response.data.messages || []);
    } catch (error) {
      console.error('채팅 이력 조회 실패:', error);
    }
  }, [roomId, getChatHistory]);

  const handleStartGame = async () => {
    if (!roomId) return;
    
    try {
      // 소켓 연결 상태 확인
      if (!socket?.connected) {
        alert('소켓이 연결되지 않았습니다. 게임을 시작할 수 없습니다.');
        return;
      }
      
      // 소켓으로 게임 시작 요청 (백엔드에 없는 이벤트이므로 문자열로 직접 사용)
      socket.emit('start_game', { room_id: roomId });
      
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
      setHasJoinedRoom(false); // 방 입장 상태 초기화
      navigate('/home');
    } catch (error) {
      console.error('방 퇴장 실패:', error);
      navigate('/home');
    }
  };

  // 소켓 이벤트 핸들러 등록 (방이 존재할 때만)
  useEffect(() => {
    if (!room) return;
    
    const cleanup = registerEventHandlers();
    return cleanup;
  }, [registerEventHandlers, room]);

  // 게임 시작 이벤트 리스너 (백엔드에 없는 이벤트이므로 별도 처리)
  useEffect(() => {
    if (!socket || !roomId || !room) return;

    const handleGameStarted = (data: any) => {
      if (data.room_id === roomId) {
        alert('게임이 시작되었습니다!');
        navigate(`/game/${roomId}`);
      }
    };

    socket.on('game_started', handleGameStarted);
    return () => {
      socket.off('game_started', handleGameStarted);
    };
  }, [socket, roomId, room, navigate]);

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
  const isHost = room?.host_profile_id === myProfile?.user_id;

  if (connectionError && room) {
    // 방이 존재할 때만 소켓 연결 오류 표시
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

  if (loading || profileLoading) {
    return <div>정보를 불러오는 중...</div>;
  }

  // 에러 발생 시 NotFound로 리다이렉트
  if (error) {
    return <NotFound />;
  }

  if (!room) {
    return <NotFound />;
  }

  // 프로필이 없으면 프로필 생성 페이지로 이동
  if (!myProfile) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>프로필이 필요합니다</h2>
        <p>방에 참가하기 전에 프로필을 먼저 생성해주세요.</p>
        <button onClick={() => navigate('/create-profile')}>
          프로필 생성하기
        </button>
      </div>
    );
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
          <span><strong>방장:</strong> {room.host_display_name}</span>
          <span><strong>인원:</strong> {room.current_players}/{room.max_players}</span>
          <span><strong>상태:</strong> {getStatusText(room.status)}</span>
          <span><strong>공개:</strong> {getVisibilityText(room.visibility)}</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <img 
                  src={myProfile.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'} 
                  alt="내 프로필 이미지"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {myProfile.display_name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    레벨 {myProfile.user_level}
                  </div>
                </div>
              </div>
              {myProfile.bio && (
                <div style={{ fontSize: '14px' }}>
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
                  <div key={player.profile_id} style={{ 
                    border: '1px solid #ddd', 
                    padding: '12px', 
                    borderRadius: '6px',
                    backgroundColor: player.role === 'host' ? '#f0f8ff' : '#fafafa'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <img 
                        src={player.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'}
                        alt={`${player.display_name} 프로필 이미지`}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <strong>{player.display_name}</strong>
                          {player.role === 'host' && <span style={{ color: 'blue' }}>👑</span>}
                        </div>
                        <small style={{ color: '#666' }}>
                          {player.role === 'host' ? '방장' : player.role === 'player' ? '플레이어' : '관찰자'}
                        </small>
                      </div>
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
          <ChatBox 
            roomId={roomId!} 
            socket={socket} 
            user={user} 
            chatType="lobby" 
            initialMessages={chatHistory}
          />
        </div>
      </div>
    </div>
  );
};

export default RoomLobby; 