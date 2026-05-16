import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <div className="w-full max-w-lg border-2 border-[#ef4444] p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ef4444] mb-3">
              Error del sistema
            </div>
            <pre className="text-xs text-[#777] bg-[#0a0a0a] border border-[#222] p-3 overflow-auto max-h-48 mb-4">
              {this.state.error?.message ?? 'Error desconocido'}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
              className="text-xs font-bold uppercase tracking-widest bg-[#ecd987] text-black px-4 py-2 hover:bg-white transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
