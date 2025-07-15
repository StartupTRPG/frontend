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


// --- 화면 표시용 더미 데이터 (백엔드와 무관) ---
// 이 데이터는 UI 디자인 프로토타이핑을 위한 샘플이며, 실제 게임 로직/데이터와는 아무런 관련이 없습니다.
const DUMMY_GAME_PROTOTYPE_DATA = {
  // ----------------------------------------------------
  // [상태 1: Agenda] - 3개의 안건 투표
  // ----------------------------------------------------
  agendas: [
    // 1번째 안건
    {
      title: "1/3 | 서비스 핵심 가치 정의",
      prompt: "초기 유저 확보를 위한 가장 효과적인 전략에 투표해주세요. (남은 시간: 10초)",
      options: [
        { id: 'A1', title: "혁신적인 기술 리더십", details: "보상: 기술력 +20, 성장 +10 / 비용: 자금 -15", votes: 2 },
        { id: 'A2', title: "압도적인 사용자 경험(UX)", details: "보상: 디자인 +20, 사업성 +10 / 비용: 자금 -15", votes: 1 },
        { id: 'A3', title: "끈끈한 커뮤니티 형성", details: "보상: 팀워크 +15, 마케팅 +15 / 비용: 스트레스 -10", votes: 0 },
      ]
    },
    // 2번째 안건
    {
      title: "2/3 | 초기 투자 유치 전략",
      prompt: "IR 발표에서 어떤 점을 가장 강조해야 할까요? (남은 시간: 10초)",
      options: [
        { id: 'B1', title: "재무적 안정성 강조", details: "보상: 자금 +30 / 비용: 성장 -10", votes: 0 },
        { id: 'B2', title: "팀의 비전과 열정", details: "보상: 팀워크 +20, 사업성 +10 / 비용: 없음", votes: 3 },
        { id: 'B3', title: "구체적인 기술 로드맵", details: "보상: 기술력 +20 / 비용: 디자인 -5", votes: 0 },
      ]
    },
    // 3번째 안건
    {
      title: "3/3 | 경쟁사 등장 대응",
      prompt: "유사 서비스 출시 소식에 어떻게 대응하시겠습니까? (남은 시간: 10초)",
      options: [
        { id: 'C1', title: "더 공격적인 마케팅", details: "보상: 마케팅 +25 / 비용: 자금 -20", votes: 1 },
        { id: 'C2', title: "핵심 기능 고도화", details: "보상: 기술력 +15, 사업성 +10 / 비용: 스트레스 +10", votes: 1 },
        { id: 'C3', title: "경쟁사와 파트너십 모색", details: "보상: 팀워크 +10, 인지도 +15 / 비용: 사업성 -5", votes: 1 },
      ]
    }
  ],
  // ----------------------------------------------------
  // [상태 2: Work] - 개인별 업무 수행
  // ----------------------------------------------------
  works: [
    {
      title: "기획자 담당 업무: 시장 분석 보고서 작성",
      prompt: "어떤 방식으로 보고서를 작성하여 팀의 방향을 제시하시겠습니까?",
      options: [
        { id: 'W1', name: "데이터 기반 분석", description: "경쟁사 지표, 유저 데이터를 심층 분석합니다.", chance: 70, reward: "통찰 +20, 사업성 +10", cost: "스트레스 +10" },
        { id: 'W2', name: "사용자 인터뷰 진행", description: "핵심 타겟 유저를 직접 만나 니즈를 파악합니다.", chance: 85, reward: "통찰 +15, 팀워크 +10", cost: "자금 -5" },
        { id: 'W3', name: "빠른 프로토타입 제작", description: "아이디어를 빠르게 시각화하여 검증합니다.", chance: 60, reward: "실행 +20, 디자인 +5", cost: "스트레스 +15" },
      ]
    }
  ],
  // ----------------------------------------------------
  // [상태 3: Overtime] - 야근...
  // ----------------------------------------------------
  overtime: [
     {
      title: "개발자 담당 야근: 긴급 서버 점검",
      prompt: "배포 직전 심각한 버그가 발견되었습니다. 어떻게 해결하시겠습니까?",
      options: [
        { id: 'O1', name: "밤샘 코딩", description: "커피와 함께 밤을 새워 버그를 해결합니다.", chance: 75, reward: "기술력 +15, 인지도 -5", cost: "스트레스 +25" },
        { id: 'O2', name: "배포 연기 공지", description: "사용자에게 솔직하게 알리고 일정을 연기합니다.", chance: 95, reward: "팀워크 +10, 스트레스 -10", cost: "인지도 -10, 사업성 -5" },
        { id: 'O3', name: "가장 비슷한 동료에게 부탁", description: "미안하지만... 동료의 도움을 받아 함께 해결합니다.", chance: 50, reward: "기술력 +10", cost: "팀워크 -15" },
      ]
    }
  ],
};

