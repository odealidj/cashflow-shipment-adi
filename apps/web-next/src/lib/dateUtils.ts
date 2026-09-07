/**
 * Utility sentral untuk penyeragaman format tanggal di seluruh aplikasi.
 * Format standar sistem: "7 Sep 2026", "1 Agu 2025" (d MMM yyyy tanpa leading zero).
 */

export const MONTHS_SHORT_INDO = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

export const MONTHS_FULL_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * Memformat tanggal ke string standar: "7 Sep 2026", "1 Agu 2025"
 * Kebal terhadap distorsi zona waktu untuk string YYYY-MM-DD.
 */
export function formatDate(dateVal?: string | Date | null): string {
  if (!dateVal) return "-";

  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed || trimmed === "-") return "-";

    // Format ISO YYYY-MM-DD atau dengan jam (T / spasi)
    const cleanStr = trimmed.replace(" ", "T").split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12) {
        return `${day} ${MONTHS_SHORT_INDO[month - 1]} ${year}`;
      }
    }
  }

  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/**
 * Memformat tanggal dan waktu: "7 Sep 2026, 14:30"
 */
export function formatDateTime(dateVal?: string | Date | null): string {
  if (!dateVal) return "-";
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return "-";

  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${datePart}, ${hours}:${minutes}`;
}
