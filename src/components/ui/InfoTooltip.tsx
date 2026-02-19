import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
    text: string
    position?: 'top' | 'bottom' | 'left' | 'right'
    maxWidth?: number
}

export function InfoTooltip({ text, position = 'top', maxWidth = 240 }: InfoTooltipProps) {
    const [visible, setVisible] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    function show() {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setVisible(true)
    }

    function hide() {
        timeoutRef.current = setTimeout(() => setVisible(false), 150)
    }

    const posClass: Record<string, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    }

    return (
        <div
            ref={ref}
            className="relative inline-flex items-center"
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            <button
                type="button"
                tabIndex={0}
                className="flex h-4 w-4 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-brand-400 hover:bg-brand-500/10 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                aria-label={text}
            >
                <Info className="h-3 w-3" />
            </button>
            {visible && (
                <div
                    role="tooltip"
                    className={`absolute z-50 ${posClass[position]} animate-fade-in pointer-events-none`}
                    style={{ maxWidth }}
                >
                    <div className="rounded-lg border border-white/10 bg-surface-900 px-3 py-2 text-[11px] leading-relaxed text-gray-300 shadow-xl">
                        {text}
                    </div>
                </div>
            )}
        </div>
    )
}
