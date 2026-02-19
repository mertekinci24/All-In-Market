import { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react'
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    message: string
    duration: number
}

interface ToastContextValue {
    addToast: (type: ToastType, message: string, duration?: number) => void
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}

/* ------------------------------------------------------------------ */
/*  Provider + Container                                               */
/* ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const counterRef = useRef(0)

    const addToast = useCallback((type: ToastType, message: string, duration = 3500) => {
        const id = `toast-${++counterRef.current}`
        setToasts((prev) => [...prev, { id, type, message, duration }])
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2" aria-live="polite">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

/* ------------------------------------------------------------------ */
/*  Toast Item                                                         */
/* ------------------------------------------------------------------ */

const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
}

const COLORS = {
    success: 'border-success-500/20 bg-success-500/5 text-success-400',
    error: 'border-danger-500/20 bg-danger-500/5 text-danger-400',
    warning: 'border-warning-500/20 bg-warning-500/5 text-warning-400',
    info: 'border-brand-500/20 bg-brand-500/5 text-brand-400',
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const [exiting, setExiting] = useState(false)
    const Icon = ICONS[toast.type]

    useEffect(() => {
        const exitTimer = setTimeout(() => setExiting(true), toast.duration - 300)
        const removeTimer = setTimeout(onClose, toast.duration)
        return () => { clearTimeout(exitTimer); clearTimeout(removeTimer) }
    }, [toast.duration, onClose])

    return (
        <div
            className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-xl backdrop-blur-md transition-all duration-300 ${COLORS[toast.type]} ${exiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100 animate-slide-in-right'
                }`}
            style={{ minWidth: 240, maxWidth: 380 }}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-sm text-gray-200 flex-1">{toast.message}</span>
            <button
                onClick={onClose}
                className="flex h-5 w-5 items-center justify-center rounded text-gray-500 transition-colors hover:text-gray-300"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    )
}
