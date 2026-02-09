import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  onSignOut: () => void
}

export function AppLayout({ onSignOut }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar onSignOut={onSignOut} />
      <main className="ml-60">
        <Outlet />
      </main>
    </div>
  )
}
