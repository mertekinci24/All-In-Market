import { useState, useMemo } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  Plus, Search, Pencil, Trash2, ArrowUpDown,
  ChevronLeft, ChevronRight, ChevronDown, X, SlidersHorizontal, Package,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProductModal } from '@/components/products/ProductModal'
import { DeleteConfirm } from '@/components/products/DeleteConfirm'
import { cn } from '@/lib/utils'
import type { ProductWithProfit } from '@/hooks/useProducts'
import type { ProductFormData } from '@/components/products/ProductModal'
import type { Database } from '@/types/database'

type ProductRow = Database['public']['Tables']['products']['Row']

interface ProductsPageProps {
  products: ProductWithProfit[]
  loading: boolean
  storeId: string
  onAdd: (p: Omit<Database['public']['Tables']['products']['Insert'], 'store_id'>) => Promise<unknown>
  onUpdate: (id: string, p: Database['public']['Tables']['products']['Update']) => Promise<unknown>
  onDelete: (id: string) => Promise<boolean>
  onRefetch: () => void
}

type SortField = 'name' | 'buy_price' | 'sales_price' | 'netProfit' | 'margin' | 'category'
type SortDir = 'asc' | 'desc'
type StockFilter = 'all' | 'InStock' | 'Low' | 'OutOfStock'
type ProfitFilter = 'all' | 'profitable' | 'loss'

const PAGE_SIZE = 15

