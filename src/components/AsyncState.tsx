import { Component } from 'react';
import type { ReactNode } from 'react';
export function LoadingState() { return <div className="state-card" role="status"><span className="spinner" aria-hidden="true" /><h2>Opening this section</h2><p>Loading the interface. No photo is being processed.</p></div>; }
export class SectionBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  // Deliberately no error logging: errors may eventually contain photo-derived data.
  render() { return this.state.failed ? <div className="state-card" role="alert"><h2>This section couldn’t open</h2><p>The interface encountered an error. Reload to try again.</p><button className="button" onClick={() => window.location.reload()}>Reload FaceFrame</button></div> : this.props.children; }
}
