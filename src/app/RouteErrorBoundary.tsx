import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; message: string; reloadLabel: string }

type State = { hasError: boolean }

/**
 * Rattrape les erreurs de rendu / import dynamique (chunk lazy) pour éviter un écran blanc.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // Utile en local ; en prod, brancher ici un service de monitoring si besoin.
      console.error(error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="dash-route-fallback dash-route-fallback--error" role="alert">
          <p>{this.props.message}</p>
          <button type="button" className="dash-btn" onClick={() => window.location.reload()}>
            {this.props.reloadLabel}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
