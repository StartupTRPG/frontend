import React from 'react';

interface GameResultProps {
  onCalculateResult: () => void;
  explanation?: string;
  currentTurn?: number;
  maxTurn?: number;
  roomId?: string;
}

const GameResult: React.FC<GameResultProps> = ({ onCalculateResult, explanation, currentTurn, maxTurn, roomId }) => {
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>📊 결과 계산</h2>
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
      
      {explanation && (
        <div style={{ marginBottom: '30px' }}>
          <h3>📖 게임 설명</h3>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f3e5f5', 
            borderRadius: '8px',
            border: '1px solid #9c27b0',
            lineHeight: '1.6',
            fontSize: '16px'
          }}>
            {explanation}
          </div>
        </div>
      )}
      
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '20px', fontSize: '16px', color: '#666' }}>
          게임 설명을 바탕으로 최종 결과와 플레이어 랭킹을 계산합니다.
        </p>
        
        <button 
          onClick={onCalculateResult}
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📊 결과 계산
        </button>
      </div>
    </div>
  );
};

export default GameResult; 