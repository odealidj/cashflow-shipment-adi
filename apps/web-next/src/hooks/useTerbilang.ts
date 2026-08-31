/**
 * Utility Terbilang Indonesia & Format Angka Finansial
 * Mendukung format terbilang lengkap (untuk kwitansi/invoice resmi)
 * serta terbilang ringkas (untuk badge live helper input).
 */

const SATUAN = [
  "",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
  "Sepuluh",
  "Sebelas"
];

/**
 * Mengubah angka menjadi teks terbilang bahasa Indonesia lengkap standar perbankan / kwitansi.
 * Contoh: 28150000 -> "Dua Puluh Delapan Juta Seratus Lima Puluh Ribu Rupiah"
 */
export function terbilangLengkap(nominal: number | string): string {
  const n = typeof nominal === "string" ? parseFloat(nominal.replace(/[^0-9.-]+/g, "")) : nominal;
  if (isNaN(n) || n === 0) return "Nol Rupiah";

  const num = Math.floor(Math.abs(n));

  function konversi(nilai: number): string {
    if (nilai < 12) {
      return SATUAN[nilai];
    } else if (nilai < 20) {
      return konversi(nilai - 10) + " Belas";
    } else if (nilai < 100) {
      return konversi(Math.floor(nilai / 10)) + " Puluh " + konversi(nilai % 10);
    } else if (nilai < 200) {
      return "Seratus " + konversi(nilai - 100);
    } else if (nilai < 1000) {
      return konversi(Math.floor(nilai / 100)) + " Ratus " + konversi(nilai % 100);
    } else if (nilai < 2000) {
      return "Seribu " + konversi(nilai - 1000);
    } else if (nilai < 1000000) {
      return konversi(Math.floor(nilai / 1000)) + " Ribu " + konversi(nilai % 1000);
    } else if (nilai < 1000000000) {
      return konversi(Math.floor(nilai / 1000000)) + " Juta " + konversi(nilai % 1000000);
    } else if (nilai < 1000000000000) {
      return konversi(Math.floor(nilai / 1000000000)) + " Miliar " + konversi(nilai % 1000000000);
    } else if (nilai < 1000000000000000) {
      return konversi(Math.floor(nilai / 1000000000000)) + " Triliun " + konversi(nilai % 1000000000000);
    }
    return "";
  }

  const hasil = konversi(num).replace(/\s+/g, " ").trim();
  return (n < 0 ? "Minus " : "") + (hasil || "Nol") + " Rupiah";
}

/**
 * Mengubah angka menjadi teks pembacaan ringkas & tepat untuk badge live helper input.
 * Contoh:
 * - 28150000 -> "28 Juta 150 Ribu Rupiah"
 * - 30000000 -> "30 Juta Rupiah"
 * - 500000 -> "500 Ribu Rupiah"
 * - 1250000000 -> "1 Miliar 250 Juta Rupiah"
 */
export function terbilangRingkas(nominal: number | string): string {
  const n = typeof nominal === "string" ? parseFloat(nominal.replace(/[^0-9.-]+/g, "")) : nominal;
  if (isNaN(n) || n === 0) return "";

  let num = Math.floor(Math.abs(n));
  const parts: string[] = [];

  // Triliun
  if (num >= 1_000_000_000_000) {
    const triliun = Math.floor(num / 1_000_000_000_000);
    parts.push(`${triliun.toLocaleString("id-ID")} Triliun`);
    num %= 1_000_000_000_000;
  }

  // Miliar
  if (num >= 1_000_000_000) {
    const miliar = Math.floor(num / 1_000_000_000);
    parts.push(`${miliar.toLocaleString("id-ID")} Miliar`);
    num %= 1_000_000_000;
  }

  // Juta
  if (num >= 1_000_000) {
    const juta = Math.floor(num / 1_000_000);
    parts.push(`${juta.toLocaleString("id-ID")} Juta`);
    num %= 1_000_000;
  }

  // Ribu
  if (num >= 1_000) {
    const ribu = Math.floor(num / 1_000);
    parts.push(`${ribu.toLocaleString("id-ID")} Ribu`);
    num %= 1_000;
  }

  // Sisa satuan/ratusan jika ada
  if (num > 0) {
    parts.push(`${num.toLocaleString("id-ID")}`);
  }

  const teks = parts.join(" ");
  return (n < 0 ? "Minus " : "") + (teks ? `${teks} Rupiah` : "");
}

/**
 * Format string angka mentah menjadi berpemisah titik ribuan (misal: "30000000" -> "30.000.000")
 */
export function formatThousand(raw: string | number): string {
  if (raw === undefined || raw === null || raw === "") return "";
  const clean = String(raw).replace(/[^0-9]/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Mengembalikan string angka murni tanpa titik (misal: "30.000.000" -> "30000000")
 */
export function cleanThousand(formatted: string): string {
  if (!formatted) return "";
  return formatted.replace(/[^0-9]/g, "");
}
