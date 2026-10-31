/**
 * Pricing Logic untuk Kaos Desa
 *
 * Harga Dasar:
 * - Dewasa Pendek: Rp 65.000
 * - Dewasa Panjang: Rp 75.000
 * - Anak Pendek: Rp 45.000
 * - Anak Panjang: Rp 55.000
 *
 * Surcharge per size di atas XL:
 * - XXL: +5.000
 * - XXXL: +10.000
 * - XXXXL: +15.000
 * - XXXXXL: +20.000
 */

export type Category = 'dewasa' | 'anak' | 'pemuda';
export type SleeveType = '-' | 'pendek' | 'panjang';
export type Size = '-' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'XXXXL' | 'XXXXXL';

export const SIZES: Size[] = ['-', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'XXXXXL'];

export const CATEGORIES: { label: string; value: Category }[] = [
  { label: 'Dewasa', value: 'dewasa' },
  { label: 'Pemuda', value: 'pemuda' },
  { label: 'Anak', value: 'anak' },
];

export const SLEEVE_TYPES: { label: string; value: SleeveType }[] = [
  { label: 'Belum Pilih', value: '-' },
  { label: 'Pendek', value: 'pendek' },
  { label: 'Panjang', value: 'panjang' },
];

const BASE_PRICES: Record<Category, Record<'pendek' | 'panjang', number>> = {
  dewasa: {
    pendek: 65000,
    panjang: 75000,
  },
  pemuda: {
    pendek: 60000,
    panjang: 70000,
  },
  anak: {
    pendek: 45000,
    panjang: 55000,
  },
};

const SURCHARGE_PER_SIZE_ABOVE_XL = 5000;

/**
 * Menghitung harga kaos berdasarkan kategori, tipe lengan, dan ukuran.
 */
export function calculatePrice(
  category: Category,
  sleeveType: SleeveType,
  size: Size
): number {
  if (category === 'pemuda') {
    return 150000;
  }
  const resolvedSleeve = sleeveType === '-' ? 'pendek' : sleeveType;
  const basePrice = BASE_PRICES[category][resolvedSleeve];
  const sizeIndex = SIZES.indexOf(size);
  // '-' is index 0. S/M/L/XL are index 1,2,3,4.
  // XL is index 4, sizes above XL get surcharge
  const surcharge = Math.max(0, sizeIndex - 4) * SURCHARGE_PER_SIZE_ABOVE_XL;
  return basePrice + surcharge;
}

/**
 * Format angka ke format Rupiah: "Rp 65.000"
 */
export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Mengonversi Firestore Timestamp atau nilai lainnya ke JS Date secara aman.
 */
export function toSafeDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}

/**
 * Format tanggal ke format Indonesia: "12 Jul 2026"
 */
export function formatDate(date: any): string {
  const d = toSafeDate(date);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format tanggal dan waktu: "12 Jul 2026, 14:30"
 */
export function formatDateTime(date: any): string {
  const d = toSafeDate(date);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Hitung persentase pembayaran
 */
export function calculatePaymentPercentage(totalPaid: number, price: number): number {
  if (price <= 0) return 0;
  return Math.min(100, Math.round((totalPaid / price) * 100));
}
