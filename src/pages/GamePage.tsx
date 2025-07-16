import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';
import ChatBox from '../components/common/ChatBox';
import { SocketEventType, AgendaVoteBroadcastResponse } from '../types/socket';
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
    sendGameMessage,
    voteAgenda, // 추가
    navigateAgenda, // 추가
    completeTask, // 추가
    navigateTask, // 추가
    createTask, // 추가
    createOvertime, // 추가
    updateContext, // 추가
    createExplanation, // 추가
    getGameProgress, // 추가
    calculateResult // 추가
  } = useSocket({
    token: useAuthStore.getState().accessToken || '',
  });
  
  // 방 입장 시도 상태 추적
  const joinAttemptedRef = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roomRef = useRef<any>(null); // room 상태를 ref로 추적

  // --- 게임 상태 관리 ---
  const [workspaceState, setWorkspaceState] = useState<'prologue' | 'context' | 'agenda' | 'work' | 'overtime' | 'explanation' | 'agenda_result' | 'work_result' | 'game_result'>('prologue');
  const [agendaIndex, setAgendaIndex] = useState(0); // 현재 진행중인 안건 인덱스
  const [workTaskIndex, setWorkTaskIndex] = useState(0); // 현재 진행중인 업무 인덱스
  const [selectedOption, setSelectedOption] = useState<string | null>(null); // 선택한 옵션 ID
  const [isResultSuccess, setIsResultSuccess] = useState(false); // 업무 결과 (성공/실패)
  const [overtimeView, setOvertimeView] = useState<'overtime' | 'rest'>('rest'); // 야근/휴식 뷰 전환용

  // 게임 진행 로그 함수
  const logGameProgress = (stage: string, data?: Record<string, any>) => {
    console.log(`🎮 [GAME PROGRESS] ${stage}`, {
      roomId,
      profileId: profile?.id,
      profileName: profile?.display_name,
      workspaceState,
      agendaIndex,
      workTaskIndex,
      selectedOption,
      timestamp: new Date().toISOString(),
      ...data
    });
  };
  
  // 모든 선택이 완료되었는지 확인하는 함수
  const allSelectionsComplete = () => {
    const hasAgendaSelection = selections.agenda_selections[profile?.id || ''];
    const hasTaskSelections = selections.task_selections[profile?.id || ''] && 
      selections.task_selections[profile?.id || ''].length > 0;
    const hasOvertimeSelections = selections.overtime_selections[profile?.id || ''] && 
      selections.overtime_selections[profile?.id || ''].length > 0;
    
    return hasAgendaSelection && hasTaskSelections && hasOvertimeSelections;
  };
  
  // --- 투표 관련 상태 추가 ---
  const [otherPlayerVotes, setOtherPlayerVotes] = useState<Record<string, string>>({}); // player_id -> selected_option_id
  const [voteResults, setVoteResults] = useState<any>(null);
  const [allVotesCompleted, setAllVotesCompleted] = useState(false);
  const [votingPlayers, setVotingPlayers] = useState<Set<string>>(new Set()); // 투표 중인 플레이어들
  const [currentAgendaId, setCurrentAgendaId] = useState<string | null>(null); // 현재 진행 중인 agenda ID

  // --- 태스크 완료 관련 상태 추가 ---
  const [completedTaskPlayers, setCompletedTaskPlayers] = useState<Record<string, Set<string>>>({}); // player_id -> set of completed task_ids
  const [allMyTasksCompleted, setAllMyTasksCompleted] = useState(false); // 내 모든 태스크 완료 여부
  const [allPlayersCompleted, setAllPlayersCompleted] = useState(false); // 모든 플레이어 완료 여부 (호스트 버튼용)

  // --- 게임 데이터 상태 ---
  const [gameData, setGameData] = useState<any>(null);
  const [gameLoading, setGameLoading] = useState(false);
  
  const [contextData, setContextData] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(false);
  
  const [agendaData, setAgendaData] = useState<any>(null);
  const [agendaLoading, setAgendaLoading] = useState(false);
  
  const [workData, setWorkData] = useState<any>(null);
  
  // --- 중복 호출 방지 플래그 ---
  const [isContextUpdating, setIsContextUpdating] = useState(false);
  const [isResultCalculating, setIsResultCalculating] = useState(false);
  const [isTaskCreating, setIsTaskCreating] = useState(false);
  const [workLoading, setWorkLoading] = useState(false);
  
  const [overtimeData, setOvertimeData] = useState<any>(null);
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  
  const [gameResultData, setGameResultData] = useState<any>(null);
  const [resultLoading, setResultLoading] = useState(false);
  
  const [explanationData, setExplanationData] = useState<any>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  
  // 선택 데이터 저장
  const [selections, setSelections] = useState<{
    agenda_selections: Record<string, string>;
    task_selections: Record<string, string[]>;
    overtime_selections: Record<string, string[]>;
  }>({
    agenda_selections: {},
    task_selections: {},
    overtime_selections: {}
  });
  
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
      roomRef.current = res.data; // ref도 업데이트
      
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
        navigate('/');
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

  // 현재 아젠다 ID 자동 설정
  useEffect(() => {
    if (agendaData?.agenda_list && agendaData.agenda_list[agendaIndex]) {
      setCurrentAgendaId(agendaData.agenda_list[agendaIndex].id);
    }
  }, [agendaData, agendaIndex]);

  // 모든 플레이어 태스크 완료 여부 계산
  useEffect(() => {
    if (!room || !workData?.task_list) return;
    
    const allCompleted = room.players?.every((player: any) => {
      const playerCompletedTasks = completedTaskPlayers[player.profile_id] || new Set();
      const playerTasks = workData.task_list[player.profile_id] || [];
      const hasCompleted = playerCompletedTasks.size >= playerTasks.length;
      
      // 디버깅용 로그
      console.log(`완료 여부 체크 - ${player.display_name}:`, {
        playerId: player.profile_id,
        completedTasks: Array.from(playerCompletedTasks),
        totalTasks: playerTasks.length,
        hasCompleted
      });
      
      return hasCompleted;
    }) || false;
    
    setAllPlayersCompleted(allCompleted);
    
    // 전체 상태 로그
    console.log('모든 플레이어 완료 상태 업데이트:', {
      allCompleted,
      totalPlayers: room?.players?.length || 0,
      completedTaskPlayers: Object.fromEntries(
        Object.entries(completedTaskPlayers).map(([playerId, tasks]) => [
          playerId, 
          Array.from(tasks)
        ])
      )
    });
  }, [completedTaskPlayers, room, workData]);

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
        
        // 기존 게임 상태 확인
        if (socket && roomId) {
          getGameProgress(roomId);
        }
        
        logGameProgress('게임 시작', { story: data.story });
        console.log('게임 시작됨:', data);
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

    // 아젠다 로딩 시작 이벤트 핸들러 추가
    const handleAgendaLoadingStarted = (data: any) => {
      if (data.room_id === roomId) {
        // 모든 플레이어가 동시에 로딩 화면으로 이동
        setAgendaLoading(true);
        setWorkspaceState('agenda');
        logGameProgress('아젠다 로딩 시작', { 
          timestamp: data.timestamp
        });
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
        // 투표 상태 초기화
        setOtherPlayerVotes({});
        setVoteResults(null);
        setAllVotesCompleted(false);
        setVotingPlayers(new Set());
        logGameProgress('아젠다 생성 완료', { 
          agendaCount: data.agenda_list?.length || 0
        });
      } else {
      }
    };

    // task 생성 이벤트 핸들러 추가
    const handleTaskCreated = (data: any) => {
      if (data.room_id === roomId) {
        // task 데이터 설정 - LLM 백엔드에서 오는 형식 그대로 사용
        setWorkData({
          task_list: data.task_list
        });
        setWorkLoading(false); // 로딩 완료
        
        // 태스크 생성 플래그 리셋
        setIsTaskCreating(false);
        
        // 모든 플레이어가 업무 화면으로 넘어가도록 설정
        setWorkspaceState('work');
        logGameProgress('업무 화면으로 전환', { 
          taskCount: Object.keys(data.task_list).length,
          playerTasks: profile?.id ? data.task_list[profile.id]?.length || 0 : 0
        });
        console.log('Task 생성 완료:', data);
      } else {
      }
    };

    // overtime 생성 이벤트 핸들러 추가
    const handleOvertimeCreated = (data: any) => {
      if (data.room_id === roomId) {
        // overtime 데이터 설정
        setOvertimeData({
          task_list: data.task_list
        });
        setOvertimeLoading(false); // 로딩 완료
        logGameProgress('야근/휴식 화면으로 전환', { 
          taskCount: Object.keys(data.task_list).length,
          playerTasks: profile?.id ? data.task_list[profile.id]?.length || 0 : 0
        });
        console.log('Overtime 생성 완료:', data);
      }
    };

    // 컨텍스트 업데이트 완료 이벤트 핸들러 추가
    const handleContextUpdated = (data: any) => {
      if (data.room_id === roomId) {
        logGameProgress('컨텍스트 업데이트 완료', { 
          phase: data.phase
        });
        console.log('컨텍스트 업데이트 완료:', data);
        
        // 컨텍스트 업데이트 완료 후 바로 결과 계산 요청 (중복 방지)
        if (socket && roomId && !isResultCalculating) {
          setIsResultCalculating(true);
          calculateResult(roomId);
        }
        // 이미 game_result 상태이고 로딩 중이므로 추가 상태 변경 불필요
      }
    };

    // 설명 생성 완료 이벤트 핸들러 추가
    const handleExplanationCreated = (data: any) => {
      if (data.room_id === roomId) {
        setExplanationData({
          explanation: data.explanation
        });
        setExplanationLoading(false);
        logGameProgress('설명 생성 완료', { 
          explanationLength: data.explanation?.length || 0
        });
        // 설명 생성 후 바로 결과 계산으로 진행
        setWorkspaceState('game_result');
      }
    };

    // 게임 결과 수신 이벤트 핸들러 추가
    const handleGameResultCreated = (data: any) => {
      if (data.room_id === roomId) {
        // 게임 결과 데이터 설정
        setGameResultData({
          game_result: data.game_result,
          player_rankings: data.player_rankings
        });
        setResultLoading(false); // 로딩 완료
        
        // 중복 호출 방지 플래그 리셋
        setIsContextUpdating(false);
        setIsResultCalculating(false);
        
        logGameProgress('게임 결과 수신', { 
          success: data.game_result?.success,
          playerCount: data.player_rankings?.length || 0
        });
        console.log('게임 결과 생성 완료:', data);
      }
    };

    // 아젠다 투표 broadcast 이벤트 핸들러 추가
    const handleAgendaVoteBroadcast = (data: AgendaVoteBroadcastResponse) => {
      if (data.room_id !== roomId) return;

      const currentAgenda = agendaData?.agenda_list?.[agendaIndex];
      if (!currentAgenda || data.agenda_id !== currentAgenda.id) return;

      // 다른 플레이어의 투표 결과를 저장
      setOtherPlayerVotes(prev => ({
        ...prev,
        [data.player_id]: data.selected_option_id
      }));
      
      // 투표 중인 플레이어 목록에 추가
      setVotingPlayers(prev => {
        const newVotingPlayers = new Set([...prev, data.player_id]);
        
        // 모든 플레이어가 투표했는지 확인
        const allPlayersVoted = newVotingPlayers.size >= (room?.players?.length || 0);
        
        if (allPlayersVoted) {
          // 모든 플레이어가 투표 완료 시 2초 후 결과 화면으로 전환
          setTimeout(() => {
            setWorkspaceState('agenda_result');
          }, 2000);
        }
        
        return newVotingPlayers;
      });
      
      console.log(`${data.player_name}님이 투표했습니다:`, data.selected_option_id);
    };

    // 아젠다 투표 완료 이벤트 핸들러 추가
    const handleAgendaVoteCompleted = (data: any) => {
      if (data.room_id !== roomId) return;

      const currentAgenda = agendaData?.agenda_list?.[agendaIndex];
      if (!currentAgenda || data.agenda_id !== currentAgenda.id) return;

      setVoteResults(data);
      setAllVotesCompleted(true);
      
      // 투표 완료 후 결과 화면으로 전환
      setTimeout(() => {
        setWorkspaceState('agenda_result');
      }, 2000); // 2초 후 결과 화면으로
    };

    // 아젠다 네비게이션 이벤트 핸들러 추가
    const handleAgendaNavigate = (data: any) => {
      if (data.room_id !== roomId) return;

      logGameProgress('아젠다 네비게이션 수신', { 
        action: data.action,
        hostName: data.host_display_name
      });

      if (data.action === 'next') {
        // 다음 안건으로 이동
        const nextAgendaExists = agendaIndex < (agendaData?.agenda_list?.length || 0) - 1;
        
        if (nextAgendaExists) {
          // 투표 상태 초기화
          setOtherPlayerVotes({});
          setVoteResults(null);
          setAllVotesCompleted(false);
          setVotingPlayers(new Set());
          setCurrentAgendaId(null);
          
          // 다음 안건으로 이동
          setAgendaIndex(agendaIndex + 1);
          setWorkspaceState('agenda');
          setSelectedOption(null);
          
          logGameProgress('다음 안건으로 이동', { 
            nextAgendaIndex: agendaIndex + 2,
            totalAgendas: agendaData?.agenda_list?.length || 0
          });
        }
      } else if (data.action === 'finish') {
        // 업무 단계로 이동
        // 투표 상태 초기화
        setOtherPlayerVotes({});
        setVoteResults(null);
        setAllVotesCompleted(false);
        setVotingPlayers(new Set());
        setCurrentAgendaId(null);
        
        setWorkspaceState('work');
        setSelectedOption(null);
        setWorkLoading(true); // 로딩 시작
        
        logGameProgress('업무 단계 시작', { 
          totalAgendas: agendaData?.agenda_list?.length || 0
        });
        
        // task 생성 요청 (중복 방지)
        if (socket && roomId && !isTaskCreating) {
          setIsTaskCreating(true);
          createTask(roomId);
        }
      }
    };

    // 태스크 완료 브로드캐스트 이벤트 핸들러 추가
    const handleTaskCompletedBroadcast = (data: any) => {
      if (data.room_id !== roomId) return;

      logGameProgress('태스크 완료 브로드캐스트 수신', { 
        playerId: data.player_id,
        playerName: data.player_name,
        taskId: data.task_id
      });
      
      // 디버깅용 로그
      console.log('태스크 완료 브로드캐스트 수신:', {
        playerId: data.player_id,
        playerName: data.player_name,
        taskId: data.task_id,
        currentCompletedTaskPlayers: Object.fromEntries(
          Object.entries(completedTaskPlayers).map(([playerId, tasks]) => [
            playerId, 
            Array.from(tasks)
          ])
        )
      });

      // 태스크 완료한 플레이어의 완료된 태스크 추가
      setCompletedTaskPlayers(prev => {
        const newCompletedPlayers = { ...prev };
        
        if (!newCompletedPlayers[data.player_id]) {
          newCompletedPlayers[data.player_id] = new Set();
        }
        
        newCompletedPlayers[data.player_id].add(data.task_id);
        
        // ref를 통해 최신 room 상태를 가져와서 사용
        const currentRoom = roomRef.current;
        
        logGameProgress('태스크 완료 플레이어 업데이트', {
          playerId: data.player_id,
          completedTaskCount: newCompletedPlayers[data.player_id].size,
          totalPlayers: currentRoom?.players?.length || 0
        });
        
        // 업데이트된 상태 로그
        console.log('태스크 완료 상태 업데이트 후:', {
          playerId: data.player_id,
          completedTaskCount: newCompletedPlayers[data.player_id].size,
          allCompletedTasks: Object.fromEntries(
            Object.entries(newCompletedPlayers).map(([playerId, tasks]) => [
              playerId, 
              Array.from(tasks)
            ])
          )
        });
        
        return newCompletedPlayers;
      });
    };

    // 태스크 네비게이션 이벤트 핸들러 추가
    const handleTaskNavigate = (data: any) => {
      if (data.room_id !== roomId) return;

      logGameProgress('태스크 네비게이션 수신', { 
        hostName: data.host_display_name
      });

      // 태스크 완료 상태 초기화
      setCompletedTaskPlayers({});
      setAllMyTasksCompleted(false); // 내 태스크 완료 상태도 초기화
      setAllPlayersCompleted(false); // 모든 플레이어 완료 상태도 초기화
      
      // overtime 단계로 이동하고 로딩 상태 설정
      setWorkspaceState('overtime');
      setOvertimeLoading(true); // 로딩 시작
      setOvertimeData(null); // 기존 데이터 초기화
      
      logGameProgress('야근/휴식 단계 시작', { 
        hostName: data.host_display_name
      });
      
      // overtime 생성 요청
      if (socket && roomId) {
        createOvertime(roomId);
      }
    };
    
    const handleGameFinish = (data: any) => {
      if (data.room_id === roomId) {
        setGameStarted(false);
        navigate(`/room/${roomId}`); // 로비로 돌아가기
      } else {
      }
    };

    // game_progress_updated 이벤트 핸들러 추가
    const handleGameProgressUpdated = (data: any) => {
      if (data.room_id === roomId) {
        // 현재 workspace 상태에 따라 적절히 처리
        const currentPhase = data.phase;
        
        logGameProgress('게임 진행 상황 업데이트 수신', { 
          currentWorkspaceState: workspaceState,
          receivedPhase: data.phase,
          hasAgendaList: !!data.agenda_list,
          hasOvertimeTaskList: !!data.overtime_task_list,
          hasGameResult: !!data.game_result
        });
        
        // agenda 데이터가 있으면 처리 (agenda 단계에서만)
        if (data.agenda_list && data.agenda_list.length > 0 && workspaceState === 'agenda') {
          setAgendaData({
            description: data.description || '아젠다 설명',
            agenda_list: data.agenda_list
          });
          setAgendaLoading(false); // 로딩 완료
          logGameProgress('아젠다 데이터 수신', { 
            agendaCount: data.agenda_list.length,
            phase: data.phase
          });
        }
        
        // context 데이터가 있으면 처리 (context 단계에서만)
        if (data.company_context && data.player_context_list && workspaceState === 'context') {
          setContextData({
            company_context: data.company_context,
            player_context_list: data.player_context_list
          });
          setContextLoading(false);
          logGameProgress('컨텍스트 데이터 수신', { 
            playerCount: data.player_context_list.length,
            phase: data.phase
          });
        }
        
        // story 데이터가 있으면 처리 (prologue 단계에서만)
        if (data.story && workspaceState === 'prologue') {
          setPrologueData({ story: data.story });
          setPrologueLoading(false);
          logGameProgress('스토리 데이터 수신', { 
            phase: data.phase
          });
        }

        // overtime 데이터가 있으면 처리 (overtime 단계에서만)
        if (data.overtime_task_list && Object.keys(data.overtime_task_list).length > 0 && workspaceState === 'overtime') {
          setOvertimeData({
            task_list: data.overtime_task_list
          });
          setOvertimeLoading(false);
          logGameProgress('야근/휴식 데이터 업데이트', { 
            taskCount: Object.keys(data.overtime_task_list).length,
            phase: data.phase
          });
          console.log('Overtime 데이터 업데이트:', data.overtime_task_list);
        }

        // 게임 결과 데이터가 있으면 처리 (game_result 단계에서만)
        if (data.game_result && data.player_rankings && workspaceState === 'game_result') {
          setGameResultData({
            game_result: data.game_result,
            player_rankings: data.player_rankings
          });
          setResultLoading(false);
          logGameProgress('게임 결과 데이터 업데이트', { 
            success: data.game_result?.success,
            playerCount: data.player_rankings?.length || 0,
            phase: data.phase
          });
        }
      }
    };

    socket.on(SocketEventType.START_GAME, handleGameStart);
    socket.on('story_created', handleStoryCreated);
    socket.on('context_created', handleContextCreated);
    socket.on(SocketEventType.AGENDA_LOADING_STARTED, handleAgendaLoadingStarted); // 추가
    socket.on(SocketEventType.CREATE_AGENDA, handleAgendaCreated);
    socket.on('task_created', handleTaskCreated); // 추가
    socket.on('overtime_created', handleOvertimeCreated); // 추가
    socket.on('context_updated', handleContextUpdated); // 추가
    socket.on('explanation_created', handleExplanationCreated); // 추가
    socket.on(SocketEventType.AGENDA_VOTE_BROADCAST, handleAgendaVoteBroadcast); // 추가
    socket.on(SocketEventType.AGENDA_VOTE_COMPLETED, handleAgendaVoteCompleted); // 추가
    socket.on(SocketEventType.AGENDA_NAVIGATE, handleAgendaNavigate); // 추가
    socket.on(SocketEventType.TASK_COMPLETED_BROADCAST, handleTaskCompletedBroadcast); // 추가
    socket.on(SocketEventType.TASK_NAVIGATE, handleTaskNavigate); // 추가
    socket.on(SocketEventType.FINISH_GAME, handleGameFinish);
    socket.on(SocketEventType.GAME_PROGRESS_UPDATED, handleGameProgressUpdated); // 추가
    socket.on('game_result_created', handleGameResultCreated); // 추가
    
    return () => {  
      socket.off(SocketEventType.START_GAME, handleGameStart);
      socket.off('story_created', handleStoryCreated);
      socket.off('context_created', handleContextCreated);
      socket.off(SocketEventType.AGENDA_LOADING_STARTED, handleAgendaLoadingStarted); // 추가
      socket.off(SocketEventType.CREATE_AGENDA, handleAgendaCreated);
      socket.off('task_created', handleTaskCreated); // 추가
      socket.off('overtime_created', handleOvertimeCreated); // 추가
      socket.off('context_updated', handleContextUpdated); // 추가
      socket.off('explanation_created', handleExplanationCreated); // 추가
      socket.off(SocketEventType.AGENDA_VOTE_BROADCAST, handleAgendaVoteBroadcast); // 추가
      socket.off(SocketEventType.AGENDA_VOTE_COMPLETED, handleAgendaVoteCompleted); // 추가
      socket.off(SocketEventType.AGENDA_NAVIGATE, handleAgendaNavigate); // 추가
      socket.off(SocketEventType.TASK_COMPLETED_BROADCAST, handleTaskCompletedBroadcast); // 추가
      socket.off(SocketEventType.TASK_NAVIGATE, handleTaskNavigate); // 추가
      socket.off(SocketEventType.FINISH_GAME, handleGameFinish);
      socket.off(SocketEventType.GAME_PROGRESS_UPDATED, handleGameProgressUpdated); // 추가
      socket.off('game_result_created', handleGameResultCreated); // 추가
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
        navigate('/');
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

  // 아젠다 선택 핸들러 추가
  const handleAgendaOptionSelect = (optionId: string) => {
    if (!socket || !roomId || !agendaData?.agenda_list?.[agendaIndex]) {
      return;
    }
    
    const currentAgenda = agendaData.agenda_list[agendaIndex];
    
    // 선택한 옵션 저장
    setSelectedOption(optionId);
    
                                    // selections에 저장
                                setSelections(prev => {
                                  const newSelections = {
                                    ...prev,
                                    agenda_selections: {
                                      ...prev.agenda_selections,
                                      [profile?.id || '']: optionId
                                    }
                                  };
                                  
                                  logGameProgress('아젠다 선택 저장', {
                                    playerId: profile?.id,
                                    selectedOptionId: optionId,
                                    allAgendaSelections: newSelections.agenda_selections
                                  });
                                  
                                  return newSelections;
                                });
    
    logGameProgress('아젠다 선택', { 
      agendaId: currentAgenda.id,
      agendaName: currentAgenda.name,
      selectedOptionId: optionId,
      agendaIndex: agendaIndex + 1,
      totalAgendas: agendaData.agenda_list.length
    });
    
    // 백엔드로 투표 결과 전송 (broadcast 포함)
    voteAgenda(roomId, currentAgenda.id, optionId, profile?.display_name);
    
    // 내가 투표했음을 표시
    setVotingPlayers(prev => {
      const newVotingPlayers = new Set([...prev, profile?.id || '']);
      
      // 모든 플레이어가 투표했는지 확인
      const allPlayersVoted = newVotingPlayers.size >= (room?.players?.length || 0);
      
      if (allPlayersVoted) {
        // 모든 플레이어가 투표 완료 시 2초 후 결과 화면으로 전환
        setTimeout(() => {
          setWorkspaceState('agenda_result');
        }, 2000);
      }
      
      return newVotingPlayers;
    });
  };

  
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
    navigate('/'); 
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
        if (resultLoading) {
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
              게임 결과를 계산하는 중...
            </div>
          );
        }
        
        if (!gameResultData) {
          return (
            <div style={{ 
              textAlign: 'center',
              padding: '40px',
              fontSize: '18px',
              color: '#666'
            }}>
              게임 결과를 불러오는 중...
            </div>
          );
        }
        
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
                    key={`${player.id}-${player.rank}`}
                    className={`ranking-card rank-${player.rank}`}
                    style={{ animationDelay: `${index * 0.3 + 0.5}s` }} // 애니메이션 딜레이 조정
                  >
                    <div className="ranking-info">
                      <span className="rank-number">{player.rank}</span>
                      <span className="rank-medal">{getMedal(player.rank)}</span>
                      <div className="player-details">
                        <span className="player-name">{player.name}</span>
                        <span className="player-role">{player.role}</span>
                      </div>
                    </div>
                    <p className="player-evaluation">"{player.evaluation}"</p>
                  </div>
                ))}
              </div>
              {/* --- 게임 종료 버튼 --- */}
              <button className="close-result-button" onClick={() => {
                // 게임 종료 처리
                if (socket && roomId) {
                  finishGame(roomId);
                }
                // RoomLobby로 이동
                navigate(`/room/${roomId}`);
              }}>
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
                        {(() => {
                          // 현재 플레이어의 컨텍스트 찾기
                          const myContext = contextData.player_context_list?.find(
                            (player: any) => player.id === profile?.id
                          );
                          
                          if (!myContext) {
                            return "플레이어 상태를 불러오는 중...";
                          }
                          
                          const contextText = myContext.context?.["1"] || "플레이어 상태를 불러오는 중...";
                          return contextText.split(',').map((item: string, index: number) => (
                            <span key={index}>
                              {item.trim()}
                              {index < contextText.split(',').length - 1 && '\n'}
                            </span>
                          ));
                        })()}
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
            <h2>{workspaceState === 'game_result' ? '게임이 종료되었습니다' : '워크스페이스'}</h2>
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
                  
                  {/* Daily Scrum 진행하기 버튼 - Host만 표시 */}
                  {isHost && (
                    <button
                      className="next-step-button"
                      onClick={() => {
                        // 아젠다 생성 요청
                        if (socket && roomId) {
                          setAgendaLoading(true); // 아젠다 로딩 시작
                          setWorkspaceState('agenda'); // 아젠다 상태로 즉시 전환
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
                  )}
                  
                  {/* Host가 아닌 경우 대기 메시지 */}
                  {!isHost && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      marginTop: '20px'
                    }}>
                      <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
                        🕐 Host가 Daily Scrum을 시작할 때까지 기다려주세요...
                      </p>
                    </div>
                  )}
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
                (player: any) => player.id === profile?.id
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
                          {JSON.stringify(myContext.context, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Daily Scrum 버튼 - Host만 표시 */}
                  {isHost && (
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
                  )}
                  
                  {/* Host가 아닌 경우 대기 메시지 */}
                  {!isHost && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      marginTop: '20px'
                    }}>
                      <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
                        🕐 Host가 Daily Scrum을 시작할 때까지 기다려주세요...
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ----------------------------------- */}
            {/* --- 상태 1: Agenda (안건 투표) --- */}
            {/* ----------------------------------- */}
            {workspaceState === 'agenda' && (() => {
              // agendaData가 있으면 로딩 상태를 무시하고 데이터 표시
              if (agendaData && agendaData.agenda_list && agendaData.agenda_list.length > 0) {
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
                    <h3 className="agenda-title">{currentAgenda.name}</h3>
                    {selectedOption && (
                      <div className="agenda-progress">
                        <span className="voting-status-text">투표 완료! 다른 플레이어 대기 중...</span>
                      </div>
                    )}
                    <div className="timer-container">
                      <span>남은 시간</span>
                      <div className="timer-progress-bar">
                        <div className="timer-progress"></div>
                      </div>
                    </div>
                  </div>
                  <p className="workspace-prompt">{currentAgenda.description}</p>
                  
                  {/* 선택지 목록 */}
                  <div className="agenda-options-list">
                    {currentAgenda.options?.map((option: any) => (
                      <div
                        key={option.id}
                        className="option-card agenda-option"
                        onClick={() => handleAgendaOptionSelect(option.id)}
                        style={{
                          cursor: 'pointer'
                        }}
                      >
                        <div className="option-icon">{option.icon}</div>
                        <div className="option-content">
                          <h4>{option.text}</h4>
                          <ImpactSummaryDisplay text={option.impact_summary} />
                        </div>
                        {selectedOption === option.id && (
                          <div className="selected-badge">✅ 선택됨</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="voting-status">
                    <h4>투표 현황</h4>
                    <div className="voting-players">
                      {room.players?.map((player: any) => {
                        const hasVoted = votingPlayers.has(player.profile_id);
                        
                        return (
                          <div key={player.profile_id} className="voting-player">
                            <img 
                              src={player.avatar_url || 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'} 
                              alt={player.display_name} 
                              className="player-avatar" 
                            />
                            <span className="player-name">{player.display_name}</span>
                            <span className="voting-status-icon">
                              {hasVoted ? '✅' : '⏳'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </div>
                );
              }
              
              // agendaData가 없고 로딩 중일 때만 로딩 화면 표시
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
                    Daily Scrum 준비 중...
                  </div>
                );
              }
              
              // 데이터가 없고 로딩도 아닐 때
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
              const selectedOpt = currentAgenda.options?.find((o: any) => o.id === selectedOption);
              return (
                <div className="workspace-agenda result new-design">
                  <div className="gm-note">
                    <span className="gm-note-icon">📝</span>
                    <p>"{agendaData.description || '아젠다 설명'}"</p>
                  </div>

                  <div className="agenda-header">
                    <h3 className="agenda-title">{currentAgenda.name}</h3>
                    <div className="agenda-result-info">
                      {voteResults ? '투표 완료!' : '투표 진행 중...'}
                    </div>
                  </div>
                  <p className="workspace-prompt">'{selectedOpt?.text || '선택된 옵션'}' 안건이 채택되었습니다.</p>
                  <div className="agenda-options-list">
                    {currentAgenda.options?.map((option: any) => (
                      <div
                        key={option.id}
                        className={`option-card agenda-option ${selectedOption === option.id ? 'selected' : 'not-selected'}`}
                      >
                        {selectedOption === option.id && <div className="selected-badge">✅ 선택됨</div>}
                        <div className="option-icon">{option.icon}</div>
                        <div className="option-content">
                          <h4>{option.text}</h4>
                          <ImpactSummaryDisplay text={option.impact_summary} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 다음 버튼 - Host만 표시 */}
                  {isHost && (
                    <button
                      className="next-step-button"
                      onClick={() => {
                        if (nextAgendaExists) {
                          // 다음 안건으로 이동하는 소켓 이벤트 전송
                          if (socket && roomId) {
                            navigateAgenda(roomId, 'next');
                          }
                        } else {
                          // 업무 단계로 이동하는 소켓 이벤트 전송
                          if (socket && roomId) {
                            navigateAgenda(roomId, 'finish');
                          }
                        }
                      }}
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginTop: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {nextAgendaExists ? `다음 안건으로 (${agendaIndex + 1}/${agendaData.agenda_list.length})` : '업무 시작하기'}
                    </button>
                  )}
                  
                  {/* Host가 아닌 경우 대기 메시지 */}
                  {!isHost && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      marginTop: '20px'
                    }}>
                      <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
                        🕐 Host가 {nextAgendaExists ? '다음 안건을 진행' : '업무를 시작'}할 때까지 기다려주세요...
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ---------------------------------- */}
            {/* --- 상태 2: Work --- */}
            {/* ---------------------------------- */}
            {workspaceState === 'work' && (() => {
              if (workLoading) {
                return (
                  <div className="workspace-loading">
                    <div className="loading-content">
                      <div className="loading-spinner"></div>
                      <h3>업무 생성 중...</h3>
                      <p>AI가 팀원들의 역할에 맞는 업무를 생성하고 있습니다.</p>
                      <div className="loading-progress">
                        <div className="progress-bar">
                          <div className="progress-fill"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (!workData || !workData.task_list) {
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
              
              // LLM 백엔드에서 오는 형식: task_list[player_id] = [tasks]
              const playerTasks = workData.task_list[profile.id] || [];
              
              if (playerTasks.length === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    나에게 할당된 업무가 없습니다.
                  </div>
                );
              }

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
                          key={task.id} 
                          className={`task-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        >
                          <div className="task-card-header">
                            <h4 className="task-name">{task.name}</h4>
                            {isCompleted && <span className="completed-badge">✓ 완료</span>}
                          </div>
                          {isActive && (
                            <div className="task-card-content">
                              <p className="task-description">{task.description}</p>
                              <div className="task-options">
                                {task.options?.map((option: any) => (
                                  <button 
                                    key={option.id} 
                                    className="task-option-button"
                                    onClick={() => {
                                      // 선택한 옵션 저장
                                      setSelectedOption(option.id);
                                      
                                      // selections에 저장
                                      setSelections(prev => {
                                        const newSelections = {
                                          ...prev,
                                          task_selections: {
                                            ...prev.task_selections,
                                            [profile?.id || '']: [
                                              ...(prev.task_selections[profile?.id || ''] || []),
                                              option.id
                                            ]
                                          }
                                        };
                                        
                                        logGameProgress('태스크 선택 저장', {
                                          playerId: profile?.id,
                                          selectedOptionId: option.id,
                                          allTaskSelections: newSelections.task_selections
                                        });
                                        
                                        return newSelections;
                                      });
                                      
                                      logGameProgress('업무 선택', {
                                        taskId: task.id,
                                        taskName: task.name,
                                        selectedOptionId: option.id,
                                        selectedOptionText: option.text,
                                        currentTaskIndex: workTaskIndex + 1,
                                        totalTasks: playerTasks.length
                                      });
                                      
                                      // 현재 태스크 완료 알림 (모든 태스크에서 호출)
                                      if (socket && roomId) {
                                        console.log('completeTask 호출:', {
                                          roomId,
                                          playerName: profile?.display_name,
                                          taskId: task.id,
                                          task: task
                                        });
                                        completeTask(roomId, profile?.display_name, task.id);
                                      }
                                      
                                      // 현재 업무 완료 처리
                                      if (workTaskIndex < playerTasks.length - 1) {
                                        // 다음 업무로 이동
                                        setWorkTaskIndex(workTaskIndex + 1);
                                        setSelectedOption(null); // 선택 초기화
                                        logGameProgress('다음 업무로 이동', {
                                          nextTaskIndex: workTaskIndex + 2,
                                          totalTasks: playerTasks.length
                                        });
                                      } else {
                                        // 마지막 태스크도 완료 상태로 표시하기 위해 인덱스 증가
                                        setWorkTaskIndex(workTaskIndex + 1);
                                        setAllMyTasksCompleted(true); // 모든 태스크 완료 플래그 설정
                                        
                                        logGameProgress('모든 태스크 완료', {
                                          totalTasks: playerTasks.length
                                        });
                                      }
                                    }}
                                  >
                                    <span className="option-text">{option.text}</span>
                                    <span className="option-summary">{option.impact_summary}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  

                  
                  {/* 호스트 전용 다음 단계 버튼 */}
                  {isHost && (
                    <button
                      className="next-step-button"
                      onClick={() => {
                        if (socket && roomId) {
                          navigateTask(roomId);
                        }
                      }}
                      disabled={!allPlayersCompleted}
                      style={{
                        backgroundColor: allPlayersCompleted ? '#28a745' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: allPlayersCompleted ? 'pointer' : 'not-allowed',
                        marginTop: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {allPlayersCompleted 
                        ? '야근/휴식 단계로 진행' 
                        : '모든 플레이어 완료 대기 중...'}
                    </button>
                  )}
                  
                  {/* 호스트가 아닌 경우 대기 메시지 */}
                  {!isHost && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      backgroundColor: allMyTasksCompleted ? '#d4edda' : '#f8f9fa',
                      borderRadius: '8px',
                      border: `1px solid ${allMyTasksCompleted ? '#c3e6cb' : '#e9ecef'}`,
                      marginTop: '20px'
                    }}>
                      <p style={{ 
                        margin: 0, 
                        color: allMyTasksCompleted ? '#155724' : '#666', 
                        fontSize: '16px',
                        fontWeight: allMyTasksCompleted ? 'bold' : 'normal'
                      }}>
                        {allMyTasksCompleted 
                          ? '🎉 모든 태스크를 완료했습니다!' 
                          : '🕐 태스크를 진행해주세요...'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ---------------------------------- */}
            {/* --- 상태 3: Overtime / Rest --- */}
            {/* ---------------------------------- */}
            {workspaceState === 'overtime' && (() => {
              if (overtimeLoading) {
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
                    야근/휴식 옵션 생성 중...
                  </div>
                );
              }
              
              if (!overtimeData || !overtimeData.task_list) {
                // 데이터가 없으면 게임 상태 다시 확인
                if (socket && roomId) {
                  getGameProgress(roomId);
                  setOvertimeLoading(true);
                }

              return (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    야근/휴식 데이터를 불러오는 중...
                  </div>
                );
              }
              
              // 현재 플레이어의 overtime 데이터 가져오기
              const playerOvertimeTasks = overtimeData.task_list[profile.id] || [];
              
              if (playerOvertimeTasks.length === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    나에게 할당된 야근/휴식 옵션이 없습니다.
                  </div>
                );
              }

              return (
                <div className="workspace-overtime-session">
                  <div className="overtime-session-header">
                    <h3>야근/휴식 선택</h3>
                    <p>오늘 하루를 마무리하는 방법을 선택하세요.</p>
                  </div>
                  <div className="overtime-list">
                    {playerOvertimeTasks.map((task: any, index: number) => (
                      <div key={task.id} className="overtime-card">
                    <div className="overtime-card-header">
                      <span className="task-type-badge">
                        {task.type === 'overtime' ? '🌙 야근' : '☀️ 휴식'}
                      </span>
                          <h4>{task.name}</h4>
                    </div>
                    <p className="overtime-description">{task.description}</p>
                    <div className="overtime-options">
                          {task.options?.map((option: any) => (
                        <button 
                          key={option.id} 
                          className="overtime-option-button"
                          onClick={() => {
                                // 선택한 옵션 저장
                                setSelectedOption(option.id);
                                
                                logGameProgress('야근/휴식 선택', {
                                  taskId: task.id,
                                  taskName: task.name,
                                  taskType: task.type,
                                  selectedOptionId: option.id,
                                  selectedOptionText: option.text
                                });
                                
                                // selections에 저장하고 완료 여부 확인
                                setSelections(prev => {
                                  const newSelections = {
                                    ...prev,
                                    overtime_selections: {
                                      ...prev.overtime_selections,
                                      [profile?.id || '']: [
                                        ...(prev.overtime_selections[profile?.id || ''] || []),
                                        option.id
                                      ]
                                    }
                                  };
                                  
                                  logGameProgress('오버타임 선택 저장', {
                                    playerId: profile?.id,
                                    selectedOptionId: option.id,
                                    allOvertimeSelections: newSelections.overtime_selections
                                  });
                                  
                                  // 모든 선택이 완료되었는지 확인 (업데이트된 selections 기준)
                                  const hasAgendaSelection = newSelections.agenda_selections[profile?.id || ''];
                                  const hasTaskSelections = newSelections.task_selections[profile?.id || ''] && 
                                    newSelections.task_selections[profile?.id || ''].length > 0;
                                  const hasOvertimeSelections = newSelections.overtime_selections[profile?.id || ''] && 
                                    newSelections.overtime_selections[profile?.id || ''].length > 0;
                                  
                                  const allComplete = hasAgendaSelection && hasTaskSelections && hasOvertimeSelections;
                                  
                                  // 모든 선택이 완료되었을 때만 updateContext 실행 (중복 방지)
                                  if (socket && roomId && allComplete && !isContextUpdating) {
                                    setIsContextUpdating(true);
                                    const currentSelections = {
                                      agenda_selections: newSelections.agenda_selections,
                                      task_selections: newSelections.task_selections,
                                      overtime_selections: newSelections.overtime_selections
                                    };
                                    
                                    updateContext(roomId, currentSelections);
                                    
                                    logGameProgress('컨텍스트 업데이트 요청', {
                                      agendaCount: Object.keys(currentSelections.agenda_selections).length,
                                      taskCount: Object.keys(currentSelections.task_selections).length,
                                      overtimeCount: Object.keys(currentSelections.overtime_selections).length,
                                      allComplete: true
                                    });
                                    
                                    // 바로 결과 화면으로 넘어가고 로딩 표시
                                    setResultLoading(true);
                                    setWorkspaceState('game_result');
                                  } else {
                                    logGameProgress('선택 미완료', {
                                      hasAgenda: !!newSelections.agenda_selections[profile?.id || ''],
                                      hasTask: !!(newSelections.task_selections[profile?.id || ''] && 
                                        newSelections.task_selections[profile?.id || ''].length > 0),
                                      hasOvertime: !!(newSelections.overtime_selections[profile?.id || ''] && 
                                        newSelections.overtime_selections[profile?.id || ''].length > 0)
                                    });
                                  }
                                  
                                  return newSelections;
                                });
                          }}
                        >
                          <span className="option-text">{option.text}</span>
                          <span className="option-summary">{option.impact_summary}</span>
                        </button>
                      ))}
                    </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ------------------------------------- */}
            {/* --- 상태 3: Explanation (설명 생성) --- */}
            {/* ------------------------------------- */}
            {workspaceState === 'explanation' && (() => {
              if (explanationLoading) {
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
                      borderTop: '3px solid #2196f3', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      marginRight: '15px'
                    }}></div>
                    설명을 생성하는 중...
                  </div>
                );
              }
              
              if (!explanationData) {
                return (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    설명 데이터를 불러오는 중...
                  </div>
                );
              }
              
              return (
                <div className="workspace-explanation">
                  <div className="explanation-header">
                    <h3>📖 게임 상황 설명</h3>
                    <p>현재까지의 게임 진행 상황에 대한 설명입니다.</p>
                  </div>
                  <div className="explanation-content">
                    <div style={{ 
                      padding: '20px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6',
                      fontSize: '16px'
                    }}>
                      {explanationData.explanation}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      className="next-step-button"
                      onClick={() => {
                        // 결과 계산 요청 (중복 방지)
                        if (socket && roomId && !isResultCalculating) {
                          setIsResultCalculating(true);
                          calculateResult(roomId);
                          setResultLoading(true);
                        }
                        setWorkspaceState('game_result');
                      }}
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      🏆 결과 확인하기
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ------------------------------------- */}
            {/* --- 상태 2.5: Work Result (업무 결과) --- */}
            {/* ------------------------------------- */}
            {workspaceState === 'work_result' && (() => {
              const playerKey = `player_${profile.id}`;
              const playerTasks = workData.task_list[profile.id] || [];
              const currentWork = playerTasks[workTaskIndex - 1]; // 완료된 마지막 업무
              const chosenOption = currentWork?.task_options?.find((o: any) => o.task_option_id === selectedOption);
              if (!chosenOption) {
                return (
                  <div className="workspace-work-result">
                    <div className="result-outcome-text">ERROR</div>
                    <div className="result-details-card">
                      <p className="result-message">선택한 옵션을 찾을 수 없습니다.</p>
                    </div>
                  </div>
                );
              }
              
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
              <button onClick={() => setWorkspaceState('explanation')}>Explanation</button>
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