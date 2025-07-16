import React from 'react';
import { PlayerContext } from '../../types/game';

interface GameExplanationProps {
  onCreateExplanation: () => void;
  companyContext?: Record<string, string>;
  playerContextList?: PlayerContext[];
  currentTurn?: number;
  maxTurn?: number;
  roomId?: string;
  loading?: boolean;
}

const GameExplanation: React.FC<GameExplanationProps> = ({ 
  onCreateExplanation, 
  companyContext, 
  playerContextList,
  currentTurn,
  maxTurn,
  roomId,
  loading = false
}) => {
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>📖 설명 생성</h2>
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
          <h3>🏢 업데이트된 회사 컨텍스트</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '8px',
            border: '1px solid #4caf50'
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
          <h3>👥 업데이트된 플레이어 컨텍스트</h3>
          {playerContextList.map((player, index) => (
            <div key={index} style={{ 
              marginBottom: '15px', 
              padding: '15px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '8px',
              border: '1px solid #ff9800'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#e65100' }}>
                {player.name} ({player.role})
              </h4>
              {Object.entries(player.context).map(([key, value]) => (
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
          업데이트된 컨텍스트를 바탕으로 게임 결과에 대한 설명을 생성합니다.
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
              borderTop: '2px solid #2196f3', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              marginRight: '10px'
            }}></div>
            설명 생성 중...
          </div>
        ) : (
          <button 
            onClick={onCreateExplanation}
            style={{
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📖 설명 생성
          </button>
        )}
      </div>
    </div>
  );
};

export default GameExplanation; 