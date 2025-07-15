import React from 'react';
import { Task, OvertimeTask } from '../../types/game';

interface GameOvertimeProps {
  onCreateOvertime: () => void;
  taskList?: Record<string, Task[]>;
  currentTurn?: number;
  maxTurn?: number;
  roomId?: string;
  loading?: boolean;
}

const GameOvertime: React.FC<GameOvertimeProps> = ({ onCreateOvertime, taskList, currentTurn, maxTurn, roomId, loading = false }) => {
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>⏰ 오버타임 생성</h2>
      {currentTurn && maxTurn && (
        <div style={{ 
          textAlign: 'center',
          marginBottom: '20px', 
          padding: '8px 16px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '20px',
          fontSize: '14px',
          color: '#1976d2',
          display: 'inline-block'
        }}>
          턴: {currentTurn} / {maxTurn}
        </div>
      )}
      
      {taskList && Object.keys(taskList).length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3>📋 태스크 목록</h3>
          {Object.entries(taskList).map(([playerId, tasks]) => (
            <div key={playerId} style={{ 
              marginBottom: '20px', 
              padding: '15px', 
              backgroundColor: '#f1f8e9', 
              borderRadius: '8px',
              border: '1px solid #8bc34a'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#33691e' }}>
                플레이어 {playerId}의 태스크
              </h4>
              {tasks.map((task, index) => (
                <div key={index} style={{ 
                  marginBottom: '15px', 
                  padding: '10px', 
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>
                    {task.task_name}
                  </h5>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
                    {task.task_description}
                  </p>
                  {task.task_options && task.task_options.length > 0 && (
                    <div>
                      <strong>옵션:</strong>
                      {task.task_options.map((option, optionIndex) => (
                        <div key={optionIndex} style={{ 
                          margin: '5px 0', 
                          padding: '6px', 
                          backgroundColor: '#f9f9f9',
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}>
                          <div><strong>{option.task_option_text}</strong></div>
                          <div style={{ color: '#666', fontSize: '11px' }}>
                            {option.task_option_impact_summary}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '20px', fontSize: '16px', color: '#666' }}>
          태스크를 바탕으로 오버타임 옵션을 생성합니다.
        </p>
        
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
              borderTop: '2px solid #9c27b0', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              marginRight: '10px'
            }}></div>
            오버타임 생성 중...
          </div>
        ) : (
          <button 
            onClick={onCreateOvertime}
            style={{
              backgroundColor: '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ⏰ 오버타임 생성
          </button>
        )}
      </div>
    </div>
  );
};

export default GameOvertime; 