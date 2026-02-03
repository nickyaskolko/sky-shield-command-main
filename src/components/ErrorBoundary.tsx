// Error Boundary – תופס שגיאות רינדור בילדים ומונע מסך לבן
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    if (typeof console !== 'undefined' && console.error) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-game-bg text-game-text p-4"
          dir="rtl"
          role="alert"
        >
          <div className="text-center max-w-md space-y-4">
            <h1 className="text-xl font-bold text-red-400">משהו השתבש</h1>
            <p className="text-game-text-dim text-sm">
              אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-game-accent text-game-panel font-medium"
            >
              נסה שוב
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="block w-full mt-2 px-4 py-2 rounded-lg border border-game-accent text-game-accent"
            >
              רענן דף
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
