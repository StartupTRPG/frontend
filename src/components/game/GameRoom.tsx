import React, { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../stores/authStore';
import { GamePhase, Player, AgendaSelection, TaskSelection, OvertimeSelection, GameProgressResponse } from '../../types/game';
import GameContext from './GameContext';
import GameAgenda from './GameAgenda';
import GameTask from './GameTask';
import GameOvertime from './GameOvertime';
import GamePlaying from './GamePlaying';
import GameExplanation from './GameExplanation';
import GameResult from './GameResult';

interface GameRoomProps {
  roomId: string;
  token: string;
  players: Player[];
  shouldCreateGame?: boolean;
  onGameCreated?: () => void;
  // 로딩 상태 props
  gameLoading?: boolean;
  contextLoading?: boolean;
  agendaLoading?: boolean;
  workLoading?: boolean;
  overtimeLoading?: boolean;
  resultLoading?: boolean;
  prologueLoading?: boolean;
  jobsLoading?: boolean;
}

export const GameRoom: React.FC<GameRoomProps> = ({ 
  roomId, 
  token, 
  players, 
  shouldCreateGame = false, 
  onGameCreated,
  gameLoading = false,
  contextLoading = false,
  agendaLoading = false,
  workLoading = false,
  overtimeLoading = false,
  resultLoading = false,
  prologueLoading = false,
  jobsLoading = false
}) => {
  const [gameState, setGameState] = useState<GameProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    isConnected,
    createGame,
    createContext,
    createAgenda,
    createTask,
    createOvertime,
    updateContext,
    createExplanation,
    calculateResult,
    getGameProgress,
  } = useSocket({
    token,
    onGameStateChange: (newGameState) => {
      setGameState(newGameState);
      setError(null);
    },
    onError: (errorMessage) => {
      setError(errorMessage);
    }
  });

  const [selections, setSelections] = useState<{
    agenda_selections: Record<string, AgendaSelection>;
    task_selections: Record<string, TaskSelection[]>;
    overtime_selections: Record<string, OvertimeSelection[]>;
  }>({
    agenda_selections: {},
    task_selections: {},
    overtime_selections: {}
  });

  useEffect(() => {
    // 컴포넌트 마운트 시 게임 진행 상황 조회
    getGameProgress(roomId);
    
    // 게임이 진행 중일 때 주기적으로 상태 업데이트 (5초마다)
    const interval = setInterval(() => {
      if (gameState && gameState.phase !== 'waiting' && gameState.phase !== 'finished') {
        getGameProgress(roomId);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [roomId, getGameProgress, gameState]);

  useEffect(() => {
    if (error) {
      console.error('게임 에러:', error);
    }
  }, [error]);

  // 게임 상태가 없고 에러가 "게임 상태를 찾을 수 없습니다"인 경우 자동으로 게임 생성
  useEffect(() => {
    if (!gameState && error === "게임 상태를 찾을 수 없습니다.") {
      createGame(roomId, players);
    }
  }, [gameState, error, roomId, players, createGame]);

  // shouldCreateGame이 true로 변경되면 게임 생성
  useEffect(() => {
    if (shouldCreateGame && !gameState) {
      createGame(roomId, players);
      onGameCreated?.(); // 게임 생성 완료 콜백 호출
    }
  }, [shouldCreateGame, gameState, roomId, players, createGame, onGameCreated]);

  if (!isConnected) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        fontSize: '18px',
        color: '#666'
      }}>
        게임 서버에 연결 중...
      </div>
    );
  }

  if (!gameState) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        fontSize: '18px',
        color: '#666'
      }}>
        {error === "게임 상태를 찾을 수 없습니다." ? "게임을 생성하는 중..." : "게임 상태를 불러오는 중..."}
      </div>
    );
  }

  const handleCreateGame = () => {
    createGame(roomId, players);
  };

  const handleCreateContext = () => {
    if (gameState?.story) {
      createContext(roomId, 10, gameState.story);
    } else {
      setError('스토리가 없습니다. 게임을 먼저 생성해주세요.');
    }
  };

  const handleCreateAgenda = () => {
    createAgenda(roomId);
  };

  const handleCreateTask = () => {
    createTask(roomId);
  };

  const handleCreateOvertime = () => {
    createOvertime(roomId);
  };

  const handleUpdateContext = () => {
    updateContext(roomId, selections);
  };

  const handleCreateExplanation = () => {
    createExplanation(roomId);
  };

  const handleCalculateResult = () => {
    calculateResult(roomId);
  };

  const handleGetGameProgress = () => {
    getGameProgress(roomId);
  };

  const clearError = () => {
    setError(null);
  };

  const renderPhaseContent = () => {
    switch (gameState.phase) {
      case 'waiting':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>게임 시작 준비</h2>
            <p>모든 플레이어가 준비되면 게임을 시작할 수 있습니다.</p>
            <button 
              onClick={handleCreateGame}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🎮 게임 시작
            </button>
          </div>
        );

      case 'context_creation':
        return (
          <GameContext 
            onCreateContext={handleCreateContext}
            story={gameState.story}
            currentTurn={gameState.current_turn}
            maxTurn={gameState.max_turn}
            roomId={roomId}
            loading={contextLoading}
          />
        );

      case 'agenda_creation':
        return (
          <GameAgenda 
            onCreateAgenda={handleCreateAgenda}
            companyContext={gameState.company_context}
            playerContextList={gameState.player_context_list}
            currentTurn={gameState.current_turn}
            maxTurn={gameState.max_turn}
            roomId={roomId}
            loading={agendaLoading}
          />
        );

      case 'task_creation':
        return (
          <GameTask 
            onCreateTask={handleCreateTask}
            agendaList={gameState.agenda_list}
            currentTurn={gameState.current_turn}
            maxTurn={gameState.max_turn}
            roomId={roomId}
            loading={workLoading}
          />
        );

      case 'overtime_creation':
        return (
          <GameOvertime 
            onCreateOvertime={handleCreateOvertime}
            taskList={gameState.task_list}
            currentTurn={gameState.current_turn}
            maxTurn={gameState.max_turn}
            roomId={roomId}
            loading={overtimeLoading}
          />
        );

      case 'playing':
        return (
          <GamePlaying 
            gameState={gameState}
            selections={selections}
            setSelections={setSelections}
            onUpdateContext={handleUpdateContext}
            roomId={roomId}
            loading={gameLoading}
          />
        );

      case 'explanation':
        return (
          <GameExplanation 
            onCreateExplanation={handleCreateExplanation}
            companyContext={gameState.company_context}
            playerContextList={gameState.player_context_list}
            currentTurn={gameState.current_turn}
            maxTurn={gameState.max_turn}
            roomId={roomId}
            loading={resultLoading}
          />
        );

      case 'result':
        return (
          <GameResult 
            onCalculateResult={handleCalculateResult}
            explanation={gameState.explanation}
            currentTurn={gameState.current_turn}
            maxTurn={gameState.max_turn}
            roomId={roomId}
            loading={resultLoading}
          />
        );

      case 'finished':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>🎉 게임 완료!</h2>
            {gameState.game_result && (
              <div style={{ marginBottom: '20px' }}>
                <h3>게임 결과</h3>
                <p>성공: {gameState.game_result.success ? '✅ 성공' : '❌ 실패'}</p>
                <p>{gameState.game_result.summary}</p>
              </div>
            )}
            {gameState.player_rankings && gameState.player_rankings.length > 0 && (
              <div>
                <h3>🏆 플레이어 랭킹</h3>
                {gameState.player_rankings.map((ranking, index) => (
                  <div key={index} style={{ 
                    margin: '10px 0', 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '8px',
                    backgroundColor: index === 0 ? '#fff3cd' : '#f8f9fa'
                  }}>
                    <strong>{ranking.rank}위: {ranking.player_name}</strong> ({ranking.player_role})
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                      {ranking.player_evaluation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>알 수 없는 게임 단계</h2>
            <p>현재 단계: {gameState.phase}</p>
          </div>
        );
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 게임 상태 표시 */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#495057' }}>
            {getPhaseDisplayName(gameState.phase)}
          </h3>
          {gameState.current_turn && gameState.max_turn && (
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
              턴: {gameState.current_turn} / {gameState.max_turn}
            </p>
          )}
        </div>
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '20px',
          fontSize: '14px',
          color: '#495057'
        }}>
          {isConnected ? '🟢 연결됨' : '🔴 연결 끊김'}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          margin: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={clearError}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#721c24', 
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* 게임 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {renderPhaseContent()}
      </div>
    </div>
  );
};

// 게임 단계별 표시 이름
const getPhaseDisplayName = (phase: GamePhase): string => {
  switch (phase) {
    case 'waiting': return '⏳ 게임 시작 대기';
    case 'context_creation': return '📝 컨텍스트 생성';
    case 'agenda_creation': return '📋 아젠다 생성';
    case 'task_creation': return '📋 태스크 생성';
    case 'overtime_creation': return '⏰ 오버타임 생성';
    case 'playing': return '🎮 게임 진행 중';
    case 'explanation': return '📖 설명 생성';
    case 'result': return '📊 결과 계산';
    case 'finished': return '🏁 게임 완료';
    default: return '❓ 알 수 없음';
  }
};

export default GameRoom; 