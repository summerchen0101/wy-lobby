import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Keeps session chrome (header/footer) when a session route throws during render.
 * Without this, a single page error can unmount the whole SPA and leave only the body background.
 */
export class SessionRouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[session-route] render error", error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="session-route-error page-container" role="alert">
        <h2 className="session-route-error__title">Something went wrong</h2>
        <p className="session-route-error__message">
          This page could not be displayed. You can try again or refresh the
          page.
        </p>
        <div className="session-route-error__actions">
          <button
            type="button"
            className="session-route-error__btn"
            onClick={this.handleRetry}>
            Try again
          </button>
          <button
            type="button"
            className="session-route-error__btn session-route-error__btn--ghost"
            onClick={this.handleReload}>
            Refresh page
          </button>
        </div>
      </div>
    );
  }
}
