'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    if (typeof window !== 'undefined' && 'Sentry' in window && typeof (window as { Sentry?: { captureException: (error: Error, context: { contexts: { react: React.ErrorInfo } }) => void } }).Sentry?.captureException === 'function') {
      (window as { Sentry: { captureException: (error: Error, context: { contexts: { react: React.ErrorInfo } }) => void } }).Sentry.captureException(error, {
        contexts: { react: errorInfo },
      });
    }
    
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="heading-display text-2xl mb-2">Something went wrong</h1>
            <p className="ui-caption mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                variant="outline"
              >
                Go Home
              </Button>
              <Button
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

