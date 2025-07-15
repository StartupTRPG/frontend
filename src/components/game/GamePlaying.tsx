import React, { useState } from 'react';
import { GameProgressResponse, AgendaSelection, TaskSelection, OvertimeSelection } from '../../types/game';

interface GamePlayingProps {
  gameState: GameProgressResponse;
  selections: {
    agenda_selections: Record<string, AgendaSelection>;
    task_selections: Record<string, TaskSelection[]>;
    overtime_selections: Record<string, OvertimeSelection[]>;
  };
  setSelections: React.Dispatch<React.SetStateAction<{
    agenda_selections: Record<string, AgendaSelection>;
    task_selections: Record<string, TaskSelection[]>;
    overtime_selections: Record<string, OvertimeSelection[]>;
  }>>;
  onUpdateContext: () => void;
  roomId?: string;
  loading?: boolean;
}

const GamePlaying: React.FC<GamePlayingProps> = ({ 
  gameState, 
  selections, 
  setSelections, 
  onUpdateContext,
  roomId,
  loading = false
}) => {
  const [currentPlayer, setCurrentPlayer] = useState<string>('');

  const handleAgendaSelection = (playerId: string, agendaId: string, optionId: string) => {
    setSelections(prev => ({
      ...prev,
      agenda_selections: {
        ...prev.agenda_selections,
        [playerId]: {
          agenda_id: agendaId,
          selected_option_id: optionId
        }
      }
    }));
  };

  const handleTaskSelection = (playerId: string, taskId: string, optionId: string) => {
    setSelections(prev => {
      const currentTasks = prev.task_selections[playerId] || [];
      const existingIndex = currentTasks.findIndex(task => task.task_id === taskId);
      
      let newTasks;
      if (existingIndex >= 0) {
        newTasks = [...currentTasks];
        newTasks[existingIndex] = { task_id: taskId, selected_option_id: optionId };
      } else {
        newTasks = [...currentTasks, { task_id: taskId, selected_option_id: optionId }];
      }
      
      return {
        ...prev,
        task_selections: {
          ...prev.task_selections,
          [playerId]: newTasks
        }
      };
    });
  };

  const handleOvertimeSelection = (playerId: string, taskId: string, optionId: string) => {
    setSelections(prev => {
      const currentOvertimes = prev.overtime_selections[playerId] || [];
      const existingIndex = currentOvertimes.findIndex(overtime => overtime.task_id === taskId);
      
      let newOvertimes;
      if (existingIndex >= 0) {
        newOvertimes = [...currentOvertimes];
        newOvertimes[existingIndex] = { task_id: taskId, selected_option_id: optionId };
      } else {
        newOvertimes = [...currentOvertimes, { task_id: taskId, selected_option_id: optionId }];
      }
      
      return {
        ...prev,
        overtime_selections: {
          ...prev.overtime_selections,
          [playerId]: newOvertimes
        }
      };
    });
  };

  const isAllSelectionsComplete = () => {
    // 모든 플레이어가 아젠다, 태스크, 오버타임을 선택했는지 확인
    if (!gameState.player_context_list) return false;
    
    return gameState.player_context_list.every(player => {
      const playerId = player.player_id;
      const hasAgendaSelection = selections.agenda_selections[playerId];
      const hasTaskSelections = selections.task_selections[playerId] && 
        selections.task_selections[playerId].length > 0;
      const hasOvertimeSelections = selections.overtime_selections[playerId] && 
        selections.overtime_selections[playerId].length > 0;
      
      return hasAgendaSelection && hasTaskSelections && hasOvertimeSelections;
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>🎮 게임 진행 중</h2>
      
      {/* 플레이어 선택 UI */}
      <div style={{ marginBottom: '30px' }}>
        <h3>👥 플레이어 선택</h3>
        {gameState.player_context_list?.map((player, index) => (
          <div key={index} style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            backgroundColor: currentPlayer === player.player_id ? '#e3f2fd' : '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            cursor: 'pointer'
          }}
          onClick={() => setCurrentPlayer(player.player_id)}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
              {player.player_name} ({player.player_role})
            </h4>
            <div style={{ fontSize: '14px', color: '#666' }}>
              아젠다: {selections.agenda_selections[player.player_id] ? '✅' : '❌'} | 
              태스크: {selections.task_selections[player.player_id]?.length || 0}개 | 
              오버타임: {selections.overtime_selections[player.player_id]?.length || 0}개
            </div>
          </div>
        ))}
      </div>

      {/* 선택된 플레이어의 선택 UI */}
      {currentPlayer && (
        <div style={{ marginBottom: '30px' }}>
          <h3>📋 {gameState.player_context_list?.find(p => p.player_id === currentPlayer)?.player_name}의 선택</h3>
          
          {/* 아젠다 선택 */}
          {gameState.agenda_list && gameState.agenda_list.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>📋 아젠다 선택</h4>
              {gameState.agenda_list.map((agenda, index) => (
                <div key={index} style={{ marginBottom: '15px' }}>
                  <h5>{agenda.agenda_name}</h5>
                  <p style={{ fontSize: '14px', color: '#666' }}>{agenda.agenda_description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {agenda.agenda_options.map((option, optionIndex) => (
                      <label key={optionIndex} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: selections.agenda_selections[currentPlayer]?.selected_option_id === option.agenda_option_id ? '#e3f2fd' : '#fff'
                      }}>
                        <input
                          type="radio"
                          name={`agenda-${currentPlayer}`}
                          value={option.agenda_option_id}
                          checked={selections.agenda_selections[currentPlayer]?.selected_option_id === option.agenda_option_id}
                          onChange={() => handleAgendaSelection(currentPlayer, agenda.agenda_id, option.agenda_option_id)}
                          style={{ marginRight: '8px' }}
                        />
                        <div>
                          <div><strong>{option.agenda_option_text}</strong></div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{option.agenda_option_impact_summary}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 태스크 선택 */}
          {gameState.task_list && gameState.task_list[currentPlayer] && (
            <div style={{ marginBottom: '20px' }}>
              <h4>📋 태스크 선택</h4>
              {gameState.task_list[currentPlayer].map((task, index) => (
                <div key={index} style={{ marginBottom: '15px' }}>
                  <h5>{task.task_name}</h5>
                  <p style={{ fontSize: '14px', color: '#666' }}>{task.task_description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {task.task_options.map((option, optionIndex) => (
                      <label key={optionIndex} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: selections.task_selections[currentPlayer]?.find(t => t.task_id === task.task_id)?.selected_option_id === option.task_option_id ? '#e8f5e8' : '#fff'
                      }}>
                        <input
                          type="radio"
                          name={`task-${currentPlayer}-${task.task_id}`}
                          value={option.task_option_id}
                          checked={selections.task_selections[currentPlayer]?.find(t => t.task_id === task.task_id)?.selected_option_id === option.task_option_id}
                          onChange={() => handleTaskSelection(currentPlayer, task.task_id, option.task_option_id)}
                          style={{ marginRight: '8px' }}
                        />
                        <div>
                          <div><strong>{option.task_option_text}</strong></div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{option.task_option_impact_summary}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 오버타임 선택 */}
          {gameState.overtime_task_list && gameState.overtime_task_list[currentPlayer] && (
            <div style={{ marginBottom: '20px' }}>
              <h4>⏰ 오버타임 선택</h4>
              {gameState.overtime_task_list[currentPlayer].map((overtimeTask, index) => (
                <div key={index} style={{ marginBottom: '15px' }}>
                  <h5>{overtimeTask.overtime_task_name} ({overtimeTask.overtime_task_type})</h5>
                  <p style={{ fontSize: '14px', color: '#666' }}>{overtimeTask.overtime_task_description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {overtimeTask.overtime_task_options.map((option, optionIndex) => (
                      <label key={optionIndex} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: selections.overtime_selections[currentPlayer]?.find(o => o.task_id === overtimeTask.overtime_task_id)?.selected_option_id === option.overtime_task_option_id ? '#fff3e0' : '#fff'
                      }}>
                        <input
                          type="radio"
                          name={`overtime-${currentPlayer}-${overtimeTask.overtime_task_id}`}
                          value={option.overtime_task_option_id}
                          checked={selections.overtime_selections[currentPlayer]?.find(o => o.task_id === overtimeTask.overtime_task_id)?.selected_option_id === option.overtime_task_option_id}
                          onChange={() => handleOvertimeSelection(currentPlayer, overtimeTask.overtime_task_id, option.overtime_task_option_id)}
                          style={{ marginRight: '8px' }}
                        />
                        <div>
                          <div><strong>{option.overtime_task_option_text}</strong></div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{option.overtime_task_option_impact_summary}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 완료 버튼 */}
      <div style={{ textAlign: 'center' }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '12px 24px',
            fontSize: '16px',
            color: '#666'
          }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              border: '2px solid #f3f3f3', 
              borderTop: '2px solid #4CAF50', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              marginRight: '10px'
            }}></div>
            컨텍스트 업데이트 중...
          </div>
        ) : (
          <button 
            onClick={onUpdateContext}
            disabled={!isAllSelectionsComplete()}
            style={{
              backgroundColor: isAllSelectionsComplete() ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isAllSelectionsComplete() ? 'pointer' : 'not-allowed'
            }}
          >
            {isAllSelectionsComplete() ? '✅ 선택 완료' : '⏳ 모든 플레이어의 선택을 기다리는 중...'}
          </button>
        )}
      </div>
    </div>
  );
};

export default GamePlaying; 