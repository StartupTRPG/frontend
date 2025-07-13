import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';
import ChatBox from '../components/common/ChatBox';
import { SocketEventType } from '../types/socket';
import { UserProfileResponse } from '../services/api';

const RoomLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { getRoom, getMyProfile, getChatHistory } = useApi();
  const { socket, isConnected, joinRoom } = useSocket({ 
    token: useAuthStore.getState().accessToken || '',
    onRoomRejoin: (roomId: string) => {
      console.log('[RoomLobby] 재연결 후 방 정보 갱신:', roomId);
      getRoom(roomId).then(res => setRoom(res.data));
    }
  });

  const [room, setRoom] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
  const [myReadyState, setMyReadyState] = useState(false);
  const [gameStarting, setGameStarting] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');

  // 프로필은 최초 1회만
  useEffect(() => {
    getMyProfile().then(res => setProfile(res.data as UserProfileResponse));
  }, []);

  // 방 정보는 roomId 바뀔 때마다
  useEffect(() => {
    if (!roomId) return;
    getRoom(roomId).then(res => {
      setRoom(res.data);
      // API에서 받아온 방 상태로 게임 상태 초기화
      if (res.data.status) {
        setGameStatus(res.data.status);
      }
      
      // 레디 상태 초기화 - API 응답의 players 정보 사용
      const readyPlayersSet = new Set<string>();
      if (res.data.players) {
        res.data.players.forEach((player: any) => {
          if (player.ready) {
            readyPlayersSet.add(player.profile_id);
          }
        });
      }
      setReadyPlayers(readyPlayersSet);
      
      // 내 레디 상태 확인
      if (profile && readyPlayersSet.has(profile.id)) {
        setMyReadyState(true);
      } else {
        setMyReadyState(false);
      }
    });
  }, [roomId, profile]);

  // 채팅 히스토리 가져오기
  useEffect(() => {
    if (!roomId) return;
    getChatHistory(roomId).then(res => {
      if (res.data && res.data.messages) {
        setChatHistory(res.data.messages);
      }
    }).catch(error => {
      console.error('채팅 히스토리 로드 실패:', error);
    });
  }, [roomId]);

  // 소켓 연결 후 방 입장
  useEffect(() => {
    if (!isConnected || !roomId || !socket?.connected) return;
    
    console.log('[RoomLobby] 방 입장 시도:', roomId);
    joinRoom(roomId).then(() => {
      console.log('[RoomLobby] 방 입장 성공:', roomId);
    }).catch(error => {
      console.error('[RoomLobby] 방 입장 실패:', error);
    });
  }, [isConnected, roomId, socket, joinRoom]);

  // 소켓 레디 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleReadyUpdate = (data: any) => {
      if (data.room_id === roomId) {
        setReadyPlayers(prev => {
          const newSet = new Set(prev);
          if (data.ready) newSet.add(data.profile_id);
          else newSet.delete(data.profile_id);
          return newSet;
        });
        if (data.profile_id === profile?.id) setMyReadyState(data.ready);
      }
    };
    socket.on(SocketEventType.READY, handleReadyUpdate);
    return () => { socket.off(SocketEventType.READY, handleReadyUpdate); };
  }, [socket, roomId, profile]);

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

  // 플레이어 입장/퇴장 시 방 정보 갱신
  useEffect(() => {
    if (!socket || !roomId) return;
    
    const handlePlayerChange = () => {
      console.log('[RoomLobby] 플레이어 변경 감지, 방 정보 갱신');
      // 방 정보 다시 받아오기
      getRoom(roomId).then(res => setRoom(res.data));
    };

    socket.on(SocketEventType.JOIN_ROOM, handlePlayerChange);
    socket.on(SocketEventType.LEAVE_ROOM, handlePlayerChange);
    
    return () => {
      socket.off(SocketEventType.JOIN_ROOM, handlePlayerChange);
      socket.off(SocketEventType.LEAVE_ROOM, handlePlayerChange);
    };
  }, [socket, roomId, getRoom]);

  // 게임 시작/종료 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    
    const handleGameStart = (data: any) => {
      if (data.room_id === roomId) {
        console.log('[RoomLobby] 게임 시작됨:', data);
        setGameStatus('playing');
        setGameStarting(false);
        
        // 게임 화면으로 전환 (예: 게임 페이지로 이동)
        // navigate(`/game/${roomId}`);
        alert(`${data.host_display_name}님이 게임을 시작했습니다.`);
      }
    };

    const handleGameFinish = (data: any) => {
      if (data.room_id === roomId) {
        console.log('[RoomLobby] 게임 종료됨:', data);
        setGameStatus('finished');
        
        // 3초 후 대기실로 돌아가기
        setTimeout(() => {
          setGameStatus('waiting');
        }, 3000);
        
        alert(`${data.host_display_name}님이 게임을 종료했습니다.`);
      }
    };

    socket.on(SocketEventType.START_GAME, handleGameStart);
    socket.on(SocketEventType.FINISH_GAME, handleGameFinish);
    
    return () => {
      socket.off(SocketEventType.START_GAME, handleGameStart);
      socket.off(SocketEventType.FINISH_GAME, handleGameFinish);
    };
  }, [socket, roomId]);

  if (!room || !profile) return <div>로딩 중...</div>;

  const isHost = room.host_profile_id === profile.id;
  const allPlayersReady = room.players && room.players.filter((p: any) => p.role !== 'host').every((p: any) => readyPlayers.has(p.profile_id));

  // 버튼 핸들러
  const handleLeaveRoom = () => { 
    if (socket && roomId) {
      socket.emit(SocketEventType.LEAVE_ROOM, { room_id: roomId });
    }
    navigate('/home'); 
  };
  const handleToggleReady = () => {
    if (!roomId || !socket?.connected || !profile) return;
    const newReadyState = !myReadyState;
    socket.emit(SocketEventType.READY, { room_id: roomId, ready: newReadyState });
    setMyReadyState(newReadyState);
  };
  const handleStartGame = () => {
    if (!roomId || !socket?.connected) return;
    setGameStarting(true);
    
    // Socket 이벤트로만 게임 시작 요청
    socket.emit(SocketEventType.START_GAME, { room_id: roomId });
    
    // 서버에서 응답이 오면 handleGameStart에서 setGameStarting(false) 처리
  };

  const handleFinishGame = async () => {
    if (!roomId || !socket?.connected) return;
    
    try {
      // Socket 이벤트로 게임 종료 요청
      socket.emit(SocketEventType.FINISH_GAME, { room_id: roomId });
      
      // API 호출도 함께 (서버에서 방 상태 업데이트)
      // await endGame(roomId); // endGame API가 있다면 사용
    } catch (error) {
      console.error('[RoomLobby] 게임 종료 실패:', error);
      alert('게임 종료에 실패했습니다.');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 상단: 방 이름, 나가기 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>{room.title}</h2>
        <button onClick={handleLeaveRoom} style={{ background: '#f44336', color: 'white', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold' }}>방 나가기</button>
      </div>
      {/* 메인: 좌측 정보/플레이어, 우측 채팅 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 좌측: 방 정보, 플레이어 목록 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 24, overflowY: 'auto' }}>
          {/* 방 정보 */}
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
            <div><b>설명:</b> {room.description || '-'}</div>
            <div><b>인원:</b> {room.current_players} / {room.max_players}</div>
            <div><b>상태:</b> 
              {gameStatus === 'waiting' ? '대기 중' : 
               gameStatus === 'playing' ? '게임 진행 중' : '게임 종료'}
            </div>
            <div><b>공개:</b> {room.visibility === 'public' ? '공개' : '비공개'}</div>
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
                    {readyPlayers.has(player.profile_id) && <span style={{ color: 'green' }}>✅</span>}
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
            chatType="lobby" 
            initialMessages={chatHistory} 
          />
        </div>
      </div>
      {/* 하단: 게임 시작/레디 버튼 */}
      <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center', background: '#fafbfc' }}>
        {gameStatus === 'waiting' && (
          isHost ? (
            <button
              onClick={handleStartGame}
              disabled={gameStarting || room.current_players < 2 || !allPlayersReady}
              style={{
                backgroundColor: gameStarting || room.current_players < 2 || !allPlayersReady ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '12px 32px',
                fontSize: 18,
                fontWeight: 'bold',
                cursor: gameStarting || room.current_players < 2 || !allPlayersReady ? 'not-allowed' : 'pointer',
                minWidth: 180
              }}
            >
              {gameStarting ? '⏳ 게임 시작 중...' :
                room.current_players < 2 ? '❌ 최소 2명 필요' :
                !allPlayersReady ? '⏸️ 모든 플레이어 레디 필요' :
                '🚀 게임 시작하기'}
            </button>
          ) : (
            <button
              onClick={handleToggleReady}
              style={{
                backgroundColor: myReadyState ? '#4CAF50' : '#ff9800',
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
              {myReadyState ? '✅ 레디 완료' : '🎯 레디하기'}
            </button>
          )
        )}

        {gameStatus === 'playing' && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: '#4CAF50' }}>
              🎮 게임 진행 중
            </span>
            {isHost && (
              <button
                onClick={handleFinishGame}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '12px 24px',
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🏁 게임 종료
              </button>
            )}
          </div>
        )}

        {gameStatus === 'finished' && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: '#ff9800' }}>
              🏆 게임 종료 - 3초 후 대기실로 돌아갑니다
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomLobby; 