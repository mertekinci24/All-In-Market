import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Calculator,
  TrendingUp,
  Settings,
  LogOut,
  BarChart3,
  Brain,
  Loader2,
  Pickaxe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Urunler', href: '/products', icon: Package },
  { label: 'Siparisler', href: '/orders', icon: ShoppingCart },
  { label: 'Kar Hesapla', href: '/calculator', icon: Calculator },
  { label: 'Urun Madenciligi', href: '/research', icon: Pickaxe },
  { label: 'Analiz', href: '/analytics', icon: BarChart3 },
  { label: 'Fiyat Takibi', href: '/tracking', icon: TrendingUp },
  { label: 'AI Senaryo', href: '/ai-scenario', icon: Brain },
  { label: 'Ayarlar', href: '/settings', icon: Settings },
]

interface SidebarProps {
  onSignOut: () => void
}

export function Sidebar({ onSignOut }: SidebarProps) {
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)

  function handleSignOut() {
    setSigningOut(true)
    onSignOut()
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-white/5 bg-surface-900/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2.5 border-b border-white/5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 shadow-md shadow-brand-500/20 transition-transform duration-200 hover:scale-105">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-gray-100">All-In-Market</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                isActive
                  ? 'bg-brand-500/10 text-brand-400 font-medium shadow-sm shadow-brand-500/5'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-brand-500 animate-scale-in" />
              )}
              <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isActive && 'scale-110')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-all duration-200 hover:bg-white/[0.04] hover:text-gray-300 disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {signingOut ? 'Cikis yapiliyor...' : 'Cikis Yap'}
        </button>
      </div>
    </aside>
  )
}
