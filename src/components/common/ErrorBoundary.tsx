import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #f44336',
          borderRadius: '8px',
          backgroundColor: '#ffebee',
          color: '#c62828'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#c62828' }}>
            🚨 오류가 발생했습니다
          </h2>
          <p style={{ margin: '0 0 15px 0' }}>
            페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
          </p>
          {this.state.error && (
            <details style={{ marginBottom: '15px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                오류 상세 정보
              </summary>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                marginTop: '10px'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    <br />
                    <br />
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#c62828',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            페이지 새로고침
          </button>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            style={{
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 