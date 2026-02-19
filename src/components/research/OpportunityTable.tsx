import { useState, useMemo } from 'react'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { ArrowUpDown, ExternalLink, MoreHorizontal, PieChart, Trash2, TrendingUp, ShoppingCart } from 'lucide-react'
import type { ProductMining } from '@/hooks/useProductMining'
import { useNotifications } from '@/hooks/useNotifications'
import { Link } from 'react-router-dom'

interface OpportunityTableProps {
    data: ProductMining[]
    onSelect: (product: ProductMining) => void
    onDelete: (id: string) => void
}

const columnHelper = createColumnHelper<ProductMining>()

export function OpportunityTable({ data, onSelect, onDelete }: OpportunityTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])

    // Simulated Revenue Logic (Placeholders for now, will connect to real metrics later)
    const calculateEstRevenue = (price: number, score: number) => {
        // Mock logic: better score + price = improved guess
        const estSales = Math.floor(score * 50 * (Math.random() * 0.5 + 0.8));
        return { sales: estSales, revenue: estSales * price };
    }

    const columns = useMemo(() => [
        columnHelper.accessor('image_url', {
            header: 'Ürün',
            cell: info => (
                <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/10 bg-surface-950 flex-shrink-0">
                    {info.getValue() ? (
                        <img src={info.getValue()!} alt="Product" className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-surface-800 text-gray-600 text-xs">No Img</div>
                    )}
                </div>
            ),
            size: 60,
        }),
        columnHelper.accessor('title', {
            header: 'Başlık / ASIN',
            cell: info => (
                <div className="max-w-[250px]">
                    <div className="font-medium text-white truncate hover:text-clip hover:whitespace-normal text-sm leading-snug" title={info.getValue()}>
                        {info.getValue()}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-brand-300 font-mono bg-brand-500/10 px-1 rounded">{info.row.original.asin}</span>
                        <a href={`https://www.trendyol.com/dp/${info.row.original.asin}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors">
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor('current_price', {
            header: ({ column }) => {
                return (
                    <button
                        className="flex items-center gap-1 hover:text-white transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Fiyat
                        <ArrowUpDown className="h-3 w-3" />
                    </button>
                )
            },
            cell: info => <div className="font-mono text-gray-300">{info.getValue()?.toLocaleString('tr-TR')} TL</div>,
        }),
        columnHelper.accessor('opportunity_score', {
            header: ({ column }) => {
                return (
                    <button
                        className="flex items-center gap-1 hover:text-white transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Puan
                        <ArrowUpDown className="h-3 w-3" />
                    </button>
                )
            },
            cell: info => {
                const score = info.getValue()
                let color = 'text-red-400 bg-red-500/10 border-red-500/20'
                if (score >= 8) color = 'text-green-400 bg-green-500/10 border-green-500/20'
                else if (score >= 5) color = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'

                return (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-bold ${color}`}>
                        {score}
                    </div>
                )
            }
        }),
        // Computed Column: Profit Margin
        columnHelper.display({
            id: 'net_margin',
            header: 'Tahmini Marj',
            cell: info => {
                const price = info.row.original.current_price || 0;
                if (price === 0) return <span className="text-gray-600">-</span>;

                // Estimation Logic matches Extension:
                // Cost 40%, Commission 21%, Shipping 25 TL (Updated 2025)
                const cost = price * 0.40;
                const commission = price * 0.21;
                const shipping = 25;
                const profit = price - cost - commission - shipping;
                const margin = (profit / price) * 100;

                let color = 'text-gray-400';
                if (margin > 20) color = 'text-green-400 font-bold';
                else if (margin > 10) color = 'text-yellow-400';
                else color = 'text-red-400';

                return (
                    <div className="flex flex-col">
                        <span className={`font-mono ${color}`}>%{margin.toFixed(1)}</span>
                        <span className="text-[10px] text-gray-500">~{profit.toFixed(0)} TL Kar</span>
                    </div>
                )
            }
        }),
        // Computed Columns
        columnHelper.display({
            id: 'est_sales',
            header: 'Tahmini Satış',
            cell: info => {
                const { sales } = calculateEstRevenue(info.row.original.current_price || 0, info.row.original.opportunity_score || 5);
                return (
                    <div className="flex flex-col">
                        <span className="text-white font-mono">{sales} Adet</span>
                        <span className="text-[10px] text-gray-500">Aylık</span>
                    </div>
                )
            }
        }),
        columnHelper.display({
            id: 'est_revenue',
            header: 'Tahmini Ciro',
            cell: info => {
                const { revenue } = calculateEstRevenue(info.row.original.current_price || 0, info.row.original.opportunity_score || 5);
                return (
                    <div className="flex flex-col">
                        <span className="text-brand-300 font-mono font-medium">{revenue.toLocaleString('tr-TR')} TL</span>
                    </div>
                )
            }
        }),
        columnHelper.display({
            id: 'actions',
            header: '',
            cell: info => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onSelect(info.row.original)}
                        className="p-2 hover:bg-surface-800 rounded-lg text-gray-400 hover:text-brand-400 transition-colors"
                        title="Detaylı Analiz"
                    >
                        <PieChart className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(info.row.original.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        title="Sil"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )
        }),
    ], [onSelect, onDelete]) // Dependencies

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
            sorting,
        },
    })

    return (
        <div className="rounded-xl border border-white/5 bg-surface-900/40 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-surface-950/50 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="border-b border-white/5">
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="px-6 py-4">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-surface-800/50 transition-colors group">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-6 py-3 whitespace-nowrap">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>Liste boş. Eklenti üzerinden ürün ekleyin.</p>
                </div>
            )}
        </div>
    )
}
