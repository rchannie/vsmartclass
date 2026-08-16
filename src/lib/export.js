// Ekspor laporan kelas (Modul 5 — guru) ke CSV dan PDF.
// Murni di sisi klien — tidak memanggil Gemini/Edge Function.
//
// jspdf/jspdf-autotable ditarik lewat import() dinamis (bukan import statis)
// karena keduanya menyeret dependensi berat (html2canvas, dompurify) yang
// tidak dibutuhkan siapa pun kecuali guru mengklik tombol "PDF" — statis akan
// menambah ~450KB gzip ke bundle utama yang dimuat semua pengguna.

import { codeOf } from './bloom'

const trendLabel = (t) => (t > 0 ? 'Naik' : t < 0 ? 'Turun' : 'Stabil')
const dateLabel = (iso) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

function rowsFromProfiles(profiles) {
  return profiles.map((p) => [
    p.full_name || '—',
    p.topic || '—',
    p.c1 ?? 0, p.c2 ?? 0, p.c3 ?? 0, p.c4 ?? 0, p.c5 ?? 0, p.c6 ?? 0,
    codeOf(p.current_level || 1),
    trendLabel(p.trend),
    p.session_count ?? 0,
    dateLabel(p.updated_at),
  ])
}

const HEADER = ['Nama', 'Topik', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'Level Saat Ini', 'Tren', 'Sesi', 'Terakhir Update']

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// CSV — nama file: {workspace}-bloom-{tanggal}.csv, UTF-8 BOM agar Excel Indonesia baca dengan benar
export function exportClassCSV(workspaceName, profiles) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [HEADER, ...rowsFromProfiles(profiles)].map((r) => r.map(escape).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${slugify(workspaceName)}-bloom-${todaySlug()}.csv`)
}

// PDF — tabel profil Bloom kelas + ringkasan distribusi level
export async function exportClassPDF(workspaceName, profiles, stats) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(`Laporan Bloom Kelas — ${workspaceName}`, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(`Diekspor ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · VSmartClass`, 14, 22)

  if (stats) {
    doc.setFontSize(10)
    doc.setTextColor(20)
    doc.text(
      `Rata-rata kelas: C${stats.avgLevel.toFixed(1)}  ·  Perlu perhatian: ${stats.attention} siswa  ·  Naik >=1 level (14 hari): ${stats.levelUp}%`,
      14, 29,
    )
  }

  autoTable(doc, {
    startY: stats ? 34 : 28,
    head: [HEADER],
    body: rowsFromProfiles(profiles),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: Object.fromEntries(
      ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((_, i) => [i + 2, { halign: 'center' }]),
    ),
  })

  doc.save(`${slugify(workspaceName)}-bloom-${todaySlug()}.pdf`)
}

function slugify(s) {
  return String(s || 'kelas').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'kelas'
}

function todaySlug() {
  return new Date().toISOString().slice(0, 10)
}
