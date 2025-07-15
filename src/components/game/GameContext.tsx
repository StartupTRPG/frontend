import React from 'react';

interface GameContextProps {
  onCreateContext: () => void;
  story?: string;
  currentTurn?: number;
  maxTurn?: number;
  roomId?: string;
}

const GameContext: React.FC<GameContextProps> = ({ onCreateContext, story, currentTurn, maxTurn, roomId }) => {
  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>📝 컨텍스트 생성</h2>
      {currentTurn && maxTurn && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '8px 16px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '20px',
          fontSize: '14px',
          color: '#1976d2'
        }}>
          턴: {currentTurn} / {maxTurn}
        </div>
      )}
      
      {story && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          textAlign: 'left'
        }}>
          <h3>📖 스토리</h3>
          <p style={{ lineHeight: '1.6', fontSize: '16px' }}>{story}</p>
        </div>
      )}
      
      <p style={{ marginBottom: '30px', fontSize: '16px', color: '#666' }}>
        스토리를 바탕으로 회사와 플레이어들의 컨텍스트를 생성합니다.
      </p>
      
      <button 
        onClick={onCreateContext}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        🔄 컨텍스트 생성
      </button>
    </div>
  );
};

export default GameContext; 