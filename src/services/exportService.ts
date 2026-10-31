/**
 * Export Service
 *
 * Generates PDF and Excel (XLSX) reports of order data.
 * - PDF: uses expo-print for HTML→PDF rendering + expo-sharing to share
 * - Excel: uses the `xlsx` library to build a workbook, saved via
 *   expo-file-system and shared via expo-sharing
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx-js-style';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/config/firebaseConfig';
import { formatCurrency, formatDate } from '@/utils/pricing';
import type { Order } from '@/services/firestoreService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Firestore Timestamp (or already-Date) to a JS Date safely. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

/** Readable category label */
function categoryLabel(cat: string): string {
  if (cat === 'dewasa') return 'Dewasa';
  if (cat === 'pemuda') return 'Pemuda';
  return 'Anak';
}

/** Readable sleeve type label */
function sleeveLabel(sleeve: string): string {
  return sleeve === 'pendek' ? 'Pendek' : 'Panjang';
}

/** Status label */
function statusLabel(isPaidOff: boolean): string {
  return isPaidOff ? 'Lunas' : 'Belum Lunas';
}

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

/**
 * Generate a beautifully styled PDF report of all orders and share it.
 */
export async function exportToPDF(orders: Order[]): Promise<void> {
  const now = new Date();
  const dateGenerated = formatDate(now);

  // Sort orders: oldest first, with 'pemuda' at the very bottom
  const nonPemuda = orders
    .filter((o) => o.category !== 'pemuda')
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ?? new Date(0);
      const dateB = b.createdAt?.toDate?.() ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

  const pemuda = orders
    .filter((o) => o.category === 'pemuda')
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ?? new Date(0);
      const dateB = b.createdAt?.toDate?.() ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

  const sortedOrders = [...nonPemuda, ...pemuda];

  // Totals
  const totalHarga = sortedOrders.reduce((sum, o) => sum + o.price, 0);
  const totalDibayar = sortedOrders.reduce((sum, o) => sum + o.totalPaid, 0);
  const totalSisa = totalHarga - totalDibayar;
  const totalLunas = sortedOrders.filter((o) => o.isPaidOff).length;
  const totalBelum = sortedOrders.length - totalLunas;

  const tableRows = sortedOrders
    .map(
      (o, idx) => `
      <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
        <td class="center">${idx + 1}</td>
        <td>${o.name}</td>
        <td class="center">${categoryLabel(o.category)}</td>
        <td class="center">${sleeveLabel(o.sleeveType)}</td>
        <td class="center">${o.size}</td>
        <td class="right">${formatCurrency(o.price)}</td>
        <td class="right">${formatCurrency(o.totalPaid)}</td>
        <td class="right">${formatCurrency(o.price - o.totalPaid)}</td>
        <td class="center">
          <span class="badge ${o.isPaidOff ? 'lunas' : 'belum'}">${statusLabel(o.isPaidOff)}</span>
        </td>
      </tr>`,
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Laporan Kaos Desa</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a2e;
      padding: 32px;
      background: #ffffff;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #0d9488;
    }
    .header h1 {
      font-size: 20px;
      color: #0d9488;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .header p {
      font-size: 11px;
      color: #64748b;
    }
    .summary-bar {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-item {
      flex: 1;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      border-radius: 8px;
      padding: 10px 14px;
      text-align: center;
    }
    .summary-item .label {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .summary-item .value {
      font-size: 14px;
      font-weight: 700;
      color: #0f766e;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    thead th {
      background: #0d9488;
      color: #ffffff;
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    thead th:first-child { border-radius: 6px 0 0 0; }
    thead th:last-child { border-radius: 0 6px 0 0; }
    tbody td {
      padding: 7px 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    tbody tr.even { background: #f8fafc; }
    tbody tr.odd { background: #ffffff; }
    .center { text-align: center; }
    .right { text-align: right; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.lunas {
      background: #d1fae5;
      color: #059669;
    }
    .badge.belum {
      background: #fef3c7;
      color: #d97706;
    }
    tfoot td {
      padding: 8px 6px;
      font-weight: 700;
      background: #f0fdfa;
      border-top: 2px solid #0d9488;
      font-size: 10px;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Laporan Data Pemesanan Kaos Desa Bulu Nyawiji</h1>
    <p>Tanggal cetak: ${dateGenerated} &bull; Total pesanan: ${orders.length}</p>
  </div>

  <div class="summary-bar">
    <div class="summary-item">
      <div class="label">Total Pesanan</div>
      <div class="value">${orders.length}</div>
    </div>
    <div class="summary-item">
      <div class="label">Total Harga</div>
      <div class="value">${formatCurrency(totalHarga)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Total Dibayar</div>
      <div class="value">${formatCurrency(totalDibayar)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Sisa</div>
      <div class="value">${formatCurrency(totalSisa)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Lunas / Belum</div>
      <div class="value">${totalLunas} / ${totalBelum}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center">No</th>
        <th>Nama</th>
        <th class="center">Kategori</th>
        <th class="center">Lengan</th>
        <th class="center">Size</th>
        <th class="right">Harga</th>
        <th class="right">Dibayar</th>
        <th class="right">Sisa</th>
        <th class="center">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" class="right">TOTAL</td>
        <td class="right">${formatCurrency(totalHarga)}</td>
        <td class="right">${formatCurrency(totalDibayar)}</td>
        <td class="right">${formatCurrency(totalSisa)}</td>
        <td class="center">${totalLunas} Lunas</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    Dicetak otomatis oleh Aplikasi Kaos Desa Bulu Nyawiji &bull; ${dateGenerated}
  </div>
</body>
</html>`;

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Bagikan Laporan PDF',
    UTI: 'com.adobe.pdf',
  });
}

// ---------------------------------------------------------------------------
// Excel Export
// ---------------------------------------------------------------------------

/**
 * Helper to fetch installment amounts for an order, ordered by date ascending.
 */
/**
 * Helper to fetch installment amounts mapped to their explicit tarikanNumber (1-7).
 */
async function getInstallmentsForOrder(orderId: string): Promise<number[]> {
  const amounts = Array(7).fill(undefined);
  try {
    const instRef = collection(db, 'orders', orderId, 'installments');
    const snap = await getDocs(instRef);
    snap.forEach((doc) => {
      const data = doc.data();
      const num = data.tarikanNumber;
      if (typeof num === 'number' && num >= 1 && num <= 7) {
        amounts[num - 1] = data.amount;
      }
    });
  } catch (error) {
    console.error(`Error fetching installments for order ${orderId}:`, error);
  }
  return amounts;
}

/**
 * Generate an XLSX workbook of all orders, save it to the document directory,
 * and share it. Include up to 7 installment columns.
 */
export async function exportToExcel(orders: Order[]): Promise<void> {
  const dewasaOrders = orders
    .filter((o) => o.category === 'dewasa')
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ?? new Date(0);
      const dateB = b.createdAt?.toDate?.() ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

  const anakOrders = orders
    .filter((o) => o.category === 'anak')
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ?? new Date(0);
      const dateB = b.createdAt?.toDate?.() ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

  const pemudaOrders = orders
    .filter((o) => o.category === 'pemuda')
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ?? new Date(0);
      const dateB = b.createdAt?.toDate?.() ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

  const header = [
    'No',
    'Nama',
    'Kategori',
    'Lengan',
    'Size',
    'Tarikan 1',
    'Tarikan 2',
    'Tarikan 3',
    'Tarikan 4',
    'Tarikan 5',
    'Tarikan 6',
    'Tarikan 7',
    'Harga',
    'Dibayar',
    'Sisa',
    'Status',
  ];

  const wsData: any[][] = [];
  const headerRows: number[] = [];
  const subtotalRows: number[] = [];
  const titleRows: number[] = [];
  const paidOffRows: number[] = [];
  const pemudaRows: number[] = [];

  // Pre-fetch ALL installments in parallel (biggest performance fix)
  const allOrderIds = orders.map((o) => o.id);
  const installmentResults = await Promise.all(
    allOrderIds.map((id) => getInstallmentsForOrder(id))
  );
  const installmentMap = new Map<string, number[]>();
  allOrderIds.forEach((id, idx) => {
    installmentMap.set(id, installmentResults[idx]);
  });

  const appendCategoryTable = (title: string, categoryOrders: Order[], isPemudaGroup: boolean) => {
    if (categoryOrders.length === 0) return;

    // Title Row
    const titleRowIdx = wsData.length + 1;
    titleRows.push(titleRowIdx);
    wsData.push([title, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Header Row
    const headerRowIdx = wsData.length + 1;
    headerRows.push(headerRowIdx);
    wsData.push(header);

    // Data Rows
    for (let idx = 0; idx < categoryOrders.length; idx++) {
      const o = categoryOrders[idx];
      const instAmounts = installmentMap.get(o.id) ?? Array(7).fill(undefined);
      const rowNum = wsData.length + 1;
      
      if (isPemudaGroup) {
        pemudaRows.push(rowNum);
      } else if (o.isPaidOff) {
        paidOffRows.push(rowNum);
      }

      const row: any[] = [
        idx + 1,
        o.name,
        categoryLabel(o.category),
        sleeveLabel(o.sleeveType),
        o.size,
      ];

      for (let i = 0; i < 7; i++) {
        row.push(instAmounts[i] !== undefined ? instAmounts[i] : '');
      }

      row.push(
        o.price,
        o.totalPaid,
        o.price - o.totalPaid,
        statusLabel(o.isPaidOff)
      );

      wsData.push(row);
    }

    // Subtotal Row
    const subtotalRowIdx = wsData.length + 1;
    subtotalRows.push(subtotalRowIdx);
    const subtotalHarga = categoryOrders.reduce((sum, o) => sum + o.price, 0);
    const subtotalDibayar = categoryOrders.reduce((sum, o) => sum + o.totalPaid, 0);
    const subtotalSisa = subtotalHarga - subtotalDibayar;
    const subtotalLunas = categoryOrders.filter((o) => o.isPaidOff).length;

    wsData.push([
      '',
      '',
      '',
      '',
      'SUBTOTAL',
      '', '', '', '', '', '', '',
      subtotalHarga,
      subtotalDibayar,
      subtotalSisa,
      `${subtotalLunas} Lunas`,
    ]);

    // Space Row
    wsData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  };

  // Add the 3 tables
  appendCategoryTable('DATA PESANAN KAOS - DEWASA', dewasaOrders, false);
  appendCategoryTable('DATA PESANAN KAOS - ANAK', anakOrders, false);
  appendCategoryTable('DATA PESANAN KAOS - PEMUDA', pemudaOrders, true);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // General Recap Table on the side
  const totalOrders = orders.length;
  const totalLunas = orders.filter((o) => o.isPaidOff).length;
  const totalBelumLunas = totalOrders - totalLunas;
  const totalHarga = orders.reduce((sum, o) => sum + o.price, 0);
  const totalDibayar = orders.reduce((sum, o) => sum + o.totalPaid, 0);
  const totalSisa = totalHarga - totalDibayar;

  const lpDewasa = orders.filter((o) => (o.category === 'dewasa' || o.category === 'pemuda') && o.sleeveType === 'pendek').length;
  const lpjDewasa = orders.filter((o) => (o.category === 'dewasa' || o.category === 'pemuda') && o.sleeveType === 'panjang').length;
  const lpAnak = orders.filter((o) => o.category === 'anak' && o.sleeveType === 'pendek').length;
  const lpjAnak = orders.filter((o) => o.category === 'anak' && o.sleeveType === 'panjang').length;

  const recapTitleRows = new Set<number>();

  const writeCell = (r: number, c: number, value: any, bold = false, align = 'left', format?: string, isSectionTitle = false) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    ws[ref] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
    
    if (isSectionTitle) recapTitleRows.add(r);

    const cellStyle: any = {
      font: {
        name: 'Calibri',
        sz: 11,
        bold: bold,
      },
      alignment: {
        vertical: 'center',
        horizontal: align,
      },
    };
    if (recapTitleRows.has(r)) {
      cellStyle.font.sz = 12;
      cellStyle.font.color = { rgb: '0F766E' };
      cellStyle.font.bold = true;
    } else if (bold) {
      cellStyle.font.color = { rgb: '475569' };
    }
    if (format) {
      ws[ref].z = format;
    }
    ws[ref].s = cellStyle;
  };

  // =========================================================================
  // DETAILED RECAP (columns R-S, 0-indexed: 17-18)
  // =========================================================================
  const sizesList = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'XXXXXL'];
  const categories = [
    { key: 'dewasa', label: 'Dewasa' },
    { key: 'pemuda', label: 'Pemuda' },
    { key: 'anak', label: 'Anak' },
  ];
  const sleeves = [
    { key: 'pendek', label: 'Pendek' },
    { key: 'panjang', label: 'Panjang' },
  ];

  let row = 1; // current row in recap area (0-indexed)

  // ---- Section 1: Ringkasan Umum ----
  writeCell(row, 17, 'REKAPITULASI KESELURUHAN', true, 'left', undefined, true);
  row++;

  writeCell(row, 17, 'Total Dewasa');
  writeCell(row, 18, dewasaOrders.length, false, 'right');
  row++;

  writeCell(row, 17, 'Total Anak');
  writeCell(row, 18, anakOrders.length, false, 'right');
  row++;

  writeCell(row, 17, 'Total Pemuda');
  writeCell(row, 18, pemudaOrders.length, false, 'right');
  row++;

  writeCell(row, 17, 'Total Seluruh Pesanan', true);
  writeCell(row, 18, totalOrders, true, 'right');
  row += 2;

  // ---- Section 2: Per Tipe Lengan ----
  writeCell(row, 17, 'REKAP PER TIPE LENGAN', true, 'left', undefined, true);
  row++;

  writeCell(row, 17, 'Lengan Pendek Dewasa (inc. Pemuda)');
  writeCell(row, 18, lpDewasa, false, 'right');
  row++;

  writeCell(row, 17, 'Lengan Panjang Dewasa (inc. Pemuda)');
  writeCell(row, 18, lpjDewasa, false, 'right');
  row++;

  writeCell(row, 17, 'Lengan Pendek Anak');
  writeCell(row, 18, lpAnak, false, 'right');
  row++;

  writeCell(row, 17, 'Lengan Panjang Anak');
  writeCell(row, 18, lpjAnak, false, 'right');
  row += 2;

  // ---- Section 3: Keuangan ----
  writeCell(row, 17, 'REKAP KEUANGAN', true, 'left', undefined, true);
  row++;

  writeCell(row, 17, 'Total Pendapatan (Target)', true);
  writeCell(row, 18, totalHarga, true, 'right', '#,##0');
  row++;

  writeCell(row, 17, 'Total Terbayar (Masuk)', true);
  writeCell(row, 18, totalDibayar, true, 'right', '#,##0');
  row++;

  writeCell(row, 17, 'Total Sisa Tagihan', true);
  writeCell(row, 18, totalSisa, true, 'right', '#,##0');
  row++;

  writeCell(row, 17, 'Total Pesanan Lunas');
  writeCell(row, 18, totalLunas, false, 'right');
  row++;

  writeCell(row, 17, 'Total Belum Lunas');
  writeCell(row, 18, totalBelumLunas, false, 'right');
  row += 2;

  // ---- Section 4: Rekap Ukuran per Kategori ----
  writeCell(row, 17, 'REKAP UKURAN DEWASA (inc. Pemuda)', true, 'left', undefined, true);
  row++;
  sizesList.forEach((sz) => {
    const count = orders.filter((o) => (o.category === 'dewasa' || o.category === 'pemuda') && o.size === sz).length;
    writeCell(row, 17, `Ukuran ${sz}`);
    writeCell(row, 18, count, false, 'right');
    row++;
  });
  row++;

  writeCell(row, 17, 'REKAP UKURAN ANAK', true, 'left', undefined, true);
  row++;
  sizesList.forEach((sz) => {
    const count = orders.filter((o) => o.category === 'anak' && o.size === sz).length;
    writeCell(row, 17, `Ukuran ${sz}`);
    writeCell(row, 18, count, false, 'right');
    row++;
  });
  row++;

  // ---- Section 5: DETAIL LENGKAP Kategori × Lengan × Ukuran ----
  writeCell(row, 17, 'DETAIL LENGKAP (KATEGORI × LENGAN × UKURAN)', true, 'left', undefined, true);
  row++;

  // For Dewasa + Pemuda (combined as "Dewasa inc. Pemuda")
  for (const sleeve of sleeves) {
    writeCell(row, 17, `Dewasa (inc. Pemuda) - ${sleeve.label}`, true, 'left');
    row++;
    let subtotal = 0;
    for (const sz of sizesList) {
      const count = orders.filter(
        (o) => (o.category === 'dewasa' || o.category === 'pemuda') && o.sleeveType === sleeve.key && o.size === sz
      ).length;
      if (count > 0) {
        writeCell(row, 17, `   ${sleeve.label} - ${sz}`);
        writeCell(row, 18, count, false, 'right');
        row++;
        subtotal += count;
      }
    }
    // Show items with no size selected
    const noSize = orders.filter(
      (o) => (o.category === 'dewasa' || o.category === 'pemuda') && o.sleeveType === sleeve.key && o.size === '-'
    ).length;
    if (noSize > 0) {
      writeCell(row, 17, `   ${sleeve.label} - Belum Pilih`);
      writeCell(row, 18, noSize, false, 'right');
      row++;
      subtotal += noSize;
    }
    writeCell(row, 17, `   Subtotal ${sleeve.label}`, true);
    writeCell(row, 18, subtotal, true, 'right');
    row += 2;
  }

  // For Anak
  for (const sleeve of sleeves) {
    writeCell(row, 17, `Anak - ${sleeve.label}`, true, 'left');
    row++;
    let subtotal = 0;
    for (const sz of sizesList) {
      const count = orders.filter(
        (o) => o.category === 'anak' && o.sleeveType === sleeve.key && o.size === sz
      ).length;
      if (count > 0) {
        writeCell(row, 17, `   ${sleeve.label} - ${sz}`);
        writeCell(row, 18, count, false, 'right');
        row++;
        subtotal += count;
      }
    }
    const noSize = orders.filter(
      (o) => o.category === 'anak' && o.sleeveType === sleeve.key && o.size === '-'
    ).length;
    if (noSize > 0) {
      writeCell(row, 17, `   ${sleeve.label} - Belum Pilih`);
      writeCell(row, 18, noSize, false, 'right');
      row++;
      subtotal += noSize;
    }
    writeCell(row, 17, `   Subtotal ${sleeve.label}`, true);
    writeCell(row, 18, subtotal, true, 'right');
    row += 2;
  }

  // Items with no sleeve selected
  const noSleeve = orders.filter((o) => o.sleeveType === '-').length;
  if (noSleeve > 0) {
    writeCell(row, 17, 'Belum Pilih Lengan', true, 'left');
    row++;
    for (const cat of categories) {
      const count = orders.filter((o) => o.category === cat.key && o.sleeveType === '-').length;
      if (count > 0) {
        writeCell(row, 17, `   ${cat.label}`);
        writeCell(row, 18, count, false, 'right');
        row++;
      }
    }
    row++;
  }

  const maxRecapRow = row;
  ws['!ref'] = `A1:S${Math.max(wsData.length, maxRecapRow + 1)}`;

  // Apply styling to worksheet cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    const rowNum = R + 1;
    const isHeader = headerRows.includes(rowNum);
    const isTitle = titleRows.includes(rowNum);
    const isSubtotal = subtotalRows.includes(rowNum);
    const isPaidOffRow = paidOffRows.includes(rowNum);
    const isPemudaRow = pemudaRows.includes(rowNum);

    // Only format columns A to P (0-15) to avoid overwriting our side recap styles
    for (let C = range.s.c; C <= Math.min(range.e.c, 15); ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      let cellStyle: any = {
        font: {
          name: 'Calibri',
          sz: 11,
        },
        alignment: {
          vertical: 'center',
        },
      };

      if (isTitle) {
        cellStyle.font.bold = true;
        cellStyle.font.sz = 12;
        cellStyle.font.color = { rgb: '0F766E' };
        ws[cellRef].s = cellStyle;
        continue;
      }

      const isNumberColumn = C >= 5 && C <= 11;
      const isPriceColumn = C === 12 || C === 13 || C === 14;

      if (C === 0 || C === 4 || C === 15) {
        cellStyle.alignment.horizontal = 'center';
      } else if (isPriceColumn || isNumberColumn) {
        cellStyle.alignment.horizontal = 'right';
        if (ws[cellRef].v !== '' && typeof ws[cellRef].v === 'number') {
          ws[cellRef].z = '#,##0';
        }
      } else {
        cellStyle.alignment.horizontal = 'left';
      }

      if (isHeader) {
        cellStyle.fill = { fgColor: { rgb: '0D9488' } };
        cellStyle.font.bold = true;
        cellStyle.font.color = { rgb: 'FFFFFF' };
        cellStyle.alignment.horizontal = 'center';
      } else if (isPemudaRow) {
        cellStyle.fill = { fgColor: { rgb: 'DBEAFE' } };
        cellStyle.font.color = { rgb: '1E40AF' };
        cellStyle.border = {
          bottom: { style: 'thin', color: { rgb: 'BFDBFE' } },
          top: { style: 'thin', color: { rgb: 'BFDBFE' } },
        };
      } else if (isPaidOffRow) {
        cellStyle.fill = { fgColor: { rgb: 'D1FAE5' } };
        cellStyle.font.color = { rgb: '065F46' };
        cellStyle.border = {
          bottom: { style: 'thin', color: { rgb: 'A7F3D0' } },
          top: { style: 'thin', color: { rgb: 'A7F3D0' } },
        };
      } else if (isSubtotal) {
        cellStyle.fill = { fgColor: { rgb: 'CCFBF1' } };
        cellStyle.font.bold = true;
        cellStyle.font.color = { rgb: '0F766E' };
        cellStyle.border = {
          top: { style: 'medium', color: { rgb: '0D9488' } },
          bottom: { style: 'double', color: { rgb: '0D9488' } },
        };
      } else {
        cellStyle.border = {
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        };
      }

      ws[cellRef].s = cellStyle;
    }
  }

  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 25 }, // Nama
    { wch: 10 }, // Kategori
    { wch: 10 }, // Lengan
    { wch: 8 },  // Size
    { wch: 12 }, // Tarikan 1
    { wch: 12 }, // Tarikan 2
    { wch: 12 }, // Tarikan 3
    { wch: 12 }, // Tarikan 4
    { wch: 12 }, // Tarikan 5
    { wch: 12 }, // Tarikan 6
    { wch: 12 }, // Tarikan 7
    { wch: 14 }, // Harga
    { wch: 14 }, // Dibayar
    { wch: 14 }, // Sisa
    { wch: 14 }, // Status
    { wch: 4 },  // Spacer gap
    { wch: 34 }, // Recap Label
    { wch: 16 }, // Recap Value
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pesanan');

  const wbOut = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `Laporan_Kaos_Desa_${timestamp}.xlsx`;
  if (Platform.OS === 'web') {
    const raw = atob(wbOut);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([array], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, wbOut, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Bagikan Laporan Excel',
  });
}
