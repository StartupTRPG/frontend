import React from 'react';
import { Agenda } from '../../types/game';

interface GameTaskProps {
  onCreateTask: () => void;
  agendaList?: Agenda[];
  currentTurn?: number;
  maxTurn?: number;
  roomId?: string;
  loading?: boolean;
}

const GameTask: React.FC<GameTaskProps> = ({ onCreateTask, agendaList, currentTurn, maxTurn, roomId, loading = false }) => {
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>📋 태스크 생성</h2>
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
      
      {agendaList && agendaList.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3>📋 아젠다 목록</h3>
          {agendaList.map((agenda, index) => (
            <div key={index} style={{ 
              marginBottom: '20px', 
              padding: '15px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '8px',
              border: '1px solid #ffcc02'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#e65100' }}>
                {agenda.agenda_name}
              </h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
                {agenda.agenda_description}
              </p>
              {agenda.agenda_options && agenda.agenda_options.length > 0 && (
                <div>
                  <strong>옵션:</strong>
                  {agenda.agenda_options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{ 
                      margin: '5px 0', 
                      padding: '8px', 
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      <div><strong>{option.agenda_option_text}</strong></div>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        {option.agenda_option_impact_summary}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '20px', fontSize: '16px', color: '#666' }}>
          아젠다를 바탕으로 각 플레이어의 태스크를 생성합니다.
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
              borderTop: '2px solid #ff9800', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              marginRight: '10px'
            }}></div>
            태스크 생성 중...
          </div>
        ) : (
          <button 
            onClick={onCreateTask}
            style={{
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📋 태스크 생성
          </button>
        )}
      </div>
    </div>
  );
};

export default GameTask; 