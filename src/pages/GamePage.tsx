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
import './GamePage.css';




// 영향 요약 텍스트 파싱 및 스타일링을 위한 헬퍼 컴포넌트
const ImpactSummaryDisplay: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(장점:|단점:)/).filter(p => p.trim());
  const items = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] && parts[i + 1]) {
      items.push({
        label: parts[i],
        value: parts[i + 1],
        isPositive: parts[i].includes('장점'),
      });
    }
  }

  return (
    <div className="impact-summary-details">
      {items.map((item, index) => (
        <p key={index} className={item.isPositive ? 'impact-positive' : 'impact-negative'}>
          <strong>{item.label}</strong>
          {item.value}
        </p>
      ))}
    </div>
  );
};


// SVG 오각형 차트 컴포넌트
const PentagonChart: React.FC<{ stats: { label: string; value: number }[] }> = ({ stats }) => {
  const size = 200;
  const center = size / 2;
  const labels = stats.map(s => s.label);

  // 5개의 동심원 그리드 라인 생성
  const gridLines = [100, 80, 60, 40, 20].map(value => {
    const radius = center * 0.9 * (value / 100);
    const points = Array.from({ length: 5 }).map((_, i) => {
      const angle = (i / 5) * 2 * Math.PI - (Math.PI / 2);
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    return <polygon key={`grid-${value}`} points={points} className="stats-pentagon-grid" />;
  });

  // 데이터 포인트 계산
  const dataPoints = stats.map((stat, i) => {
    const value = Math.max(0, Math.min(100, stat.value)) / 100;
    const angle = (i / 5) * 2 * Math.PI - (Math.PI / 2);
    const x = center + center * 0.9 * value * Math.cos(angle);
    const y = center + center * 0.9 * value * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');
  
  // 라벨 위치 계산
  const labelPoints = stats.map((_, i) => {
    const angle = (i / 5) * 2 * Math.PI - (Math.PI / 2);
    const x = center + center * 1.1 * Math.cos(angle);
    const y = center + center * 1.1 * Math.sin(angle);
    return { x, y };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="stats-chart-container">
      <g className="stats-grid-group">
        {gridLines}
      </g>
      <polygon points={dataPoints} className="stats-pentagon-data" />
      <g className="stats-labels-group">
        {labelPoints.map((point, i) => (
          <text key={`label-${i}`} x={point.x} y={point.y} className="stats-label">
            {labels[i]}
          </text>
        ))}
      </g>
    </svg>
  );
};

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

  // --- 게임 상태 관리 ---
  const [workspaceState, setWorkspaceState] = useState<'prologue' | 'context' | 'agenda' | 'work' | 'overtime' | 'agenda_result' | 'work_result' | 'game_result'>('prologue');
  const [agendaIndex, setAgendaIndex] = useState(0); // 현재 진행중인 안건 인덱스
  const [workTaskIndex, setWorkTaskIndex] = useState(0); // 현재 진행중인 업무 인덱스
  const [selectedOption, setSelectedOption] = useState<string | null>(null); // 선택한 옵션 ID
  const [isResultSuccess, setIsResultSuccess] = useState(false); // 업무 결과 (성공/실패)
  const [overtimeView, setOvertimeView] = useState<'overtime' | 'rest'>('rest'); // 야근/휴식 뷰 전환용
  
  // --- 게임 데이터 상태 ---
  const [gameData, setGameData] = useState<any>(null);
  const [gameLoading, setGameLoading] = useState(false);
  
  const [contextData, setContextData] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(false);
  
  const [agendaData, setAgendaData] = useState<any>(null);
  const [agendaLoading, setAgendaLoading] = useState(false);
  
  const [workData, setWorkData] = useState<any>(null);
  const [workLoading, setWorkLoading] = useState(false);
  
  const [overtimeData, setOvertimeData] = useState<any>(null);
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  
  const [gameResultData, setGameResultData] = useState<any>(null);
  const [resultLoading, setResultLoading] = useState(false);
  
  const [prologueData, setPrologueData] = useState<any>(null);
  const [prologueLoading, setPrologueLoading] = useState(false);
  
  const [jobsData, setJobsData] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const [room, setRoom] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [shouldCreateGame, setShouldCreateGame] = useState(false);
  const { modalState, showInfo, showError, hideModal } = useModal();
  const [showPrologue, setShowPrologue] = useState(true); // 프롤로그 표시 상태
  const [assignedJob, setAssignedJob] = useState<{ name: string; image: string } | null>(null);

  // 프로필은 최초 1회만
  useEffect(() => {
    getMyProfile().then(res => setProfile(res.data as UserProfileResponse));
  }, []);

  // 방 정보는 roomId 바뀔 때마다
  useEffect(() => {
    if (!roomId) return;
    getRoom(roomId).then(res => {
      setRoom(res.data);
      
      // 방 상태에 따라 게임 시작 상태 설정
      if (res.data.status === 'playing') {
        setGameStarted(true);
      } else {
        setGameStarted(false);
      }
    });
  }, [roomId]);

  // 소켓 연결 후 방 입장 확인 (개선된 로직)
  useEffect(() => {
    if (!isConnected || !roomId || !socket?.connected) {
      return;
    }
    
    // 이미 같은 방에 있으면 중복 입장 방지
    if (currentRoom === roomId) {
      return;
    }
    
    // 이미 입장 시도 중이면 무시
    if (joinAttemptedRef.current) {
      return;
    }
    
    // 기존 타이머가 있으면 취소
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
    
    joinAttemptedRef.current = true;
    
    // 방 입장 시도
    joinRoom(roomId).then(() => {
      joinAttemptedRef.current = false;
      
      // 방 입장 성공 후 방 정보 즉시 갱신
      getRoom(roomId).then(res => {
        setRoom(res.data);
      }).catch(error => {
      });
    }).catch(error => {
      joinAttemptedRef.current = false;
      
      // 방이 삭제된 경우 홈으로 이동
      if (error.message === 'Room has been deleted') {
        showInfo('방이 삭제되었습니다.', '방 삭제');
        navigate('/home');
        return;
      }
      
      // 재입장 대기 에러인 경우 조용히 처리 (사용자에게 에러 표시하지 않음)
      if (error.message === 'Please wait before rejoining the room') {
        joinTimeoutRef.current = setTimeout(() => {
          joinAttemptedRef.current = false;
        }, 1000);
        return;
      }
      
      // 게임 진행 중 재입장 에러인 경우 조용히 처리
      if (error.message === 'Game in progress - rejoining as existing player') {
        joinTimeoutRef.current = setTimeout(() => {
          joinAttemptedRef.current = false;
        }, 1000);
        return;
      }
      
      // 기타 에러는 재시도하지 않음
      if (error.message !== 'Already joining this room' && 
          error.message !== 'Already joining another room' &&
          error.message !== 'Already in room') {
        joinTimeoutRef.current = setTimeout(() => {
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
    
    let isRefreshing = false; // 중복 호출 방지 플래그
    
    const handleGameStart = (data: any) => {
      if (data.room_id === roomId) {
        setGameStarted(true);
        setShouldCreateGame(true); // 게임 생성 플래그 설정
        
        // 게임 시작 시 로딩 상태 활성화
        setGameLoading(true);
        setContextLoading(true);
        setAgendaLoading(true);
        setWorkLoading(true);
        setOvertimeLoading(true);
        setResultLoading(true);
        setPrologueLoading(true); // 프롤로그 로딩 활성화
        setJobsLoading(true);
        
        // 프롤로그 상태로 설정
        setWorkspaceState('prologue');
        
        // 게임 시작 시 방 정보 갱신 (중복 방지)
        if (!isRefreshing) {
          isRefreshing = true;
          getRoom(roomId).then(res => {
            setRoom(res.data);
            isRefreshing = false;
          }).catch(error => {
            isRefreshing = false;
          });
        }
      } else {
      }
    };

    const handleStoryCreated = (data: any) => {
      if (data.room_id === roomId) {
        // 스토리 데이터로 게임 데이터 초기화
        if (data.story) {
          setPrologueData({ story: data.story });
          setPrologueLoading(false); // 로딩 완료
        }
        
        // 기본 게임 데이터 초기화
        setGameData({
          time: { display: '9:00', period: 'AM', day: 1, icon: '☀️' },
          progress: [
            { label: '사업성', value: 50 },
            { label: '기술력', value: 50 },
            { label: '디자인', value: 50 },
            { label: '마케팅', value: 50 },
            { label: '팀워크', value: 50 },
          ],
          stats: {
            main: [
              { label: 'Planning', value: 50 },
              { label: 'Execution', value: 50 },
              { label: 'Social', value: 50 },
              { label: 'Insight', value: 50 },
              { label: 'Growth', value: 50 },
            ],
            sub: [
              { label: '자금', value: 50 },
              { label: '인지도', value: 50 },
              { label: '스트레스', value: 50 },
            ],
          }
        });
        setGameLoading(false);
        
        // 프롤로그 상태로 설정
        setWorkspaceState('prologue');
        // 스토리 생성 완료 시 컨텍스트 로딩 시작
        setContextLoading(true);
      } else {
      }
    };

    const handleContextCreated = (data: any) => {
      if (data.room_id === roomId) {
        // 컨텍스트 데이터 설정
        setContextData({
          company_context: data.company_context,
          player_context_list: data.player_context_list
        });
        setContextLoading(false); // 로딩 완료 - 이제 버튼이 활성화됨
      } else {
      }
    };

    const handleAgendaCreated = (data: any) => {
      if (data.room_id === roomId) {
        // 아젠다 데이터 설정
        setAgendaData({
          description: data.description,
          agenda_list: data.agenda_list
        });
        setAgendaLoading(false); // 로딩 완료
        
        // 아젠다 상태로 설정
        setWorkspaceState('agenda');
      } else {
      }
    };
    
    const handleGameFinish = (data: any) => {
      if (data.room_id === roomId) {
        setGameStarted(false);
        showInfo(`${data.host_display_name}님이 게임을 종료했습니다.`, '게임 종료');
        navigate(`/room/${roomId}`); // 로비로 돌아가기
      } else {
      }
    };

    socket.on(SocketEventType.START_GAME, handleGameStart);
    socket.on('story_created', handleStoryCreated);
    socket.on('context_created', handleContextCreated);
    socket.on(SocketEventType.CREATE_AGENDA, handleAgendaCreated);
    socket.on(SocketEventType.FINISH_GAME, handleGameFinish);
    
    return () => {  
      socket.off(SocketEventType.START_GAME, handleGameStart);
      socket.off('story_created', handleStoryCreated);
      socket.off('context_created', handleContextCreated);
      socket.off(SocketEventType.CREATE_AGENDA, handleAgendaCreated);
      socket.off(SocketEventType.FINISH_GAME, handleGameFinish);
    };
  }, [socket, roomId, navigate, getRoom]);

  // 방 삭제 이벤트 리스너
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleRoomDeleted = (data: any) => {
      if (data.room_id === roomId) {
        
        // 방 입장 시도 중이면 중단
        if (joinAttemptedRef.current) {
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



  // 직무 배정 후 5초 뒤 자동 전환
  useEffect(() => {
    if (assignedJob) {
      const timer = setTimeout(() => {
        setShowPrologue(false);
      }, 5000); // 5초

      return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 제거
    }
  }, [assignedJob]);


  
  if (!room || !profile) return <div>로딩 중...</div>;

  const isHost = room.host_profile_id === profile.id;
  const otherPlayers = room.players?.filter((p: any) => p.profile_id !== profile.id) || [];

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
    if (!roomId) {
      return;
    }
    
    try {
      finishGame(roomId);
    } catch (error) {
      showError('게임 종료에 실패했습니다.', '게임 종료 실패');
    }
  };

  // gameStarted가 false일 때 (게임 시작 전) => LLM 실제 게임 UI 표시 (수정)
  if (!gameStarted) {
  return (
      <>
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 상단: 방 이름, 나가기 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #eee' }}>
            <h2 style={{ margin: 0 }}>
              {room.title} - LLM 게임 진행 중
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {isHost && (
                <button onClick={handleFinishGame} className="leave-button">
                  🏁 게임 종료
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
                gameLoading={gameLoading}
                contextLoading={contextLoading}
                agendaLoading={agendaLoading}
                workLoading={workLoading}
                overtimeLoading={overtimeLoading}
                resultLoading={resultLoading}
                prologueLoading={prologueLoading}
                jobsLoading={jobsLoading}
              />
            </div>
            {/* 우측: 채팅 영역 */}
            <aside className="game-sidebar right" style={{ flex: '0 0 320px', borderLeft: '1px solid #eee' }}>
              <div className="chat-container">
                <div className="chat-header">
                    <h3>채팅</h3>
                    <div className="other-players-list">
                        {otherPlayers.map((player: any) => (
                            <div key={player.profile_id} className="other-player">
                                <img src={player.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'} alt={player.display_name} className="other-player-avatar" />
                                <span className="other-player-name">{player.display_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="chat-box-wrapper">
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
            </aside>
          </div>
          {/* Modal (기존 로직 그대로 유지) */}
          <Modal
            isOpen={modalState.isOpen}
            onClose={hideModal}
            title={modalState.title}
            message={modalState.message}
            type={modalState.type}
            showCloseButton={modalState.showCloseButton}
          />
        </div>
      </>
    );
  }



  // 2. 프로토타입 대시보드 UI 표시 (수정)
  return (
    <>
      {/* --- 상태 4: Game Result Overlay (최종 결과) --- */}
      {workspaceState === 'game_result' && (() => {
        const { game_result, player_rankings } = gameResultData;
        const sortedRankings = [...player_rankings].sort((a, b) => a.rank - b.rank);
        const getMedal = (rank: number) => {
          if (rank === 1) return '🥇';
          if (rank === 2) return '🥈';
          if (rank === 3) return '🥉';
          return '🏅';
        };

        return (
          <div className="game-result-overlay">
            <div className="game-result-content">
              <div className="result-summary-container">
                <h2 className={`result-outcome ${game_result.success ? 'success' : 'failure'}`}>
                  {game_result.success ? 'PROJECT SUCCESS' : 'PROJECT FAILURE'}
                </h2>
                <p className="result-summary-text">"{game_result.summary}"</p>
              </div>
              <div className="ranking-list">
                {sortedRankings.map((player, index) => (
                  <div
                    key={player.player_id}
                    className={`ranking-card rank-${player.rank}`}
                    style={{ animationDelay: `${index * 0.3 + 0.5}s` }} // 애니메이션 딜레이 조정
                  >
                    <div className="ranking-info">
                      <span className="rank-number">{player.rank}</span>
                      <span className="rank-medal">{getMedal(player.rank)}</span>
                      <div className="player-details">
                        <span className="player-name">{player.player_name}</span>
                        <span className="player-role">{player.player_role}</span>
                      </div>
                    </div>
                    <p className="player-evaluation">"{player.player_evaluation}"</p>
                  </div>
                ))}
              </div>
              {/* --- (임시) 상태 전환 버튼 --- */}
              <button className="close-result-button" onClick={() => setWorkspaceState('agenda')}>
                돌아가기
              </button>
            </div>
          </div>
        );
      })()}

      <div className="game-page-container">
        {/* --- Left Sidebar --- */}
        <aside className="game-sidebar left">
          <div className="sidebar-scroll-content">
            <div className="game-card daily-briefing-card">
              <h3>오늘의 요약</h3>
              <div className="briefing-content">
                {contextLoading ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '20px',
                    fontSize: '16px',
                    color: '#666'
                  }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid #f3f3f3', 
                      borderTop: '2px solid #007bff', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      marginRight: '10px'
                    }}></div>
                    컨텍스트 로딩 중...
                  </div>
                ) : contextData ? (
                  <>
                    <div className="briefing-section">
                      <h4>팀 현황</h4>
                      <p style={{ whiteSpace: 'pre-line' }}>
                        {(contextData.company_context?.["1"] || "팀 현황을 불러오는 중...")
                          .split(',')
                          .map((item: string, index: number) => (
                            <span key={index}>
                              {item.trim()}
                              {index < (contextData.company_context?.["1"] || "").split(',').length - 1 && '\n'}
                            </span>
                          ))}
                      </p>
                    </div>
                    <div className="briefing-section">
                      <h4>나의 상태</h4>
                      <p style={{ whiteSpace: 'pre-line' }}>
                        {(contextData.player_context_list?.[0]?.player_context?.["1"] || "플레이어 상태를 불러오는 중...")
                          .split(',')
                          .map((item: string, index: number) => (
                            <span key={index}>
                              {item.trim()}
                              {index < (contextData.player_context_list?.[0]?.player_context?.["1"] || "").split(',').length - 1 && '\n'}
                            </span>
                          ))}
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '20px',
                    fontSize: '16px',
                    color: '#666'
                  }}>
                    게임 데이터를 불러오는 중...
                  </div>
                )}
              </div>
            </div>
                         <div className="game-card time-card">
               {gameLoading ? (
                 <div style={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   padding: '20px',
                   fontSize: '16px',
                   color: '#666'
                 }}>
                   <div style={{ 
                     width: '20px', 
                     height: '20px', 
                     border: '2px solid #f3f3f3', 
                     borderTop: '2px solid #ffc107', 
                     borderRadius: '50%', 
                     animation: 'spin 1s linear infinite',
                     marginRight: '10px'
                   }}></div>
                   게임 데이터 로딩 중...
                 </div>
               ) : gameData ? (
                 <>
                   <div className="time-display">
                     <span className="time-icon">{gameData.time?.icon || '☀️'}</span>
                     <span className="time-text">{gameData.time?.display || '9:00'}</span>
                   </div>
                   <div className="day-text">Day {gameData.time?.day || 1}</div>
                 </>
               ) : (
                 <div style={{ 
                   textAlign: 'center',
                   padding: '20px',
                   fontSize: '16px',
                   color: '#666'
                 }}>
                   게임 데이터를 불러오는 중...
                 </div>
               )}
             </div>
             <div className="game-card progress-card">
               <h3>진척도</h3>
               {gameLoading ? (
                 <div style={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   padding: '20px',
                   fontSize: '16px',
                   color: '#666'
                 }}>
                   <div style={{ 
                     width: '20px', 
                     height: '20px', 
                     border: '2px solid #f3f3f3', 
                     borderTop: '2px solid #7aa5ff', 
                     borderRadius: '50%', 
                     animation: 'spin 1s linear infinite',
                     marginRight: '10px'
                   }}></div>
                   진척도 로딩 중...
                 </div>
               ) : gameData?.progress ? (
                 <div className="progress-list">
                   {gameData.progress.map((item: any) => (
                     <div key={item.label} className="progress-item">
                       <span>{item.label}</span>
                       <div className="progress-bar-bg">
                         <div className="progress-bar-fg" style={{ width: `${item.value}%` }}></div>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div style={{ 
                   textAlign: 'center',
                   padding: '20px',
                   fontSize: '16px',
                   color: '#666'
                 }}>
                   진척도를 불러오는 중...
                 </div>
               )}
             </div>
             <div className="game-card stats-card">
               <h3>스탯</h3>
               {gameLoading ? (
                 <div style={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   padding: '20px',
                   fontSize: '16px',
                   color: '#666'
                 }}>
                   <div style={{ 
                     width: '20px', 
                     height: '20px', 
                     border: '2px solid #f3f3f3', 
                     borderTop: '2px solid #7aa5ff', 
                     borderRadius: '50%', 
                     animation: 'spin 1s linear infinite',
                     marginRight: '10px'
                   }}></div>
                   스탯 로딩 중...
                 </div>
               ) : gameData?.stats ? (
                 <>
                   <PentagonChart stats={gameData.stats.main} />
                   <div className="sub-stats-list">
                     {gameData.stats.sub.map((item: any) => (
                       <div key={item.label} className="progress-item">
                         <span>{item.label}</span>
                         <div className="progress-bar-bg">
                           <div className="progress-bar-fg" style={{ width: `${item.value}%` }}></div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </>
               ) : (
                 <div style={{ 
                   textAlign: 'center',
                   padding: '20px',
                   fontSize: '16px',
                   color: '#666'
                 }}>
                   스탯을 불러오는 중...
                 </div>
               )}
             </div>
          </div>
        </aside>

        {/* --- Workspace (Center) --- */}
        <main className="game-workspace">
          <div className="workspace-header">
            <h2>워크스페이스</h2>
            {isHost && (
              <button onClick={handleFinishGame} className="leave-button">
                🏁 프로젝트 종료
              </button>
            )}
          </div>
          <div className="workspace-content">
            {/* =============================================================================== */}
            {/* --- 디자인 프로토타입: 워크스페이스 컨텐츠 (workspaceState에 따라 변경) --- */}
            {/* =============================================================================== */}

            {/* ----------------------------------- */}
            {/* --- 상태 0: Prologue (프롤로그) --- */}
            {/* ----------------------------------- */}
            {workspaceState === 'prologue' && (() => {
              if (prologueLoading) {
                return (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      border: '3px solid #f3f3f3', 
                      borderTop: '3px solid #007bff', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      marginRight: '15px'
                    }}></div>
                    스토리를 불러오는 중...
                  </div>
                );
              }
              
              if (!prologueData || !prologueData.story) {
                return (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      border: '3px solid #f3f3f3', 
                      borderTop: '3px solid #007bff', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      marginRight: '15px'
                    }}></div>
                    스토리를 생성하는 중...
                  </div>
                );
              }
              
              return (
                <div className="workspace-prologue new-design">
                  {/* GM의 노트 */}
                  <div className="gm-note">
                    <span className="gm-note-icon">📖</span>
                    <p>"게임 스토리를 읽고 시작하세요"</p>
                  </div>

                  {/* 프롤로그 헤더 */}
                  <div className="prologue-header">
                    <h3 className="prologue-title">🎭 게임 스토리</h3>
                    <div className="timer-container">
                      <span>읽기 시간</span>
                      <div className="timer-progress-bar">
                        <div className="timer-progress"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 스토리 내용 */}
                  <div className="prologue-content">
                    <p className="workspace-prompt" style={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: '1.8', 
                      fontSize: '16px',
                      textAlign: 'left',
                      padding: '20px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      {prologueData.story}
                    </p>
                  </div>
                  
                  {/* Daily Scrum 진행하기 버튼 */}
                  <button
                    className="next-step-button"
                    onClick={() => {
                      // 아젠다 생성 요청
                      if (socket && roomId) {
                        setAgendaLoading(true); // 아젠다 로딩 시작
                        socket.emit(SocketEventType.CREATE_AGENDA, { room_id: roomId });
                      }
                    }}
                    disabled={contextLoading} // 컨텍스트 로딩 중이면 버튼 비활성화
                    style={{
                      backgroundColor: contextLoading ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: contextLoading ? 'not-allowed' : 'pointer',
                      marginTop: '20px'
                    }}
                  >
                    {contextLoading ? '⏳ 컨텍스트 생성 중...' : '🎯 Daily Scrum 진행하기'}
                  </button>
                </div>
              );
            })()}

            {/* ----------------------------------- */}
            {/* --- 상태 0.5: Context (오늘의 요약) --- */}
            {/* ----------------------------------- */}
            {workspaceState === 'context' && (() => {
              if (!contextData) {
                return (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    컨텍스트 데이터가 없습니다.
                  </div>
                );
              }
              
              // 현재 플레이어의 컨텍스트 찾기
              const myContext = contextData.player_context_list?.find(
                (player: any) => player.player_id === profile?.id
              );
              
              return (
                <div className="workspace-context new-design">
                  {/* GM의 노트 */}
                  <div className="gm-note">
                    <span className="gm-note-icon">📋</span>
                    <p>"오늘의 요약을 확인하고 Daily Scrum을 시작하세요."</p>
                  </div>

                  {/* 오늘의 요약 헤더 */}
                  <div className="context-header">
                    <h3 className="context-title">📅 오늘의 요약</h3>
                  </div>
                  
                  {/* 회사 컨텍스트 */}
                  <div className="context-content" style={{ marginBottom: '20px' }}>
                    <h4>🏢 회사 상황</h4>
                    <div style={{ 
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        fontSize: '14px',
                        lineHeight: '1.6',
                        margin: 0
                      }}>
                        {JSON.stringify(contextData.company_context, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  {/* 내 컨텍스트 */}
                  {myContext && (
                    <div className="context-content" style={{ marginBottom: '20px' }}>
                      <h4>👤 내 상황</h4>
                      <div style={{ 
                        padding: '15px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '8px',
                        border: '1px solid #bbdefb'
                      }}>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap', 
                          fontSize: '14px',
                          lineHeight: '1.6',
                          margin: 0
                        }}>
                          {JSON.stringify(myContext.player_context, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Daily Scrum 버튼 */}
                  <button
                    className="next-step-button"
                    onClick={() => {
                      // 아젠다 생성 요청
                      if (socket && roomId) {
                        setAgendaLoading(true); // 아젠다 로딩 시작
                        socket.emit(SocketEventType.CREATE_AGENDA, { room_id: roomId });
                      }
                    }}
                    disabled={contextLoading} // 컨텍스트 로딩 중이면 버튼 비활성화
                    style={{
                      backgroundColor: contextLoading ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: contextLoading ? 'not-allowed' : 'pointer',
                      marginTop: '20px'
                    }}
                  >
                    {contextLoading ? '⏳ 컨텍스트 생성 중...' : '🎯 Daily Scrum'}
                  </button>
                </div>
              );
            })()}

            {/* ----------------------------------- */}
            {/* --- 상태 1: Agenda (안건 투표) --- */}
            {/* ----------------------------------- */}
            {workspaceState === 'agenda' && (() => {
              if (agendaLoading) {
                return (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      border: '3px solid #f3f3f3', 
                      borderTop: '3px solid #28a745', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      marginRight: '15px'
                    }}></div>
                    아젠다 데이터를 불러오는 중...
                  </div>
                );
              }
              
              if (!agendaData || !agendaData.agenda_list || !agendaData.agenda_list[agendaIndex]) {
                return (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    아젠다 데이터가 없습니다.
                  </div>
                );
              }
              
              const currentAgenda = agendaData.agenda_list[agendaIndex];
              
              return (
                <div className="workspace-agenda new-design">
                  {/* GM의 노트 */}
                  <div className="gm-note">
                    <span className="gm-note-icon">📝</span>
                    <p>"{agendaData.description || '아젠다 설명'}"</p>
                  </div>

                  {/* 안건 헤더 */}
                  <div className="agenda-header">
                    <h3 className="agenda-title">{currentAgenda.agenda_name}</h3>
                    <div className="timer-container">
                      <span>남은 시간</span>
                      <div className="timer-progress-bar">
                        <div className="timer-progress"></div>
                      </div>
                    </div>
                  </div>
                  <p className="workspace-prompt">{currentAgenda.agenda_description}</p>
                  
                  {/* 선택지 목록 */}
                  <div className="agenda-options-list">
                    {currentAgenda.agenda_options?.map((option: any) => (
                      <div
                        key={option.agenda_option_id}
                        className="option-card agenda-option"
                        onClick={() => {
                          setSelectedOption(option.agenda_option_id);
                          setTimeout(() => setWorkspaceState('agenda_result'), 1000);
                        }}
                      >
                        <div className="option-icon">{option.icon}</div>
                        <div className="option-content">
                          <h4>{option.agenda_option_text}</h4>
                          <ImpactSummaryDisplay text={option.agenda_option_impact_summary} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ----------------------------------------- */}
            {/* --- 상태 1.5: Agenda Result (결과 표시) --- */}
            {/* ----------------------------------------- */}
            {workspaceState === 'agenda_result' && (() => {
              if (agendaLoading) {
                return (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      border: '3px solid #f3f3f3', 
                      borderTop: '3px solid #28a745', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      marginRight: '15px'
                    }}></div>
                    아젠다 결과를 불러오는 중...
                  </div>
                );
              }
              
              if (!agendaData || !agendaData.agenda_list || !agendaData.agenda_list[agendaIndex]) {
                return (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    아젠다 데이터가 없습니다.
                  </div>
                );
              }
              
              const currentAgenda = agendaData.agenda_list[agendaIndex];
              const nextAgendaExists = agendaIndex < agendaData.agenda_list.length - 1;
              const selectedOpt = currentAgenda.agenda_options?.find((o: any) => o.agenda_option_id === selectedOption);
              return (
                <div className="workspace-agenda result new-design">
                  <div className="gm-note">
                    <span className="gm-note-icon">📝</span>
                    <p>"{agendaData.description || '아젠다 설명'}"</p>
                  </div>

                  <div className="agenda-header">
                    <h3 className="agenda-title">{currentAgenda.agenda_name}</h3>
                    <div className="agenda-result-info">투표 완료!</div>
                  </div>
                  <p className="workspace-prompt">'{selectedOpt?.agenda_option_text || '선택된 옵션'}' 안건이 채택되었습니다.</p>
                  <div className="agenda-options-list">
                    {currentAgenda.agenda_options?.map((option: any) => (
                      <div
                        key={option.agenda_option_id}
                        className={`option-card agenda-option ${selectedOption === option.agenda_option_id ? 'selected' : 'not-selected'}`}
                      >
                        {selectedOption === option.agenda_option_id && <div className="selected-badge">✅ 선택됨</div>}
                        <div className="option-icon">{option.icon}</div>
                        <div className="option-content">
                          <h4>{option.agenda_option_text}</h4>
                          <ImpactSummaryDisplay text={option.agenda_option_impact_summary} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="next-step-button"
                    onClick={() => {
                      if (nextAgendaExists) {
                        setAgendaIndex(agendaIndex + 1);
                        setWorkspaceState('agenda');
                        setSelectedOption(null);
                      } else {
                        // 모든 안건이 끝나면 work 상태로 전환
                        setWorkspaceState('work');
                        setSelectedOption(null);
                      }
                    }}
                  >
                    {nextAgendaExists ? '다음 안건으로' : '업무 시작하기'}
                  </button>
                </div>
              );
            })()}

            {/* ---------------------------------- */}
            {/* --- 상태 2: Work --- */}
            {/* ---------------------------------- */}
            {workspaceState === 'work' && (() => {
              if (workLoading) {
                return (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      border: '3px solid #f3f3f3', 
                      borderTop: '3px solid #ff9800', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      marginRight: '15px'
                    }}></div>
                    업무 데이터를 불러오는 중...
                  </div>
                );
              }
              
              if (!workData || !workData.task_list || !workData.task_list.player_1) {
                return (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    업무 데이터가 없습니다.
                  </div>
                );
              }
              
              // 현재 플레이어의 업무 목록 (ID는 임시로 사용)
              const playerTasks = workData.task_list.player_1;

              return (
                <div className="workspace-work-session">
                  <div className="work-session-header">
                    <h3>나의 업무 목록</h3>
                    <p>오늘 해결해야 할 업무는 총 {playerTasks.length}개입니다.</p>
                  </div>
                  <div className="task-list">
                    {playerTasks.map((task: any, index: number) => {
                      const isCompleted = index < workTaskIndex;
                      const isActive = index === workTaskIndex;
                      
                      return (
                        <div 
                          key={task.task_id} 
                          className={`task-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        >
                          <div className="task-card-header">
                            <h4 className="task-name">{task.task_name}</h4>
                            {isCompleted && <span className="completed-badge">✓ 완료</span>}
                          </div>
                          {isActive && (
                            <div className="task-card-content">
                              <p className="task-description">{task.task_description}</p>
                              <div className="task-options">
                                {task.task_options?.map((option: any) => (
                                  <button 
                                    key={option.task_option_id} 
                                    className="task-option-button"
                                    onClick={() => {
                                      // (임시) 다음 업무로 이동하는 로직
                                      if (workTaskIndex < playerTasks.length - 1) {
                                        setWorkTaskIndex(workTaskIndex + 1);
                                      } else {
                                        // 모든 업무 완료 후 다음 단계로 (예: overtime)
                                        setWorkspaceState('overtime');
                                      }
                                    }}
                                  >
                                    <span className="option-text">{option.task_option_text}</span>
                                    <span className="option-summary">{option.task_option_impact_summary}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ---------------------------------- */}
            {/* --- 상태 3: Overtime / Rest --- */}
            {/* ---------------------------------- */}
            {workspaceState === 'overtime' && (() => {
              // "나의" 야근/휴식 카드를 선택 (디자인 확인을 위해 임시로 데이터 전환)
              const taskData = {
                overtime: overtimeData.task_list.player_1[0],
                rest: overtimeData.task_list.player_1[0], // 임시로 같은 데이터 사용
              };
              const task = taskData[overtimeView];
              const themeClass = `theme-${task.overtime_task_type}`; // 'theme-overtime' or 'theme-rest'

              return (
                <div className={`workspace-overtime-session ${themeClass}`}>
                  {/* --- 디자인 확인용 임시 토글 버튼 --- */}
                  <div className="temp-overtime-toggle">
                    <button onClick={() => setOvertimeView('overtime')} disabled={overtimeView === 'overtime'}>🌙 야근 보기</button>
                    <button onClick={() => setOvertimeView('rest')} disabled={overtimeView === 'rest'}>☀️ 휴식 보기</button>
                  </div>
                  {/* ------------------------------------ */}

                  <div className="overtime-card">
                    <div className="overtime-card-header">
                      <span className="task-type-badge">
                        {task.overtime_task_type === 'overtime' ? '🌙 야근' : '☀️ 휴식'}
                      </span>
                      <h3>{task.overtime_task_name}</h3>
                    </div>
                    <p className="overtime-description">{task.overtime_task_description}</p>
                    <div className="overtime-options">
                      {task.overtime_task_options.map((option: any) => (
                        <button 
                          key={option.overtime_task_option_id} 
                          className="overtime-option-button"
                          onClick={() => {
                            // (임시) 다음 날로 넘어가는 로직
                            setAgendaIndex(0);
                            setWorkspaceState('agenda');
                          }}
                        >
                          <span className="option-text">{option.overtime_task_option_text}</span>
                          <span className="option-summary">{option.overtime_task_option_impact_summary}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ------------------------------------- */}
            {/* --- 상태 2.5: Work Result (업무 결과) --- */}
            {/* ------------------------------------- */}
            {workspaceState === 'work_result' && (() => {
              const currentWork = workData.task_list.player_1[0]; // (샘플이므로 work 데이터 사용)
              const chosenOption = currentWork.task_options.find((o: any) => o.task_option_id === selectedOption)!;
              return (
                <div className={`workspace-work-result ${isResultSuccess ? 'success' : 'failure'}`}>
                  <div className="result-outcome-text">
                    {isResultSuccess ? 'SUCCESS' : 'FAILURE'}
                  </div>
                  <div className="result-details-card">
                    <h4>{chosenOption.task_option_text}</h4>
                    <p className="result-message">
                      {isResultSuccess
                        ? "업무를 성공적으로 해결했습니다!"
                        : "안타깝게도, 업무 해결에 실패했습니다..."}
                    </p>
                    <div className="work-option-details">
                      <div className="detail-item reward">
                        <strong>보상:</strong> {isResultSuccess ? chosenOption.task_option_impact_summary : '없음'}
                      </div>
                      <div className="detail-item cost">
                        <strong>비용:</strong> {chosenOption.task_option_impact_summary}
                      </div>
                    </div>
                  </div>
                  <button
                    className="next-step-button"
                    onClick={() => {
                      // 현재는 바로 Agenda 처음으로 돌아가도록 설정 (디자인 확인용)
                      setAgendaIndex(0);
                      setWorkspaceState('agenda');
                      setSelectedOption(null);
                    }}
                  >
                    확인
                  </button>
                </div>
              );
            })()}


            {/* --- (임시) 상태 전환 버튼 --- */}
            <div className="temp-state-changer">
              <button onClick={() => { setWorkspaceState('prologue'); }}>Prologue</button>
              <button onClick={() => { setAgendaIndex(0); setWorkspaceState('agenda'); }}>Agenda</button>
              <button onClick={() => { setWorkTaskIndex(0); setWorkspaceState('work'); }}>Work</button>
              <button onClick={() => setWorkspaceState('overtime')}>Overtime</button>
              <button onClick={() => setWorkspaceState('game_result')}>Result</button>
            </div>
          </div>
        </main>
        
        {/* --- Right Sidebar (Chat) --- */}
        <aside className="game-sidebar right">
          <div className="chat-container">
              <div className="chat-header">
                  <h3>채팅</h3>
                  <div className="other-players-list">
                      {otherPlayers.map((player: any) => (
                          <div key={player.profile_id} className="other-player">
                              <img src={player.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'} alt={player.display_name} className="other-player-avatar" />
                              <span className="other-player-name">{player.display_name}</span>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="chat-box-wrapper">
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
        </aside>
        
        {/* Modal (기존 로직 그대로 유지) */}
        <Modal
          isOpen={modalState.isOpen}
          onClose={hideModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          showCloseButton={modalState.showCloseButton}
        />
      </div>
    </>
  );
};

export default GamePage; 