const DUMMY_GAME_DATA = {
  time: { display: '3:00', period: 'PM', day: 1, icon: '☀️' },
  progress: [
    { label: '사업성', value: 80 },
    { label: '기술력', value: 60 },
    { label: '디자인', value: 90 },
    { label: '마케팅', value: 45 },
    { label: '팀워크', value: 75 },
  ],
  stats: {
    main: [ // 기획, 실행, 사교, 통찰, 성장
      { label: 'Planning', value: 85 },
      { label: 'Execution', value: 70 },
      { label: 'Social', value: 60 },
      { label: 'Insight', value: 90 },
      { label: 'Growth', value: 50 },
    ],
    sub: [
      { label: '자금', value: 70 },
      { label: '인지도', value: 40 },
      { label: '스트레스', value: 88 },
    ],
  },
  workspace: {
    image: '/images/workspace_image_sample.png', // public 폴더에 실제 이미지가 있어야 합니다.
    prompt: '다음 해결책 중 하나에 투표해주세요 (현재 투표권: 2)',
    agendas: [
      { id: 'A', title: '안건 A: MVP 기능 축소', details: '보상: 개발 기간 단축 / 비용: 핵심 가치 하락' },
      { id: 'B', title: '안건 B: 유료 광고 집행', details: '보상: 신규 유저 유입 / 비용: 자금 소모' },
      { id: 'C', title: '안건 C: 팀원들과 치킨 먹기', details: '보상: 팀워크 상승 / 비용: 자금 소모, 스트레스 감소' },
    ]
  }
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

  // --- 디자인 프로토타이핑을 위한 상태 (실제 게임 로직과 무관) ---
  const [workspaceState, setWorkspaceState] = useState<'agenda' | 'work' | 'overtime' | 'agenda_result' | 'work_result'>('agenda');
  const [agendaIndex, setAgendaIndex] = useState(0); // 현재 진행중인 안건 인덱스
  const [selectedOption, setSelectedOption] = useState<string | null>(null); // 선택한 옵션 ID
  const [isResultSuccess, setIsResultSuccess] = useState(false); // 업무 결과 (성공/실패)
  // --- 여기까지 ---

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
    <div className="game-page-container">
      {/* --- Left Sidebar --- */}
      <aside className="game-sidebar left">
        <div className="sidebar-scroll-content">
          <div className="game-card time-card">
            <div className="time-display">
              <span className="time-icon">{DUMMY_GAME_DATA.time.icon}</span>
              <span className="time-text">{DUMMY_GAME_DATA.time.display}</span>
            </div>
            <div className="day-text">Day {DUMMY_GAME_DATA.time.day}</div>
          </div>
          <div className="game-card progress-card">
            <h3>진척도</h3>
            <div className="progress-list">
              {DUMMY_GAME_DATA.progress.map(item => (
                <div key={item.label} className="progress-item">
                  <span>{item.label}</span>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fg" style={{ width: `${item.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="game-card stats-card">
            <h3>스탯</h3>
            <PentagonChart stats={DUMMY_GAME_DATA.stats.main} />
            <div className="sub-stats-list">
              {DUMMY_GAME_DATA.stats.sub.map(item => (
                <div key={item.label} className="progress-item">
                  <span>{item.label}</span>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fg" style={{ width: `${item.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
          {/* --- 상태 1: Agenda (안건 투표) --- */}
          {/* ----------------------------------- */}
          {workspaceState === 'agenda' && (() => {
            const currentAgenda = DUMMY_GAME_PROTOTYPE_DATA.agendas[agendaIndex];
            return (
              <div className="workspace-agenda">
                <div className="agenda-header">
                  <h3 className="agenda-title">{currentAgenda.title}</h3>
                  <div className="agenda-timer">⏰ 10</div>
                </div>
                <p className="workspace-prompt">{currentAgenda.prompt}</p>
                <div className="agenda-options-list">
                  {currentAgenda.options.map(option => (
                    <div
                      key={option.id}
                      className={`option-card agenda-option`}
                      onClick={() => {
                        setSelectedOption(option.id);
                        // 디자인 확인을 위해 1초 후 결과 상태로 변경
                        setTimeout(() => setWorkspaceState('agenda_result'), 1000);
                      }}
                    >
                      <h4>{option.title}</h4>
                      <p>{option.details}</p>
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
            const currentAgenda = DUMMY_GAME_PROTOTYPE_DATA.agendas[agendaIndex];
            const nextAgendaExists = agendaIndex < DUMMY_GAME_PROTOTYPE_DATA.agendas.length - 1;
            return (
              <div className="workspace-agenda result">
                <div className="agenda-header">
                  <h3 className="agenda-title">{currentAgenda.title}</h3>
                  <div className="agenda-result-info">투표 완료!</div>
                </div>
                <p className="workspace-prompt">'{currentAgenda.options.find(o => o.id === selectedOption)?.title}' 안건이 채택되었습니다.</p>
                <div className="agenda-options-list">
                  {currentAgenda.options.map(option => (
                    <div
                      key={option.id}
                      className={`option-card agenda-option ${selectedOption === option.id ? 'selected' : 'not-selected'}`}
                    >
                      {selectedOption === option.id && <div className="selected-badge">✅ 선택됨</div>}
                      <h4>{option.title}</h4>
                      <p>{option.details}</p>
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
          {/* --- 상태 2 & 3: Work / Overtime --- */}
          {/* ---------------------------------- */}
          {(workspaceState === 'work' || workspaceState === 'overtime') && (() => {
            const currentWork = (workspaceState === 'work'
              ? DUMMY_GAME_PROTOTYPE_DATA.works[0]
              : DUMMY_GAME_PROTOTYPE_DATA.overtime[0]);

            return (
              <div className="workspace-work">
                <h3 className="work-title">{currentWork.title}</h3>
                <p className="workspace-prompt">{currentWork.prompt}</p>
                <div className="work-options-list">
                  {currentWork.options.map(option => (
                    <div
                      key={option.id}
                      className="option-card work-option"
                      onClick={() => {
                        setSelectedOption(option.id);
                        // 샘플 확률에 따라 성공/실패 결정 (디자인 확인용)
                        setIsResultSuccess(Math.random() < (option.chance / 100));
                        setTimeout(() => setWorkspaceState('work_result'), 1000);
                      }}
                    >
                      <div className="work-option-header">
                        <h4>{option.name}</h4>
                        <div className="work-option-chance">{option.chance}%</div>
                      </div>
                      <p className="work-option-desc">{option.description}</p>
                      <div className="work-option-details">
                        <div className="detail-item reward">
                          <strong>보상:</strong> {option.reward}
                        </div>
                        <div className="detail-item cost">
                          <strong>비용:</strong> {option.cost}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ------------------------------------- */}
          {/* --- 상태 2.5: Work Result (업무 결과) --- */}
          {/* ------------------------------------- */}
          {workspaceState === 'work_result' && (() => {
            const currentWork = DUMMY_GAME_PROTOTYPE_DATA.works[0]; // (샘플이므로 work 데이터 사용)
            const chosenOption = currentWork.options.find(o => o.id === selectedOption)!;
            return (
              <div className={`workspace-work-result ${isResultSuccess ? 'success' : 'failure'}`}>
                <div className="result-outcome-text">
                  {isResultSuccess ? 'SUCCESS' : 'FAILURE'}
                </div>
                <div className="result-details-card">
                  <h4>{chosenOption.name}</h4>
                  <p className="result-message">
                    {isResultSuccess
                      ? "업무를 성공적으로 해결했습니다!"
                      : "안타깝게도, 업무 해결에 실패했습니다..."}
                  </p>
                  <div className="work-option-details">
                    <div className="detail-item reward">
                      <strong>보상:</strong> {isResultSuccess ? chosenOption.reward : '없음'}
                    </div>
                    <div className="detail-item cost">
                      <strong>비용:</strong> {chosenOption.cost}
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
            <button onClick={() => { setAgendaIndex(0); setWorkspaceState('agenda'); }}>Agenda</button>
            <button onClick={() => setWorkspaceState('work')}>Work</button>
            <button onClick={() => setWorkspaceState('overtime')}>Overtime</button>
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
  );
};

export default GamePage; 