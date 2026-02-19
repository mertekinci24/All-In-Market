/**
 * PDF Generator — Professional report with cover page, KPIs, tables.
 * Uses jsPDF + jspdf-autotable for table rendering.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportData } from '@/lib/report-engine'

const BRAND = { primary: [0, 178, 110], dark: [15, 23, 42], gray: [100, 116, 139] } as const

function fmt(v: number): string {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function generatePDF(data: ReportData): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()

    /* ============ COVER PAGE ============ */
    // Background
    doc.setFillColor(...BRAND.dark)
    doc.rect(0, 0, pageW, 297, 'F')

    // Accent stripe
    doc.setFillColor(...BRAND.primary)
    doc.rect(0, 80, pageW, 4, 'F')

    // Title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    doc.text('All-In MarketPlace', pageW / 2, 105, { align: 'center' })

    // Subtitle
    doc.setFontSize(16)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text('Kârlılık & Performans Raporu', pageW / 2, 118, { align: 'center' })

    // Store info
    doc.setFontSize(12)
    doc.setTextColor(200, 200, 200)
    doc.text(data.meta.storeName, pageW / 2, 145, { align: 'center' })
    doc.text(`Pazaryeri: ${data.meta.marketplace}`, pageW / 2, 155, { align: 'center' })
    doc.text(`${data.meta.productCount} Ürün`, pageW / 2, 165, { align: 'center' })

    // Date
    doc.setFontSize(10)
    doc.setTextColor(...BRAND.gray)
    doc.text(data.meta.generatedAt, pageW / 2, 260, { align: 'center' })

    // Footer line
    doc.setFillColor(...BRAND.primary)
    doc.rect(0, 290, pageW, 2, 'F')

    /* ============ KPI PAGE ============ */
    doc.addPage()
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 0, pageW, 297, 'F')

    doc.setTextColor(30, 41, 59)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Özet KPI Göstergeleri', 15, 25)

    doc.setDrawColor(...BRAND.primary)
    doc.setLineWidth(1)
    doc.line(15, 29, 80, 29)

    const kpis = [
        { label: 'Toplam Ciro', value: `${fmt(data.kpi.totalRevenue)} TL` },
        { label: 'Net Kâr', value: `${fmt(data.kpi.totalProfit)} TL` },
        { label: 'Ortalama Marj', value: `%${data.kpi.avgMargin}` },
        { label: 'Ortalama ROI', value: `%${data.kpi.avgRoi}` },
        { label: 'Aktif Ürün', value: String(data.kpi.activeCount) },
        { label: 'Zararda Ürün', value: String(data.kpi.lossCount) },
    ]

    const cardW = 55, cardH = 30, gap = 8, startX = 15, startY = 40
    kpis.forEach((kpi, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const x = startX + col * (cardW + gap)
        const y = startY + row * (cardH + gap)

        doc.setFillColor(255, 255, 255)
        doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F')

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BRAND.gray)
        doc.text(kpi.label, x + 6, y + 10)

        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text(kpi.value, x + 6, y + 23)
    })

    /* ============ CATEGORY TABLE ============ */
    if (data.categories.length > 0) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text('Kategori Performansı', 15, 120)

        autoTable(doc, {
            startY: 125,
            head: [['Kategori', 'Ciro (TL)', 'Kâr (TL)', 'Marj %', 'Ürün', 'İade %']],
            body: data.categories.map((c) => [
                c.category,
                fmt(c.revenue),
                fmt(c.profit),
                `%${c.margin}`,
                String(c.productCount),
                `%${c.avgReturnRate}`,
            ]),
            theme: 'grid',
            headStyles: { fillColor: [0, 178, 110], textColor: 255, fontSize: 9, font: 'helvetica' },
            bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 15, right: 15 },
        })
    }

    /* ============ WORST PRODUCTS ============ */
    if (data.worstProducts.length > 0) {
        const lastY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 200

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text('En Çok Zarar Ettiren Ürünler', 15, lastY + 15)

        autoTable(doc, {
            startY: lastY + 20,
            head: [['#', 'Ürün', 'Zarar (TL)', 'Marj %', 'İade %']],
            body: data.worstProducts.map((p, i) => [
                String(i + 1),
                p.name.length > 30 ? p.name.slice(0, 30) + '...' : p.name,
                fmt(p.netProfit),
                `%${p.margin}`,
                `%${p.returnRate}`,
            ]),
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
            margin: { left: 15, right: 15 },
        })
    }

    /* ============ FULL PRODUCT TABLE ============ */
    doc.addPage()
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 0, pageW, 297, 'F')

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Ürün Detay Raporu', 15, 25)

    doc.setDrawColor(...BRAND.primary)
    doc.setLineWidth(1)
    doc.line(15, 29, 80, 29)

    autoTable(doc, {
        startY: 35,
        head: [['Ürün', 'Kategori', 'Satış', 'Alış', 'Komisyon', 'Kargo', 'Net Kâr', 'Marj%']],
        body: data.products.map((p) => [
            p.name.length > 25 ? p.name.slice(0, 25) + '...' : p.name,
            p.category.length > 12 ? p.category.slice(0, 12) + '...' : p.category,
            fmt(p.salesPrice),
            fmt(p.buyPrice),
            fmt(p.commission),
            fmt(p.shipping),
            fmt(p.netProfit),
            `%${p.margin}`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 178, 110], textColor: 255, fontSize: 8, font: 'helvetica' },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
        styles: { cellPadding: 2 },
    })

    /* ============ FOOTER on all pages ============ */
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
            `All-In MarketPlace — ${data.meta.generatedAt} — Sayfa ${i}/${totalPages}`,
            pageW / 2,
            292,
            { align: 'center' }
        )
    }

    return doc.output('blob')
}
