import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { useSocket } from '../hooks/useSocket';
import ChatBox from '../components/common/ChatBox';
import { SocketEventType } from '../types/socket';
import { UserProfileResponse } from '../services/api';
import useModal from '../hooks/useModal';
import Modal from '../components/common/Modal';
import GameRoom from '../components/game/GameRoom';
import { Player } from '../types/game';

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
    finishGame,
    sendGameMessage
  } = useSocket({
    token: useAuthStore.getState().accessToken || '',
  });
  
  // 방 입장 시도 상태 추적
  const joinAttemptedRef = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [room, setRoom] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [shouldCreateGame, setShouldCreateGame] = useState(false);
  const { modalState, showInfo, showError, hideModal } = useModal();

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
      
      // 방 상태에 따라 게임 시작 상태 설정
      if (res.data.status === 'playing') {
        console.log('[GamePage] 방이 이미 게임 진행 중이므로 gameStarted를 true로 설정');
        setGameStarted(true);
      } else {
        console.log('[GamePage] 방이 대기 중이므로 gameStarted를 false로 설정');
        setGameStarted(false);
      }
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
        showInfo('방이 삭제되었습니다.', '방 삭제');
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
      
      // 게임 진행 중 재입장 에러인 경우 조용히 처리
      if (error.message === 'Game in progress - rejoining as existing player') {
        console.log('[GamePage] 게임 진행 중 재입장, 1초 후 재시도');
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[GamePage] 게임 진행 중 재입장 재시도:', roomId);
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
        setGameStarted(true);
        setShouldCreateGame(true); // 게임 생성 플래그 설정
        
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
        setGameStarted(false);
        showInfo(`${data.host_display_name}님이 게임을 종료했습니다.`, '게임 종료');
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
        
        showInfo('방이 삭제되었습니다.', '방 삭제');
        navigate('/home');
      }
    };
    socket.on(SocketEventType.ROOM_DELETED, handleRoomDeleted);
    return () => { socket.off(SocketEventType.ROOM_DELETED, handleRoomDeleted); };
  }, [socket, roomId, navigate]);

  console.log('[GamePage] 렌더링:', { room: !!room, profile: !!profile, socket: !!socket, socketConnected: socket?.connected, roomId, currentRoom, isConnected, gameStarted });
  
  if (!room || !profile) return <div>로딩 중...</div>;

  const isHost = room.host_profile_id === profile.id;

  // 플레이어 목록을 LLM 게임 형식으로 변환
  const getLlmPlayers = (): Player[] => {
    if (!room.players) return [];
    return room.players.map((player: any) => ({
      id: player.profile_id,
      name: player.display_name
    }));
  };

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
      showError('게임 종료에 실패했습니다.', '게임 종료 실패');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 상단: 방 이름, 나가기 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>
          {room.title} - LLM 게임 진행 중
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!gameStarted && (
            <button onClick={handleLeaveGame} style={{ background: '#f44336', color: 'white', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold' }}>
              게임 나가기
            </button>
          )}
        </div>
      </div>
      
      {/* 메인: 좌측 게임 영역, 우측 채팅 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 좌측: LLM 게임 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 24, overflowY: 'auto' }}>
          <GameRoom 
            roomId={roomId!}
            token={useAuthStore.getState().accessToken || ''}
            players={getLlmPlayers()}
            shouldCreateGame={shouldCreateGame}
            onGameCreated={() => setShouldCreateGame(false)}
          />
        </div>
        
        {/* 우측: 채팅창 */}
        <div style={{ width: 350, borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
          <ChatBox 
            roomId={roomId!} 
            socket={socket} 
            profile={profile}
            chatType="game" 
            initialMessages={[]}
            onSendGameMessage={sendGameMessage}
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

export default GamePage; 