import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';
import ChatBox from '../components/common/ChatBox';
import { SocketEventType } from '../types/socket';
import { UserProfileResponse } from '../services/api';

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { getRoom, getMyProfile, getChatHistory } = useApi();
  const { socket, isConnected, currentRoom } = useSocket({ 
    token: useAuthStore.getState().accessToken || '',
    onRoomRejoin: (roomId: string) => {
      console.log('[GamePage] 재연결 후 방 정보 갱신:', roomId);
      getRoom(roomId).then(res => setRoom(res.data));
    }
  });

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

  // 소켓 연결 후 방 입장 확인
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
    
    console.log('[GamePage] 방 입장 시도:', roomId);
    socket.emit(SocketEventType.JOIN_ROOM, { room_id: roomId }, (response: any) => {
      if (response?.error) {
        console.error('[GamePage] 방 입장 실패:', response.error);
      } else {
        console.log('[GamePage] 방 입장 성공:', roomId);
      }
    });
  }, [isConnected, roomId, socket, currentRoom]);

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
    
    const handleGameStart = (data: any) => {
      console.log('[GamePage] START_GAME 이벤트 수신:', data);
      if (data.room_id === roomId) {
        console.log('[GamePage] 게임 시작됨:', data);
        // 방 정보 새로고침하여 서버 상태와 동기화
        getRoom(roomId).then(res => {
          console.log('[GamePage] 게임 시작 후 방 정보 새로고침');
          setRoom(res.data);
        });
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
    if (socket && roomId) {
      socket.emit(SocketEventType.LEAVE_ROOM, { room_id: roomId });
    }
    navigate('/home'); 
  };

  const handleFinishGame = () => {
    console.log('[GamePage] 게임 종료 버튼 클릭:', { roomId, socketConnected: socket?.connected });
    if (!roomId || !socket?.connected) {
      console.error('[GamePage] 게임 종료 실패: 조건 불만족', { roomId, socketConnected: socket?.connected });
      return;
    }
    
    try {
      // Socket 이벤트로만 게임 종료 요청
      console.log('[GamePage] FINISH_GAME 이벤트 전송:', { room_id: roomId });
      socket.emit(SocketEventType.FINISH_GAME, { room_id: roomId });
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