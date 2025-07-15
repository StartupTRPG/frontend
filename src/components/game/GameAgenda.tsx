import React from 'react';
import { PlayerContext } from '../../types/game';

interface GameAgendaProps {
  onCreateAgenda: () => void;
  companyContext?: Record<string, string>;
  playerContextList?: PlayerContext[];
  currentTurn?: number;
  maxTurn?: number;
  roomId?: string;
  loading?: boolean;
}

const GameAgenda: React.FC<GameAgendaProps> = ({ onCreateAgenda, companyContext, playerContextList, currentTurn, maxTurn, roomId, loading = false }) => {
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>📋 아젠다 생성</h2>
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
      
      {companyContext && (
        <div style={{ marginBottom: '30px' }}>
          <h3>🏢 회사 컨텍스트</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px',
            border: '1px solid #bbdefb'
          }}>
            {Object.entries(companyContext).map(([key, value]) => (
              <div key={key} style={{ marginBottom: '10px' }}>
                <strong>{key}:</strong> {value}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {playerContextList && playerContextList.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3>👥 플레이어 컨텍스트</h3>
          {playerContextList.map((player, index) => (
            <div key={index} style={{ 
              marginBottom: '15px', 
              padding: '15px', 
              backgroundColor: '#f3e5f5', 
              borderRadius: '8px',
              border: '1px solid #e1bee7'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#7b1fa2' }}>
                {player.player_name} ({player.player_role})
              </h4>
              {Object.entries(player.player_context).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '5px', fontSize: '14px' }}>
                  <strong>{key}:</strong> {value}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '20px', fontSize: '16px', color: '#666' }}>
          컨텍스트를 바탕으로 회의 아젠다를 생성합니다.
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
              borderTop: '2px solid #28a745', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              marginRight: '10px'
            }}></div>
            아젠다 생성 중...
          </div>
        ) : (
          <button 
            onClick={onCreateAgenda}
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
            📋 아젠다 생성
          </button>
        )}
      </div>
    </div>
  );
};

export default GameAgenda; 