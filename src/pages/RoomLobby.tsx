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
import './RoomLobby.css';

const JOBS = [
    {
      name: '개발자',
      image: '/images/jobcard_developer.png',
      color: '#d4edff'
    },
    {
      name: '디자이너',
      image: '/images/jobcard_designer.png',
      color: '#ffe2f5'
    },
    {
      name: '기획자',
      image: '/images/jobcard_pm.png',
      color: '#fff9c4'
    },
    {
      name: '마케터',
      image: '/images/jobcard_marketer.png',
      color: '#d9f7be'
    }
];

const RoomLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { getRoom, getMyProfile, getChatHistory } = useApi();
  const { 
    socket, 
    isConnected, 
    currentRoom,
    joinRoom, 
    leaveRoom, 
    toggleReady, 
    startGame, 
    finishGame,
    sendLobbyMessage,
    sendGameMessage
  } = useSocket({
    token: useAuthStore.getState().accessToken || '',
  });
  
  // 방 입장 시도 상태 추적
  const joinAttemptedRef = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leavingRoomRef = useRef(false); // 방 나가기 중인지 추적

  const [room, setRoom] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
  const [myReadyState, setMyReadyState] = useState(false);
  const [gameStarting, setGameStarting] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [chatType, setChatType] = useState<'lobby' | 'game'>('lobby');
  const { modalState, showInfo, showError, hideModal } = useModal();

  // --- 직무 선택 관련 상태 (프론트엔드 전용) ---
  const [playerJobs, setPlayerJobs] = useState<Record<string, string>>({});
  const [isJobModalOpen, setJobModalOpen] = useState(false);
  // --- 여기까지 ---

  // 프로필은 최초 1회만
  useEffect(() => {
    getMyProfile().then(res => setProfile(res.data as UserProfileResponse));
  }, []);

  // 방 정보는 roomId 바뀔 때만 (profile 의존성 제거)
  useEffect(() => {
    if (!roomId) return;
    console.log('[RoomLobby] 방 정보 로드:', roomId);
    getRoom(roomId).then(res => {
      console.log('[RoomLobby] 방 정보 로드 완료:', res.data);
      console.log('[RoomLobby] 플레이어 목록:', res.data.players);
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
      
      // 내 레디 상태 확인 (profile이 로드된 후에만)
      if (profile && readyPlayersSet.has(profile.id)) {
        setMyReadyState(true);
      } else {
        setMyReadyState(false);
      }
    });
  }, [roomId]); // profile 의존성 제거

  // 프로필 로드 후 레디 상태 업데이트
  useEffect(() => {
    if (!profile || !room) return;
    
    // 내 레디 상태 확인
    const readyPlayersSet = new Set<string>();
    if (room.players) {
      room.players.forEach((player: any) => {
        if (player.ready) {
          readyPlayersSet.add(player.profile_id);
        }
      });
    }
    
    if (readyPlayersSet.has(profile.id)) {
      setMyReadyState(true);
    } else {
      setMyReadyState(false);
    }
  }, [profile, room]);

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

  // 소켓 연결 후 방 입장 (개선된 로직)
  useEffect(() => {
    if (!isConnected || !roomId || !socket?.connected) {
      console.log('[RoomLobby] 방 입장 조건 불만족:', { isConnected, roomId, socketConnected: socket?.connected });
      return;
    }
    
    // 방 나가기 중이면 입장 시도하지 않음
    if (leavingRoomRef.current) {
      console.log('[RoomLobby] 방 나가기 중이므로 입장 시도하지 않음');
      return;
    }
    
    // 이미 같은 방에 있으면 중복 입장 방지
    if (currentRoom === roomId) {
      console.log('[RoomLobby] 이미 방에 입장되어 있음:', roomId);
      return;
    }
    
    // 이미 입장 시도 중이면 무시
    if (joinAttemptedRef.current) {
      console.log('[RoomLobby] 이미 방 입장 시도 중:', roomId);
      return;
    }
    
    // 기존 타이머가 있으면 취소
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
    
    console.log('[RoomLobby] 방 입장 시도:', roomId);
    joinAttemptedRef.current = true;
    
    // 방 입장 시도
    joinRoom(roomId).then(() => {
      console.log('[RoomLobby] 방 입장 성공:', roomId);
      joinAttemptedRef.current = false;
      
      // 방 입장 성공 후 방 정보 즉시 갱신
      console.log('[RoomLobby] 방 입장 후 방 정보 갱신');
      getRoom(roomId).then(res => {
        console.log('[RoomLobby] 방 입장 후 방 정보 갱신 완료:', res.data);
        setRoom(res.data);
      }).catch(error => {
        console.error('[RoomLobby] 방 입장 후 방 정보 갱신 실패:', error);
      });
    }).catch(error => {
      console.error('[RoomLobby] 방 입장 실패:', error);
      joinAttemptedRef.current = false;
      
      // 방이 삭제된 경우 홈으로 이동
      if (error.message === 'Room has been deleted') {
        console.log('[RoomLobby] 방이 삭제됨, 홈으로 이동');
        showInfo('방이 삭제되었습니다.', '방 삭제');
        navigate('/home');
        return;
      }
      
      // 재입장 대기 에러인 경우 조용히 처리 (사용자에게 에러 표시하지 않음)
      if (error.message === 'Please wait before rejoining the room') {
        console.log('[RoomLobby] 재입장 대기, 1초 후 재시도');
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[RoomLobby] 재입장 재시도:', roomId);
          joinAttemptedRef.current = false;
        }, 1000);
        return;
      }
      
      // 게임 진행 중 재입장 에러인 경우 조용히 처리
      if (error.message === 'Game in progress - rejoining as existing player') {
        console.log('[RoomLobby] 게임 진행 중 재입장, 1초 후 재시도');
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[RoomLobby] 게임 진행 중 재입장 재시도:', roomId);
          joinAttemptedRef.current = false;
        }, 1000);
        return;
      }
      
      // 기타 에러는 재시도하지 않음
      if (error.message !== 'Already joining this room' && 
          error.message !== 'Already joining another room' &&
          error.message !== 'Already in room') {
        joinTimeoutRef.current = setTimeout(() => {
          console.log('[RoomLobby] 방 입장 재시도:', roomId);
          joinAttemptedRef.current = false;
        }, 3000);
      }
    });
  }, [isConnected, roomId, socket]); // currentRoom 의존성 제거

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }
    };
  }, []);

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
    
    const handleResetReady = (data: any) => {
      if (data.room_id === roomId) {
        console.log('[RoomLobby] 모든 플레이어 ready 상태 초기화 이벤트 수신');
        setReadyPlayers(new Set());
        setMyReadyState(false);
      }
    };
    
    socket.on(SocketEventType.READY, handleReadyUpdate);
    socket.on(SocketEventType.RESET_READY, handleResetReady);
    
    return () => { 
      socket.off(SocketEventType.READY, handleReadyUpdate);
      socket.off(SocketEventType.RESET_READY, handleResetReady);
    };
  }, [socket, roomId, profile]);

  // 방 삭제 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleRoomDeleted = (data: any) => {
      if (data.room_id === roomId) {
        console.log('[RoomLobby] 방 삭제 이벤트 수신:', data);
        
        // 방 입장 시도 중이면 중단
        if (joinAttemptedRef.current) {
          console.log('[RoomLobby] 방 입장 시도 중단 (방 삭제됨)');
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

  // 플레이어 입장/퇴장 시 방 정보 갱신 (개선된 로직)
  useEffect(() => {
    if (!socket || !roomId) return;
    
    let refreshTimeout: NodeJS.Timeout | null = null;
    let isRefreshing = false; // 중복 호출 방지 플래그
    let lastRefreshTime = 0; // 마지막 갱신 시간
    
    const handlePlayerChange = () => {
      console.log('[RoomLobby] 플레이어 변경 감지, 방 정보 갱신 예약');
      
      const now = Date.now();
      
      // 이미 갱신 중이면 무시
      if (isRefreshing) {
        console.log('[RoomLobby] 이미 갱신 중이므로 무시');
        return;
      }
      
      // 마지막 갱신으로부터 500ms 이내면 무시 (2초에서 500ms로 단축)
      if (now - lastRefreshTime < 500) {
        console.log('[RoomLobby] 마지막 갱신으로부터 500ms 이내이므로 무시');
        return;
      }
      
      // 기존 타이머가 있으면 취소
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }
      
      // 300ms 후 방 정보 갱신 (1초에서 300ms로 단축)
      refreshTimeout = setTimeout(() => {
        if (isRefreshing) return; // 중복 방지
        
        console.log('[RoomLobby] 방 정보 갱신 실행');
        isRefreshing = true;
        lastRefreshTime = Date.now();
        
        getRoom(roomId).then(res => {
          console.log('[RoomLobby] 방 정보 갱신 완료:', res.data);
          setRoom(res.data);
          isRefreshing = false;
        }).catch(error => {
          console.error('[RoomLobby] 방 정보 갱신 실패:', error);
          isRefreshing = false;
        });
      }, 300); // 1초에서 300ms로 단축
    };

    socket.on(SocketEventType.JOIN_ROOM, handlePlayerChange);
    socket.on(SocketEventType.LEAVE_ROOM, handlePlayerChange);
    
    return () => {
      socket.off(SocketEventType.JOIN_ROOM, handlePlayerChange);
      socket.off(SocketEventType.LEAVE_ROOM, handlePlayerChange);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [socket, roomId, getRoom]);

  // 게임 시작/종료 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    
    let isRefreshing = false; // 중복 호출 방지 플래그
    
    const handleGameStart = (data: any) => {
      if (data.room_id === roomId) {
        console.log('[RoomLobby] 게임 시작됨:', data);
        setGameStatus('playing');
        setGameStarting(false);
        setChatType('game'); // 채팅 타입을 게임으로 변경
        
        // 게임 시작 시 방 정보 갱신 (중복 방지)
        if (!isRefreshing) {
          isRefreshing = true;
          getRoom(roomId).then(res => {
            console.log('[RoomLobby] 게임 시작 후 방 정보 갱신');
            setRoom(res.data);
            isRefreshing = false;
          }).catch(error => {
            console.error('[RoomLobby] 게임 시작 후 방 정보 갱신 실패:', error);
            isRefreshing = false;
          });
        }
        
        // 모든 플레이어가 게임 페이지로 이동
        navigate(`/game/${roomId}`);
        
        showInfo(`${data.host_display_name}님이 게임을 시작했습니다.`, '게임 시작');
      }
    };

    const handleGameFinish = (data: any) => {
      if (data.room_id === roomId) {
        console.log('[RoomLobby] 게임 종료됨:', data);
        setGameStatus('finished');
        setChatType('lobby'); // 채팅 타입을 로비로 변경
        
        // 모든 플레이어의 ready 상태를 false로 초기화
        console.log('[RoomLobby] 모든 플레이어 ready 상태 초기화');
        setReadyPlayers(new Set());
        setMyReadyState(false);
        
        // 게임 종료 시 방 정보 갱신 (중복 방지)
        if (!isRefreshing) {
          isRefreshing = true;
          getRoom(roomId).then(res => {
            console.log('[RoomLobby] 게임 종료 후 방 정보 갱신');
            setRoom(res.data);
            isRefreshing = false;
          }).catch(error => {
            console.error('[RoomLobby] 게임 종료 후 방 정보 갱신 실패:', error);
            isRefreshing = false;
          });
        }
        
        // 게임 페이지에 있다면 로비로 강제 이동
        if (window.location.pathname.includes('/game/')) {
          navigate(`/room/${roomId}`);
        }
        
        // 3초 후 대기실로 돌아가기
        setTimeout(() => {
          setGameStatus('waiting');
          // 한 번 더 ready 상태 초기화 (다른 클라이언트에서 돌아온 경우 대비)
          console.log('[RoomLobby] 대기실 복귀 후 ready 상태 재초기화');
          setReadyPlayers(new Set());
          setMyReadyState(false);
        }, 3000);
        
        showInfo(`${data.host_display_name}님이 게임을 종료했습니다.`, '게임 종료');
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
    if (roomId) {
      leavingRoomRef.current = true; // 방 나가기 중임을 표시
      leaveRoom();
    }
    navigate('/home'); 
  };
  
  const handleToggleReady = () => {
    if (!roomId || !profile) return;
    const newReadyState = !myReadyState;
    toggleReady(roomId, newReadyState);
    setMyReadyState(newReadyState);
  };
  
  const handleStartGame = () => {
    if (!roomId) return;
    setGameStarting(true);
    
    // 먼저 게임 시작 요청 전송
    startGame(roomId);
    
    // 게임 시작 요청 후 모든 플레이어가 게임 페이지로 이동
    // (handleGameStart에서 처리됨)
  };

  const handleFinishGame = async () => {
    console.log('[RoomLobby] 게임 종료 버튼 클릭:', { roomId });
    if (!roomId) {
      console.error('[RoomLobby] 게임 종료 실패: roomId 없음');
      return;
    }
    
    try {
      finishGame(roomId);
      console.log('[RoomLobby] FINISH_GAME 이벤트 전송 완료');
    } catch (error) {
      console.error('[RoomLobby] 게임 종료 실패:', error);
      showError('게임 종료에 실패했습니다.', '게임 종료 실패');
    }
  };

  // --- 직무 선택 관련 핸들러 (프론트엔드 전용) ---
  const handleSelectJob = (jobName: string) => {
    if (profile) {
      setPlayerJobs(prev => ({ ...prev, [profile.id]: jobName }));
      setJobModalOpen(false);
    }
  };
  // --- 여기까지 ---

  return (
    <div className="lobby-page-container">
      {/* 상단: 방 이름, 나가기 버튼 */}
      <header className="lobby-header">
        <h2 className="lobby-title">{room.title}</h2>
        <button onClick={handleLeaveRoom} className="leave-button">방 나가기</button>
      </header>

      {/* 메인: 좌측 정보/플레이어, 우측 채팅 */}
      <main className="lobby-main-content">
        {/* 좌측: 방 정보, 플레이어 목록 */}
        <div className="lobby-left-section">
          {/* 방 정보 */}
          <div className="info-card">
            <h3>프로젝트 정보</h3>
            <div className="info-grid">
                <div className="info-item"><b>소개:</b> {room.description || '-'}</div>
                <div className="info-item"><b>참여인원:</b> {room.current_players} / {room.max_players}</div>
                <div className="info-item"><b>프로젝트 상태:</b> 
                {gameStatus === 'waiting' ? '대기 중' : 
                gameStatus === 'playing' ? '진행 중' : '종료'}
                </div>
                <div className="info-item"><b>보안 레벨:</b> {room.visibility === 'public' ? '공개' : '비공개'}</div>
            </div>
          </div>
          {/* 플레이어 목록 */}
          <div className="players-card">
            <h3>참여 팀원 목록</h3>
            {room.players && room.players.length > 0 ? (
              <div className="player-grid">
                {room.players.map((player: any) => (
                  <div key={player.profile_id} className="player-card">
                    <img src={player.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'} alt="avatar" className="player-avatar" />
                    <div className="player-name">{player.display_name}</div>
                    
                    {/* --- 직무 표시 --- */}
                    <div className="player-job-display">
                      {playerJobs[player.profile_id] || '미정'}
                    </div>
                    {/* --- 여기까지 --- */}

                    <div className="player-role">{player.role === 'host' ? '팀장' : '팀원'}</div>
                    
                    {player.role === 'host' ? (
                       <div className="player-status-badge host">👑 팀장</div>
                    ) : readyPlayers.has(player.profile_id) ? (
                      <div className="player-status-badge ready">✅ 준비완료</div>
                    ) : (
                      <div className="player-status-badge not-ready">⏳ 대기중</div>
                    )}

                    {/* --- 직무 선택 버튼 (본인에게만 보임) --- */}
                    {player.profile_id === profile?.id && (
                      <button className="select-job-button" onClick={() => setJobModalOpen(true)}>
                        직무 선택
                      </button>
                    )}
                    {/* --- 여기까지 --- */}
                  </div>
                ))}
              </div>
            ) : (
              <div>참여중인 팀원이 없습니다.</div>
            )}
          </div>
        </div>
        {/* 우측: 채팅창 */}
        <div className="lobby-right-section">
          <ChatBox 
            roomId={roomId!} 
            socket={socket} 
            profile={profile}
            chatType={chatType} 
            initialMessages={chatHistory}
            onSendLobbyMessage={sendLobbyMessage}
            onSendGameMessage={sendGameMessage}
          />
        </div>
      </main>

      {/* 하단: 게임 시작/레디 버튼 */}
      <footer className="lobby-footer">
        {gameStatus === 'waiting' && (
          isHost ? (
            <button
              onClick={handleStartGame}
              disabled={gameStarting || room.current_players < 2 || !allPlayersReady}
              className="action-button start"
            >
              {gameStarting ? '⏳ 프로젝트 시작 중...' :
                room.current_players < 2 ? '❌ 최소 2명 필요' :
                !allPlayersReady ? '⏸️ 모든 팀원 준비 필요' :
                '🚀 프로젝트 시작하기'}
            </button>
          ) : (
            <button
              onClick={handleToggleReady}
              className={`action-button ready ${myReadyState ? 'is-ready' : ''}`}
            >
              {myReadyState ? '✅ 준비완료' : '🎯 준비하기'}
            </button>
          )
        )}

        {gameStatus === 'playing' && (
          <div className="game-status-text playing">
            <span>
              🎮 프로젝트 진행 중
            </span>
            {isHost && (
              <button
                onClick={handleFinishGame}
                className="leave-button"
                style={{marginLeft: '1rem'}}
              >
                🏁 프로젝트 종료
              </button>
            )}
          </div>
        )}

        {gameStatus === 'finished' && (
          <div className="game-status-text finished">
            <span>
              🏆 프로젝트 종료 - 3초 후 대기실로 돌아갑니다
            </span>
          </div>
        )}
      </footer>
      
      {/* --- 직무 선택 모달 --- */}
      {isJobModalOpen && (
        <div className="job-modal-overlay">
          <div className="job-modal-content">
            <h2 className="job-modal-title">직무 선택</h2>
            <div className="job-card-container">
              {JOBS.map(job => (
                <div key={job.name} className="job-card" onClick={() => handleSelectJob(job.name)}>
                  <img src={job.image} alt={job.name} />
                </div>
              ))}
            </div>
            <button className="job-modal-close-button" onClick={() => setJobModalOpen(false)}>닫기</button>
          </div>
        </div>
      )}
      {/* --- 여기까지 --- */}

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

export default RoomLobby; 