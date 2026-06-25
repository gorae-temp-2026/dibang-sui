import { Component, type ErrorInfo, type ReactNode } from 'react'
import { devLogger } from '../lib/devLogger'
import { translate, useLangStore } from '../lib/i18n'

const lang = () => useLangStore.getState().lang

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class DevErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    devLogger.log('error', 'react_error_boundary', {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: info.componentStack?.slice(0, 500),
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex h-screen items-center justify-center bg-[#0A1626] text-white">
          <div className="text-center">
            <p className="text-lg font-bold">{translate(lang(), 'common.errorOccurred')}</p>
            <p className="mt-2 text-sm text-white/60">{this.state.error?.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm"
            >
              {translate(lang(), 'common.retry')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
