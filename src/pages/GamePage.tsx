import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { useSocket } from '../hooks/useSocket';
import ChatBox from '../components/common/ChatBox';
import { SocketEventType } from '../types/socket';
import { UserProfileResponse } from '../services/api';

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { getRoom, getMyProfile, getChatHistory } = useApi();
  const { 
    socket, 
    isConnected, 
    currentRoom,
    joinRoom, 
    leaveRoom, 
    finishGame 
  } = useSocket({
    token: useAuthStore.getState().accessToken || '',
  });
  
  // 방 입장 시도 상태 추적
  const joinAttemptedRef = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [room, setRoom] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // 프로필은 최초 1회만
  useEffect(() => {
    getMyProfile().then(res => setProfile(res.data as UserProfileResponse));
  }, []);

  // 방 정보는 roomId 바뀔 때마다
  useEffect(() => {
    if (!roomId) return;
    console.log('[GamePage] 방 정보 로드:', roomId);
    getRoom(roomId).then(res => {
      console.log('[GamePage] 방 정보 로드 완료:', res.data);
      setRoom(res.data);
    });
  }, [roomId]);

  // 소켓 연결 후 방 입장 확인 (개선된 로직)
  useEffect(() => {
    if (!isConnected || !roomId || !socket?.connected) {
      console.log('[GamePage] 방 입장 조건 불만족:', { isConnected, roomId, socketConnected: socket?.connected });
      return;
    }
    
    // 이미 같은 방에 있으면 중복 입장 방지
    if (currentRoom === roomId) {
      console.log('[GamePage] 이미 방에 입장되어 있음:', roomId);
      return;
    }
    
    // 이미 입장 시도 중이면 무시
    if (joinAttemptedRef.current) {
      console.log('[GamePage] 이미 방 입장 시도 중:', roomId);
      return;
    }
    
    // 기존 타이머가 있으면 취소
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
    
    console.log('[GamePage] 방 입장 시도:', roomId);
    joinAttemptedRef.current = true;
    
    // 방 입장 시도
    joinRoom(roomId).then(() => {
      console.log('[GamePage] 방 입장 성공:', roomId);
      joinAttemptedRef.current = false;
      
      // 방 입장 성공 후 방 정보 즉시 갱신
      console.log('[GamePage] 방 입장 후 방 정보 갱신');
      getRoom(roomId).then(res => {
        console.log('[GamePage] 방 입장 후 방 정보 갱신 완료:', res.data);
        setRoom(res.data);
      }).catch(error => {
        console.error('[GamePage] 방 입장 후 방 정보 갱신 실패:', error);
      });
    }).catch(error => {
      console.error('[GamePage] 방 입장 실패:', error);
      joinAttemptedRef.current = false;
      
      // 방이 삭제된 경우 홈으로 이동
      if (error.message === 'Room has been deleted') {
        console.log('[GamePage] 방이 삭제됨, 홈으로 이동');
        alert('방이 삭제되었습니다.');
        navigate('/home');
        return;
      }
      
      // 재입장 대기 에러인 경우 조용히 처리 (사용자에게 에러 표시하지 않음)
      if (error.message === 'Please wait before rejoining the room') {
        console.log('[GamePage] 재입장 대기, 1초 후 재시도');
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[GamePage] 재입장 재시도:', roomId);
          joinAttemptedRef.current = false;
        }, 1000);
        return;
      }
      
      // 기타 에러는 재시도하지 않음
      if (error.message !== 'Already joining this room' && 
          error.message !== 'Already joining another room' &&
          error.message !== 'Already in room') {
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[GamePage] 방 입장 재시도:', roomId);
          joinAttemptedRef.current = false;
        }, 3000);
      }
    });
  }, [isConnected, roomId, socket, currentRoom]); // joinRoom 의존성 제거

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }
    };
  }, []);

  // 게임에서는 채팅 히스토리가 필요 없음
  // useEffect(() => {
  //   if (!roomId) return;
  //   getChatHistory(roomId).then(res => {
  //     if (res.data && res.data.messages) {
  //       setChatHistory(res.data.messages);
  //     }
  //   }).catch(error => {
  //     console.error('채팅 히스토리 로드 실패:', error);
  //   });
  // }, [roomId]);

  // 게임 시작/종료 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    
    console.log('[GamePage] START_GAME, FINISH_GAME 이벤트 리스너 등록 시도:', { socket: !!socket, roomId, socketConnected: socket?.connected });
    
    let isRefreshing = false; // 중복 호출 방지 플래그
    
    const handleGameStart = (data: any) => {
      console.log('[GamePage] START_GAME 이벤트 수신:', data);
      if (data.room_id === roomId) {
        console.log('[GamePage] 게임 시작됨:', data);
        // 게임 시작 시 방 정보 갱신 (중복 방지)
        if (!isRefreshing) {
          isRefreshing = true;
          getRoom(roomId).then(res => {
            console.log('[GamePage] 게임 시작 후 방 정보 갱신');
            setRoom(res.data);
            isRefreshing = false;
          }).catch(error => {
            console.error('[GamePage] 게임 시작 후 방 정보 갱신 실패:', error);
            isRefreshing = false;
          });
        }
      } else {
        console.log('[GamePage] 다른 방의 게임 시작 이벤트 무시:', data.room_id, '!=', roomId);
      }
    };
    
    const handleGameFinish = (data: any) => {
      console.log('[GamePage] FINISH_GAME 이벤트 수신:', data);
      if (data.room_id === roomId) {
        console.log('[GamePage] 게임 종료됨:', data);
        alert(`${data.host_display_name}님이 게임을 종료했습니다.`);
        navigate(`/room/${roomId}`); // 로비로 돌아가기
      } else {
        console.log('[GamePage] 다른 방의 게임 종료 이벤트 무시:', data.room_id, '!=', roomId);
      }
    };

    console.log('[GamePage] START_GAME, FINISH_GAME 이벤트 리스너 등록 완료');
    socket.on(SocketEventType.START_GAME, handleGameStart);
    socket.on(SocketEventType.FINISH_GAME, handleGameFinish);
    
    return () => {
      console.log('[GamePage] START_GAME, FINISH_GAME 이벤트 리스너 해제');
      socket.off(SocketEventType.START_GAME, handleGameStart);
      socket.off(SocketEventType.FINISH_GAME, handleGameFinish);
    };
  }, [socket, roomId, navigate, getRoom]);

  // 방 삭제 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleRoomDeleted = (data: any) => {
      if (data.room_id === roomId) {
        console.log('[GamePage] 방 삭제 이벤트 수신:', data);
        
        // 방 입장 시도 중이면 중단
        if (joinAttemptedRef.current) {
          console.log('[GamePage] 방 입장 시도 중단 (방 삭제됨)');
          joinAttemptedRef.current = false;
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
          }
        }
        
        alert('방이 삭제되었습니다.');
        navigate('/home');
      }
    };
    socket.on(SocketEventType.ROOM_DELETED, handleRoomDeleted);
    return () => { socket.off(SocketEventType.ROOM_DELETED, handleRoomDeleted); };
  }, [socket, roomId, navigate]);

  console.log('[GamePage] 렌더링:', { room: !!room, profile: !!profile, socket: !!socket, socketConnected: socket?.connected, roomId, currentRoom, isConnected });
  
  if (!room || !profile) return <div>로딩 중...</div>;

  const isHost = room.host_profile_id === profile.id;

  // 버튼 핸들러
  const handleLeaveGame = () => { 
    if (roomId) {
      leaveRoom();
    }
    navigate('/home'); 
  };

  const handleFinishGame = () => {
    console.log('[GamePage] 게임 종료 버튼 클릭:', { roomId });
    if (!roomId) {
      console.error('[GamePage] 게임 종료 실패: roomId 없음');
      return;
    }
    
    try {
      finishGame(roomId);
      console.log('[GamePage] FINISH_GAME 이벤트 전송 완료');
    } catch (error) {
      console.error('[GamePage] 게임 종료 실패:', error);
      alert('게임 종료에 실패했습니다.');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 상단: 방 이름, 나가기 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>{room.title} - 게임 진행 중</h2>
        <button onClick={handleLeaveGame} style={{ background: '#f44336', color: 'white', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold' }}>게임 나가기</button>
      </div>
      
      {/* 메인: 좌측 게임 영역, 우측 채팅 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 좌측: 게임 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 24, overflowY: 'auto' }}>
          {/* 게임 상태 */}
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#f0f8ff' }}>
            <h3 style={{ marginTop: 0, color: '#1976d2' }}>🎮 게임 진행 중</h3>
            <p>게임이 진행 중입니다. 여기에 실제 게임 컴포넌트가 들어갑니다.</p>
          </div>
          
          {/* 플레이어 목록 */}
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>플레이어 목록</h3>
            {room.players && room.players.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {room.players.map((player: any) => (
                  <li key={player.profile_id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <img src={player.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    <span style={{ fontWeight: 'bold' }}>{player.display_name}</span>
                    {player.role === 'host' && <span style={{ color: 'blue' }}>👑</span>}
                    <span style={{ color: '#888', fontSize: 13 }}>{player.role === 'host' ? '방장' : player.role === 'player' ? '플레이어' : '관찰자'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div>플레이어 없음</div>
            )}
          </div>
        </div>
        
        {/* 우측: 채팅창 */}
        <div style={{ width: 350, borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
          <ChatBox 
            roomId={roomId!} 
            socket={socket} 
            profile={profile}
            chatType="game" 
            initialMessages={[]} 
          />
        </div>
      </div>
      
      {/* 하단: 게임 종료 버튼 */}
      <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center', background: '#fafbfc' }}>
        {isHost ? (
          <button
            onClick={handleFinishGame}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '12px 32px',
              fontSize: 18,
              fontWeight: 'bold',
              cursor: 'pointer',
              minWidth: 180
            }}
          >
            🏁 게임 종료
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: '#666' }}>
              호스트가 게임을 종료할 때까지 기다려주세요
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage; 