import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'sans-serif', color: '#666' }}>
          <p style={{ fontSize: 16, fontWeight: 600 }}>오류가 발생했습니다</p>
          <p style={{ fontSize: 13, color: '#999' }}>{this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: 8, padding: '8px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
