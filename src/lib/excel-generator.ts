/**
 * Excel Generator — Multi-sheet professional report.
 * Uses ExcelJS for styled worksheets with formulas.
 */

import ExcelJS from 'exceljs'
import type { ReportData } from '@/lib/report-engine'

const BRAND_GREEN = '00B26E'
const DARK_BG = '0F172A'
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_GREEN}` } }
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
const ALT_ROW_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }

function styleHeader(row: ExcelJS.Row) {
    row.eachCell((cell) => {
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
            bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        }
    })
    row.height = 24
}

function currencyFmt(v: number): string {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function generateExcel(data: ReportData): Promise<Blob> {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'All-In MarketPlace'
    wb.created = new Date()

    /* ============ SHEET 1: Özet ============ */
    const wsOverview = wb.addWorksheet('Özet', { properties: { tabColor: { argb: `FF${BRAND_GREEN}` } } })
    wsOverview.columns = [
        { header: 'Metrik', key: 'metric', width: 25 },
        { header: 'Değer', key: 'value', width: 25 },
    ]

    const headerRow1 = wsOverview.getRow(1)
    styleHeader(headerRow1)

    // Title
    const titleRow = wsOverview.addRow({ metric: 'RAPOR BİLGİLERİ', value: '' })
    titleRow.font = { bold: true, size: 12, color: { argb: `FF${DARK_BG}` } }
    wsOverview.addRow({ metric: 'Mağaza', value: data.meta.storeName })
    wsOverview.addRow({ metric: 'Pazaryeri', value: data.meta.marketplace })
    wsOverview.addRow({ metric: 'Tarih', value: data.meta.generatedAt })
    wsOverview.addRow({ metric: 'Ürün Sayısı', value: data.meta.productCount })
    wsOverview.addRow({ metric: '', value: '' })

    const kpiTitle = wsOverview.addRow({ metric: 'KPI GÖSTERGELERİ', value: '' })
    kpiTitle.font = { bold: true, size: 12, color: { argb: `FF${DARK_BG}` } }
    wsOverview.addRow({ metric: 'Toplam Ciro', value: `${currencyFmt(data.kpi.totalRevenue)} TL` })
    wsOverview.addRow({ metric: 'Net Kâr', value: `${currencyFmt(data.kpi.totalProfit)} TL` })
    wsOverview.addRow({ metric: 'Ortalama Marj', value: `%${data.kpi.avgMargin}` })
    wsOverview.addRow({ metric: 'Ortalama ROI', value: `%${data.kpi.avgRoi}` })
    wsOverview.addRow({ metric: 'Aktif Ürün', value: String(data.kpi.activeCount) })
    wsOverview.addRow({ metric: 'Zararda Ürün', value: String(data.kpi.lossCount) })

    /* ============ SHEET 2: Ürünler ============ */
    const wsProducts = wb.addWorksheet('Ürünler')
    wsProducts.columns = [
        { header: 'Ürün Adı', key: 'name', width: 30 },
        { header: 'Kategori', key: 'category', width: 15 },
        { header: 'Satış (TL)', key: 'salesPrice', width: 13 },
        { header: 'Alış (TL)', key: 'buyPrice', width: 13 },
        { header: 'Komisyon (TL)', key: 'commission', width: 13 },
        { header: 'Kargo (TL)', key: 'shipping', width: 12 },
        { header: 'Paketleme (TL)', key: 'packaging', width: 13 },
        { header: 'İade M. (TL)', key: 'returnCost', width: 12 },
        { header: 'Hizmet (TL)', key: 'serviceFee', width: 11 },
        { header: 'Net Kâr (TL)', key: 'netProfit', width: 13 },
        { header: 'Marj %', key: 'margin', width: 9 },
        { header: 'ROI %', key: 'roi', width: 8 },
        { header: 'İade %', key: 'returnRate', width: 9 },
    ]

    styleHeader(wsProducts.getRow(1))

    data.products.forEach((p, i) => {
        const row = wsProducts.addRow({
            name: p.name,
            category: p.category,
            salesPrice: p.salesPrice,
            buyPrice: p.buyPrice,
            commission: p.commission,
            shipping: p.shipping,
            packaging: p.packagingCost,
            returnCost: p.returnCost,
            serviceFee: p.serviceFee,
            netProfit: p.netProfit,
            margin: p.margin,
            roi: p.roi,
            returnRate: p.returnRate,
        })

        if (i % 2 === 1) {
            row.eachCell((cell) => { cell.fill = ALT_ROW_FILL })
        }

        // Color net profit
        const profitCell = row.getCell('netProfit')
        profitCell.font = {
            bold: true,
            color: { argb: p.netProfit >= 0 ? 'FF10B981' : 'FFEF4444' },
        }
    })

    // Autofilter
    wsProducts.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: data.products.length + 1, column: 13 },
    }

    /* ============ SHEET 3: Kategoriler ============ */
    const wsCat = wb.addWorksheet('Kategoriler')
    wsCat.columns = [
        { header: 'Kategori', key: 'category', width: 20 },
        { header: 'Ciro (TL)', key: 'revenue', width: 15 },
        { header: 'Kâr (TL)', key: 'profit', width: 15 },
        { header: 'Marj %', key: 'margin', width: 10 },
        { header: 'Ürün Sayısı', key: 'count', width: 12 },
        { header: 'Ort. İade %', key: 'returnRate', width: 12 },
    ]

    styleHeader(wsCat.getRow(1))

    data.categories.forEach((c) => {
        const row = wsCat.addRow({
            category: c.category,
            revenue: c.revenue,
            profit: c.profit,
            margin: c.margin,
            count: c.productCount,
            returnRate: c.avgReturnRate,
        })
        const profitCell = row.getCell('profit')
        profitCell.font = { bold: true, color: { argb: c.profit >= 0 ? 'FF10B981' : 'FFEF4444' } }
    })

    /* ============ OUTPUT ============ */
    const buffer = await wb.xlsx.writeBuffer()
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
