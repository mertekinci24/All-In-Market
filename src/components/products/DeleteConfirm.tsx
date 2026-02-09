import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface DeleteConfirmProps {
  open: boolean
  productName: string
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export function DeleteConfirm({ open, productName, onClose, onConfirm, loading }: DeleteConfirmProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-slide-up rounded-xl border border-white/5 bg-surface-900 p-5 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-500/10 text-danger-400 mb-3">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-gray-100">Urunu Sil</h3>
          <p className="mt-1 text-xs text-gray-400">
            <span className="font-medium text-gray-300">{productName}</span> urununu silmek istediginizden emin misiniz?
          </p>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Iptal
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? 'Siliniyor...' : 'Sil'}
          </Button>
        </div>
      </div>
    </div>
  )
}
