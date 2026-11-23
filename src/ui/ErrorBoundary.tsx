import { Component, type ReactNode } from 'react';
import { clearSaved } from './persist';

/** Catches render errors (e.g. incompatible saved settings) and offers a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app">
        <section className="card" role="alert">
          <h1>Something went wrong</h1>
          <p>The planner hit an error, possibly because of settings saved by an older version.</p>
          <p className="hint">{this.state.error.message}</p>
          <button
            className="primary-btn"
            onClick={() => {
              clearSaved();
              window.location.replace(window.location.pathname);
            }}
          >
            Reset saved settings and reload
          </button>
        </section>
      </div>
    );
  }
}
