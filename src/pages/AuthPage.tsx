import { useState } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface AuthPageProps {
  onSignIn: (email: string, password: string) => Promise<{ error: Error | null }>
  onSignUp: (email: string, password: string) => Promise<{ error: Error | null }>
}

export function AuthPage({ onSignIn, onSignUp }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const action = mode === 'login' ? onSignIn : onSignUp
    const result = await action(email, password)

    if (result.error) {
      setError(result.error.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 shadow-lg shadow-brand-500/25 transition-transform duration-300 hover:scale-110">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-100">All-In-Market</h1>
          <p className="mt-1 text-xs text-gray-500">Enterprise Intelligence Platform</p>
        </div>

        <div className="glass-card p-6">
          <div className="mb-5 flex rounded-lg bg-surface-800/50 p-0.5">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-surface-700 text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              Giris Yap
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-surface-700 text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              Kayit Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="E-posta"
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Sifre"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              required
            />
            <Button className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Giris Yap' : 'Kayit Ol'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-600">
          AES-256 ile korunan guvenli baglanti
        </p>
      </div>
    </div>
  )
}
