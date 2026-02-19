import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
    children: React.ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-danger-500/10 bg-danger-500/5 p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-500/10">
                        <AlertTriangle className="h-5 w-5 text-danger-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-200">Bir hata oluştu</h3>
                    <p className="max-w-sm text-center text-xs text-gray-500">
                        {this.state.error?.message || 'Beklenmeyen bir hata meydana geldi.'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="mt-1 flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Tekrar Dene
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
