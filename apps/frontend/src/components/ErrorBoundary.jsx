import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-main, #0f172a)',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              background: 'var(--color-bg-surface, #ffffff)',
              border: '1px solid var(--color-border, #e2e8f0)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Something went wrong loading this view
            </h2>
            <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred. Please refresh or return to the dashboard.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Reload Page
              </button>
              <a
                href="/dashboard"
                className="btn btn-outline"
                style={{ padding: '0.6rem 1.25rem', textDecoration: 'none' }}
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