export function ProductsPage({ products, loading, onAdd, onUpdate, onDelete }: ProductsPageProps) {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductWithProfit | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [profitFilter, setProfitFilter] = useState<ProfitFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => { if (p.category) cats.add(p.category) })
    return Array.from(cats).sort()
  }, [products])
  const [categoryFilter, setCategoryFilter] = useState('')

  const filtered = useMemo(() => {
    let result = [...products]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q) ||
          (p.external_id ?? '').toLowerCase().includes(q)
      )
    }

    if (stockFilter !== 'all') {
      result = result.filter((p) => p.stock_status === stockFilter)
    }

    if (profitFilter === 'profitable') {
      result = result.filter((p) => p.profit.netProfit >= 0)
    } else if (profitFilter === 'loss') {
      result = result.filter((p) => p.profit.netProfit < 0)
    }

    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'tr')
          break
        case 'buy_price':
          cmp = a.buy_price - b.buy_price
          break
        case 'sales_price':
          cmp = (a.sales_price ?? 0) - (b.sales_price ?? 0)
          break
        case 'netProfit':
          cmp = a.profit.netProfit - b.profit.netProfit
          break
        case 'margin':
          cmp = a.profit.margin - b.profit.margin
          break
        case 'category':
          cmp = (a.category ?? '').localeCompare(b.category ?? '', 'tr')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [products, search, stockFilter, profitFilter, categoryFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageProducts = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const activeFilterCount = [stockFilter !== 'all', profitFilter !== 'all', !!categoryFilter].filter(Boolean).length

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(0)
  }

  function clearFilters() {
    setStockFilter('all')
    setProfitFilter('all')
    setCategoryFilter('')
    setPage(0)
  }

  const handleSave = async (data: ProductFormData) => {
    const payload = {
      name: data.name,
      external_id: data.external_id || null,
      sales_price: data.sales_price,
      buy_price: data.buy_price,
      commission_rate: data.commission_rate,
      vat_rate: data.vat_rate,
      desi: data.desi,
      shipping_cost: data.shipping_cost,
      extra_cost: data.extra_cost,
      ad_cost: data.ad_cost,
      stock_status: data.stock_status,
      category: data.category || null,
      marketplace_url: data.marketplace_url || null,
    }
    if (editProduct) {
      const result = await onUpdate(editProduct.id, payload)
      if (result) toast.addToast('success', 'Ürün güncellendi')
      else toast.addToast('error', 'Ürün güncellenirken hata oluştu')
    } else {
      const result = await onAdd(payload)
      if (result) toast.addToast('success', 'Yeni ürün eklendi')
      else toast.addToast('error', 'Ürün eklenirken hata oluştu')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const success = await onDelete(deleteTarget.id)
    if (success) toast.addToast('success', 'Ürün silindi')
    else toast.addToast('error', 'Ürün silinirken hata oluştu')
    setDeleting(false)
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <Header title="Urunler" subtitle="Urun yonetimi ve karlilik takibi" />
      <div className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Urun, kategori veya kod ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="h-9 w-80 rounded-lg border border-white/5 bg-surface-800/50 pl-9 pr-8 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters || activeFilterCount > 0 ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtrele
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button size="sm" onClick={() => { setEditProduct(null); setModalOpen(true) }}>
              <Plus className="h-3.5 w-3.5" />
              Urun Ekle
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="animate-slide-up !p-3">
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                label="Stok Durumu"
                value={stockFilter}
                onChange={(v) => { setStockFilter(v as StockFilter); setPage(0) }}
                options={[
                  { value: 'all', label: 'Tumu' },
                  { value: 'InStock', label: 'Stokta' },
                  { value: 'Low', label: 'Az' },
                  { value: 'OutOfStock', label: 'Tukendi' },
                ]}
              />
              <FilterSelect
                label="Karlilik"
                value={profitFilter}
                onChange={(v) => { setProfitFilter(v as ProfitFilter); setPage(0) }}
                options={[
                  { value: 'all', label: 'Tumu' },
                  { value: 'profitable', label: 'Karli' },
                  { value: 'loss', label: 'Zararda' },
                ]}
              />
              {categories.length > 0 && (
                <FilterSelect
                  label="Kategori"
                  value={categoryFilter}
                  onChange={(v) => { setCategoryFilter(v); setPage(0) }}
                  options={[
                    { value: '', label: 'Tumu' },
                    ...categories.map((c) => ({ value: c, label: c })),
                  ]}
                />
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                  Temizle
                </button>
              )}
              <div className="ml-auto text-xs text-gray-500">
                {filtered.length} / {products.length} urun
              </div>
            </div>
          </Card>
        )}

        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 animate-scale-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-4">
              <Package className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-400">
              {products.length === 0 ? 'Henuz urun eklenmedi' : 'Filtreyle eslesen urun bulunamadi'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {products.length === 0 ? 'Ilk urununu ekleyerek basla' : 'Farkli filtre kriterleri deneyin'}
            </p>
            {products.length === 0 && (
              <Button size="sm" className="mt-4" onClick={() => { setEditProduct(null); setModalOpen(true) }}>
                <Plus className="h-3.5 w-3.5" />
                Ilk Urununu Ekle
              </Button>
            )}
          </Card>
        ) : (
          <Card className="overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/5 bg-surface-800/30">
                    <SortHeader label="Urun" field="name" current={sortField} dir={sortDir} onSort={toggleSort} align="left" />
                    <SortHeader label="Kategori" field="category" current={sortField} dir={sortDir} onSort={toggleSort} align="left" />
                    <SortHeader label="Alis" field="buy_price" current={sortField} dir={sortDir} onSort={toggleSort} align="right" />
                    <SortHeader label="Satis" field="sales_price" current={sortField} dir={sortDir} onSort={toggleSort} align="right" />
                    <SortHeader label="Net Kar" field="netProfit" current={sortField} dir={sortDir} onSort={toggleSort} align="right" />
                    <SortHeader label="Marj" field="margin" current={sortField} dir={sortDir} onSort={toggleSort} align="right" />
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {pageProducts.map((product) => {
                    const isProfitable = product.profit.netProfit >= 0
                    return (
                      <tr
                        key={product.id}
                        className="transition-colors hover:bg-white/[0.02] group"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-200 truncate max-w-[200px]">{product.name}</p>
                          {product.external_id && (
                            <p className="text-[11px] text-gray-600 mt-0.5">{product.external_id}</p>
                          )}
                          {product.commissionResolution?.isCampaignActive && (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-success-500/10 border border-success-500/20 px-1.5 py-0.5 text-[10px] font-medium text-success-400">
                              ⚡ {product.commissionResolution.campaignName || 'Kampanya'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="neutral">{product.category || 'Diger'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-400 tabular-nums">
                          {product.buy_price.toLocaleString('tr-TR')} TL
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-200 font-medium tabular-nums">
                          {(product.sales_price ?? 0).toLocaleString('tr-TR')} TL
                        </td>
                        <td className={cn('px-4 py-3 text-right text-sm font-medium tabular-nums', isProfitable ? 'text-success-400' : 'text-danger-400')}>
                          {isProfitable ? '+' : ''}{product.profit.netProfit.toLocaleString('tr-TR')} TL
                        </td>
                        <td className={cn('px-4 py-3 text-right text-sm tabular-nums', isProfitable ? 'text-success-400' : 'text-danger-400')}>
                          %{product.profit.margin}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={product.stock_status === 'InStock' ? 'success' : product.stock_status === 'Low' ? 'warning' : 'danger'}>
                            {product.stock_status === 'InStock' ? 'Stokta' : product.stock_status === 'Low' ? 'Az' : 'Tukendi'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditProduct(product); setModalOpen(true) }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-danger-500/10 hover:text-danger-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                <p className="text-xs text-gray-500">
                  {safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} / {filtered.length} urun
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageIdx = i
                    if (totalPages > 5) {
                      const start = Math.max(0, Math.min(safePage - 2, totalPages - 5))
                      pageIdx = start + i
                    }
                    return (
                      <button
                        key={pageIdx}
                        onClick={() => setPage(pageIdx)}
                        className={cn(
                          'flex h-7 min-w-[28px] items-center justify-center rounded-lg text-xs font-medium transition-colors',
                          pageIdx === safePage
                            ? 'bg-brand-500/20 text-brand-400'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        )}
                      >
                        {pageIdx + 1}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProduct(null) }}
        onSave={handleSave}
        product={editProduct}
      />

      <DeleteConfirm
        open={!!deleteTarget}
        productName={deleteTarget?.name ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

function SortHeader({
  label, field, current, dir, onSort, align,
}: {
  label: string
  field: SortField
  current: SortField
  dir: SortDir
  onSort: (f: SortField) => void
  align: 'left' | 'right'
}) {
  const isActive = current === field
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-gray-300',
        align === 'right' ? 'text-right' : 'text-left',
        isActive ? 'text-brand-400' : 'text-gray-500'
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('h-3 w-3 transition-opacity', isActive ? 'opacity-100' : 'opacity-30')} />
        {isActive && (
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', dir === 'asc' ? 'rotate-180' : '')}
          />
        )}
      </span>
    </th>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-white/5 bg-surface-800/50 px-2.5 pr-7 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50 appearance-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%236b7280\'%3e%3cpath d=\'M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.4rem center', backgroundSize: '1rem' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
