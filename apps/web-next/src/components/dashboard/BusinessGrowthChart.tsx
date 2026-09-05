"use client";

import React, { useState, useMemo } from "react";
import { 
  TrendingUp, 
  Truck, 
  Users, 
  Calendar, 
  DollarSign, 
  Percent, 
  Info,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  BarChart3,
  Lightbulb,
  Sparkles,
  ShieldCheck,
  Clock,
  SlidersHorizontal,
  ArrowRight
} from "lucide-react";

export type MetricTab = "financial" | "operational" | "clients";
export type TimeframePeriod = 
  | "this_month"
  | "last_month"
  | "3m"
  | "6m"
  | "1y"
  | "2y"
  | "3y"
  | "5y"
  | "custom";

interface BusinessGrowthChartProps {
  cashflowEntries: any[];
  invoices: any[];
  loading?: boolean;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
];

export function BusinessGrowthChart({
  cashflowEntries,
  invoices,
  loading = false
}: BusinessGrowthChartProps) {
  const [activeTab, setActiveTab] = useState<MetricTab>("financial");
  const [timeframe, setTimeframe] = useState<TimeframePeriod>("6m");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showNarrative, setShowNarrative] = useState<boolean>(true);

  // Custom date range state (from month/year to month/year)
  const [customStartYear, setCustomStartYear] = useState<number>(() => {
    const d = new Date();
    return d.getFullYear() - 1;
  });
  const [customStartMonth, setCustomStartMonth] = useState<number>(() => {
    const d = new Date();
    return d.getMonth();
  });
  const [customEndYear, setCustomEndYear] = useState<number>(() => {
    const d = new Date();
    return d.getFullYear();
  });
  const [customEndMonth, setCustomEndMonth] = useState<number>(() => {
    const d = new Date();
    return d.getMonth();
  });

  // Available distinct years for custom dropdown selection
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentY = new Date().getFullYear();
    for (let y = currentY - 5; y <= currentY + 1; y++) {
      years.add(y);
    }
    cashflowEntries.forEach((e) => {
      if (e.date_of_entry) {
        const y = parseInt(e.date_of_entry.substring(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    invoices.forEach((inv) => {
      if (inv.invoice_date) {
        const y = parseInt(inv.invoice_date.substring(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [cashflowEntries, invoices]);

  // Helper currency formatter
  const formatCurrency = (amount: number, compact: boolean = false) => {
    if (compact) {
      if (Math.abs(amount) >= 1_000_000_000) {
        return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
      }
      if (Math.abs(amount) >= 1_000_000) {
        return `Rp ${(amount / 1_000_000).toFixed(1)} Jt`;
      }
      if (Math.abs(amount) >= 1_000) {
        return `Rp ${(amount / 1_000).toFixed(0)} Rb`;
      }
      return `Rp ${amount}`;
    }
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Generate bucket periods and explicit real date range string
  const { chartData, explicitRangeLabel, timeframeDisplayLabel } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // 1. FOCUS BULANAN: Bulan Ini (Mingguan)
    if (timeframe === "this_month") {
      const y = currentYear;
      const m = currentMonth;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const padM = String(m + 1).padStart(2, "0");

      const weeks = [
        { label: "Mg 1 (1-7)", start: 1, end: 7 },
        { label: "Mg 2 (8-14)", start: 8, end: 14 },
        { label: "Mg 3 (15-21)", start: 15, end: 21 },
        { label: `Mg 4 (22-${lastDay})`, start: 22, end: lastDay }
      ].map((w, idx) => ({
        key: `w_${idx + 1}`,
        label: w.label,
        startStr: `${y}-${padM}-${String(w.start).padStart(2, "0")}`,
        endStr: `${y}-${padM}-${String(w.end).padStart(2, "0")}`,
        revenue: 0,
        profit: 0,
        trips: 0,
        clients: new Set<string>()
      }));

      cashflowEntries.forEach((entry) => {
        if (!entry.date_of_entry) return;
        const dStr = entry.date_of_entry.substring(0, 10);
        weeks.forEach((w) => {
          if (dStr >= w.startStr && dStr <= w.endStr) {
            if (entry.entry_type === "SHIPMENT") {
              w.trips += 1;
              w.profit += Number(entry.profit) || 0;
              w.revenue += Number(entry.grand_selling) || 0;
            }
            if (entry.act_information) {
              w.clients.add(entry.act_information);
            }
          }
        });
      });

      invoices.forEach((inv) => {
        if (!inv.invoice_date) return;
        const dStr = inv.invoice_date.substring(0, 10);
        weeks.forEach((w) => {
          if (dStr >= w.startStr && dStr <= w.endStr) {
            const invAmt = Number(inv.total_amount) || 0;
            if (invAmt > w.revenue) w.revenue = invAmt;
            if (inv.customer_name) w.clients.add(inv.customer_name);
          }
        });
      });

      return {
        chartData: weeks.map((item) => ({
          key: item.key,
          label: item.label,
          revenue: Math.max(0, item.revenue),
          profit: Math.max(0, item.profit),
          marginPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
          trips: item.trips,
          clientCount: item.clients.size
        })),
        explicitRangeLabel: `1 – ${lastDay} ${MONTH_NAMES[m]} ${y}`,
        timeframeDisplayLabel: `Bulan Ini (${MONTH_NAMES[m]} ${y}) - Tren Mingguan`
      };
    }

    // 2. FOCUS BULANAN: Bulan Lalu (Mingguan)
    if (timeframe === "last_month") {
      const prevDate = new Date(currentYear, currentMonth - 1, 1);
      const y = prevDate.getFullYear();
      const m = prevDate.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      const padM = String(m + 1).padStart(2, "0");

      const weeks = [
        { label: "Mg 1 (1-7)", start: 1, end: 7 },
        { label: "Mg 2 (8-14)", start: 8, end: 14 },
        { label: "Mg 3 (15-21)", start: 15, end: 21 },
        { label: `Mg 4 (22-${lastDay})`, start: 22, end: lastDay }
      ].map((w, idx) => ({
        key: `prev_w_${idx + 1}`,
        label: w.label,
        startStr: `${y}-${padM}-${String(w.start).padStart(2, "0")}`,
        endStr: `${y}-${padM}-${String(w.end).padStart(2, "0")}`,
        revenue: 0,
        profit: 0,
        trips: 0,
        clients: new Set<string>()
      }));

      cashflowEntries.forEach((entry) => {
        if (!entry.date_of_entry) return;
        const dStr = entry.date_of_entry.substring(0, 10);
        weeks.forEach((w) => {
          if (dStr >= w.startStr && dStr <= w.endStr) {
            if (entry.entry_type === "SHIPMENT") {
              w.trips += 1;
              w.profit += Number(entry.profit) || 0;
              w.revenue += Number(entry.grand_selling) || 0;
            }
            if (entry.act_information) {
              w.clients.add(entry.act_information);
            }
          }
        });
      });

      invoices.forEach((inv) => {
        if (!inv.invoice_date) return;
        const dStr = inv.invoice_date.substring(0, 10);
        weeks.forEach((w) => {
          if (dStr >= w.startStr && dStr <= w.endStr) {
            const invAmt = Number(inv.total_amount) || 0;
            if (invAmt > w.revenue) w.revenue = invAmt;
            if (inv.customer_name) w.clients.add(inv.customer_name);
          }
        });
      });

      return {
        chartData: weeks.map((item) => ({
          key: item.key,
          label: item.label,
          revenue: Math.max(0, item.revenue),
          profit: Math.max(0, item.profit),
          marginPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
          trips: item.trips,
          clientCount: item.clients.size
        })),
        explicitRangeLabel: `1 – ${lastDay} ${MONTH_NAMES[m]} ${y}`,
        timeframeDisplayLabel: `Bulan Lalu (${MONTH_NAMES[m]} ${y}) - Tren Mingguan`
      };
    }

    // 3. TAHUNAN MAKRO: 3 Tahun & 5 Tahun
    if (timeframe === "3y" || timeframe === "5y") {
      const yearCount = timeframe === "3y" ? 3 : 5;
      const years: {
        key: string;
        label: string;
        revenue: number;
        profit: number;
        trips: number;
        clients: Set<string>;
      }[] = [];

      for (let i = yearCount - 1; i >= 0; i--) {
        const y = currentYear - i;
        years.push({
          key: String(y),
          label: String(y),
          revenue: 0,
          profit: 0,
          trips: 0,
          clients: new Set<string>()
        });
      }

      cashflowEntries.forEach((entry) => {
        if (!entry.date_of_entry) return;
        const entryYear = entry.date_of_entry.substring(0, 4);
        const target = years.find((item) => item.key === entryYear);
        if (target) {
          if (entry.entry_type === "SHIPMENT") {
            target.trips += 1;
            target.profit += Number(entry.profit) || 0;
            target.revenue += Number(entry.grand_selling) || 0;
          }
          if (entry.act_information) {
            target.clients.add(entry.act_information);
          }
        }
      });

      invoices.forEach((inv) => {
        if (!inv.invoice_date) return;
        const invYear = inv.invoice_date.substring(0, 4);
        const target = years.find((item) => item.key === invYear);
        if (target) {
          const invAmt = Number(inv.total_amount) || 0;
          if (invAmt > target.revenue) target.revenue = invAmt;
          if (inv.customer_name) target.clients.add(inv.customer_name);
        }
      });

      const startYear = currentYear - yearCount + 1;
      return {
        chartData: years.map((item) => ({
          key: item.key,
          label: item.label,
          revenue: Math.max(0, item.revenue),
          profit: Math.max(0, item.profit),
          marginPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
          trips: item.trips,
          clientCount: item.clients.size
        })),
        explicitRangeLabel: `Tahun ${startYear} – ${currentYear}`,
        timeframeDisplayLabel: `${yearCount} Tahun Terakhir (Tahunan)`
      };
    }

    // 4. 2 TAHUN (8 Kuartal)
    if (timeframe === "2y") {
      // 8 Quarters back
      const quarters: {
        key: string;
        label: string;
        startStr: string;
        endStr: string;
        revenue: number;
        profit: number;
        trips: number;
        clients: Set<string>;
      }[] = [];

      const currentQ = Math.floor(currentMonth / 3) + 1;
      for (let i = 7; i >= 0; i--) {
        const totalQ = currentYear * 4 + currentQ - 1 - i;
        const qYear = Math.floor(totalQ / 4);
        const qNum = (totalQ % 4) + 1;
        const startM = (qNum - 1) * 3;
        const endM = startM + 2;
        const lastDayOfQ = new Date(qYear, endM + 1, 0).getDate();

        quarters.push({
          key: `${qYear}-Q${qNum}`,
          label: `Q${qNum} '${String(qYear).slice(2)}`,
          startStr: `${qYear}-${String(startM + 1).padStart(2, "0")}-01`,
          endStr: `${qYear}-${String(endM + 1).padStart(2, "0")}-${String(lastDayOfQ).padStart(2, "0")}`,
          revenue: 0,
          profit: 0,
          trips: 0,
          clients: new Set<string>()
        });
      }

      cashflowEntries.forEach((entry) => {
        if (!entry.date_of_entry) return;
        const dStr = entry.date_of_entry.substring(0, 10);
        quarters.forEach((q) => {
          if (dStr >= q.startStr && dStr <= q.endStr) {
            if (entry.entry_type === "SHIPMENT") {
              q.trips += 1;
              q.profit += Number(entry.profit) || 0;
              q.revenue += Number(entry.grand_selling) || 0;
            }
            if (entry.act_information) {
              q.clients.add(entry.act_information);
            }
          }
        });
      });

      invoices.forEach((inv) => {
        if (!inv.invoice_date) return;
        const dStr = inv.invoice_date.substring(0, 10);
        quarters.forEach((q) => {
          if (dStr >= q.startStr && dStr <= q.endStr) {
            const invAmt = Number(inv.total_amount) || 0;
            if (invAmt > q.revenue) q.revenue = invAmt;
            if (inv.customer_name) q.clients.add(inv.customer_name);
          }
        });
      });

      const firstQ = quarters[0];
      const lastQ = quarters[quarters.length - 1];

      return {
        chartData: quarters.map((item) => ({
          key: item.key,
          label: item.label,
          revenue: Math.max(0, item.revenue),
          profit: Math.max(0, item.profit),
          marginPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
          trips: item.trips,
          clientCount: item.clients.size
        })),
        explicitRangeLabel: `${firstQ.label} – ${lastQ.label} (8 Kuartal)`,
        timeframeDisplayLabel: `2 Tahun Terakhir (8 Kuartal)`
      };
    }

    // 5. RENTANG KUSTOM: Bulan ke Bulan
    if (timeframe === "custom") {
      let sY = customStartYear;
      let sM = customStartMonth;
      let eY = customEndYear;
      let eM = customEndMonth;

      // Ensure start is before or equal to end
      if (sY > eY || (sY === eY && sM > eM)) {
        const tmpY = sY; const tmpM = sM;
        sY = eY; sM = eM;
        eY = tmpY; eM = tmpM;
      }

      const customMonths: {
        year: number;
        month: number;
        key: string;
        label: string;
        revenue: number;
        profit: number;
        trips: number;
        clients: Set<string>;
      }[] = [];

      let curY = sY;
      let curM = sM;

      while (curY < eY || (curY === eY && curM <= eM)) {
        const padM = String(curM + 1).padStart(2, "0");
        const key = `${curY}-${padM}`;
        const label = `${MONTH_SHORT[curM]} '${String(curY).slice(2)}`;

        customMonths.push({
          year: curY,
          month: curM,
          key,
          label,
          revenue: 0,
          profit: 0,
          trips: 0,
          clients: new Set<string>()
        });

        curM++;
        if (curM > 11) {
          curM = 0;
          curY++;
        }
      }

      cashflowEntries.forEach((entry) => {
        if (!entry.date_of_entry) return;
        const entryKey = entry.date_of_entry.substring(0, 7);
        const target = customMonths.find((item) => item.key === entryKey);
        if (target) {
          if (entry.entry_type === "SHIPMENT") {
            target.trips += 1;
            target.profit += Number(entry.profit) || 0;
            target.revenue += Number(entry.grand_selling) || 0;
          }
          if (entry.act_information) {
            target.clients.add(entry.act_information);
          }
        }
      });

      invoices.forEach((inv) => {
        if (!inv.invoice_date) return;
        const invKey = inv.invoice_date.substring(0, 7);
        const target = customMonths.find((item) => item.key === invKey);
        if (target) {
          const invAmt = Number(inv.total_amount) || 0;
          if (invAmt > target.revenue) target.revenue = invAmt;
          if (inv.customer_name) target.clients.add(inv.customer_name);
        }
      });

      const rangeLabel = `${MONTH_SHORT[sM]} ${sY} – ${MONTH_SHORT[eM]} ${eY} (${customMonths.length} Bulan)`;

      return {
        chartData: customMonths.map((item) => ({
          key: item.key,
          label: item.label,
          revenue: Math.max(0, item.revenue),
          profit: Math.max(0, item.profit),
          marginPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
          trips: item.trips,
          clientCount: item.clients.size
        })),
        explicitRangeLabel: rangeLabel,
        timeframeDisplayLabel: `Kustom (${customMonths.length} Bln)`
      };
    }

    // 6. BULANAN STANDAR: 3m, 6m, 1y
    const monthCount = timeframe === "3m" ? 3 : timeframe === "6m" ? 6 : 12;
    const months: {
      year: number;
      month: number;
      key: string;
      label: string;
      revenue: number;
      profit: number;
      trips: number;
      clients: Set<string>;
    }[] = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const padM = String(m + 1).padStart(2, "0");
      const key = `${y}-${padM}`;
      const label = `${MONTH_SHORT[m]} ${String(y).slice(2)}`;

      months.push({
        year: y,
        month: m,
        key,
        label,
        revenue: 0,
        profit: 0,
        trips: 0,
        clients: new Set<string>()
      });
    }

    cashflowEntries.forEach((entry) => {
      if (!entry.date_of_entry) return;
      const entryKey = entry.date_of_entry.substring(0, 7);
      const target = months.find((item) => item.key === entryKey);
      if (target) {
        if (entry.entry_type === "SHIPMENT") {
          target.trips += 1;
          target.profit += Number(entry.profit) || 0;
          target.revenue += Number(entry.grand_selling) || 0;
        }
        if (entry.act_information) {
          target.clients.add(entry.act_information);
        }
      }
    });

    invoices.forEach((inv) => {
      if (!inv.invoice_date) return;
      const invKey = inv.invoice_date.substring(0, 7);
      const target = months.find((item) => item.key === invKey);
      if (target) {
        const invAmt = Number(inv.total_amount) || 0;
        if (invAmt > target.revenue) target.revenue = invAmt;
        if (inv.customer_name) target.clients.add(inv.customer_name);
      }
    });

    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];
    const rangeLabel = `${MONTH_SHORT[firstMonth.month]} ${firstMonth.year} – ${MONTH_SHORT[lastMonth.month]} ${lastMonth.year}`;

    return {
      chartData: months.map((item) => ({
        key: item.key,
        label: item.label,
        revenue: Math.max(0, item.revenue),
        profit: Math.max(0, item.profit),
        marginPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
        trips: item.trips,
        clientCount: item.clients.size
      })),
      explicitRangeLabel: rangeLabel,
      timeframeDisplayLabel: `${monthCount} Bulan Terakhir`
    };
  }, [timeframe, cashflowEntries, invoices, customStartYear, customStartMonth, customEndYear, customEndMonth]);

  // Overall totals and averages for footer summary pills
  const summaryTotals = useMemo(() => {
    const totalRev = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalProf = chartData.reduce((acc, curr) => acc + curr.profit, 0);
    const totalTrips = chartData.reduce((acc, curr) => acc + curr.trips, 0);
    const avgMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
    const avgTripVal = totalTrips > 0 ? totalRev / totalTrips : 0;
    const maxClientInMonth = Math.max(...chartData.map((d) => d.clientCount), 0);
    const avgClientsPerMonth = chartData.length > 0 
      ? chartData.reduce((acc, curr) => acc + curr.clientCount, 0) / chartData.length 
      : 0;

    return {
      totalRev,
      totalProf,
      totalTrips,
      avgMargin,
      avgTripVal,
      maxClientInMonth,
      avgClientsPerMonth
    };
  }, [chartData]);

  // Automated Smart Narrative Generation for the Right-Side Panel
  const narrativeData = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        badgeText: "DATA MENUNGGU",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        storyParagraph: "Belum ada transaksi historis yang tercatat pada rentang periode yang dipilih.",
        metric1: { label: "Pertumbuhan", val: "-" },
        metric2: { label: "Margin Rerata", val: "-" },
        metric3: { label: "Status", val: "Stabil" }
      };
    }

    const lastItem = chartData[chartData.length - 1];
    const prevItem = chartData.length > 1 ? chartData[chartData.length - 2] : null;

    if (activeTab === "financial") {
      const revGrowth = prevItem && prevItem.revenue > 0
        ? ((lastItem.revenue - prevItem.revenue) / prevItem.revenue) * 100
        : 0;
      const marginDiff = prevItem ? lastItem.marginPct - prevItem.marginPct : 0;

      let badgeText = "🟢 TREN EKSPANSI POSITIF";
      let badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";

      if (revGrowth < 0 && lastItem.marginPct < 10) {
        badgeText = "🔴 PERLU EVALUASI BIAYA";
        badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
      } else if (revGrowth >= 0 && lastItem.marginPct < 10) {
        badgeText = "🟡 MARGIN TERTEKAN";
        badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
      } else if (revGrowth < 0) {
        badgeText = "📉 VOLUME TERKOREKSI";
        badgeColor = "bg-slate-100 text-slate-800 border-slate-200";
      }

      const isPositiveGrowth = revGrowth >= 0;
      const growthSign = isPositiveGrowth ? "+" : "";

      const storyParagraph = (
        <>
          Omset pada titik <strong className="text-slate-900">{lastItem.label}</strong> tercatat{" "}
          <strong className="text-sky-800">{formatCurrency(lastItem.revenue, true)}</strong>
          {prevItem ? ` (${growthSign}${revGrowth.toFixed(1)}% vs sebelumnya)` : ""} dengan perolehan laba kotor{" "}
          <strong className="text-emerald-700">{formatCurrency(lastItem.profit, true)}</strong>.
          Tingkat margin kotor berada di level{" "}
          <strong className="text-slate-900">{lastItem.marginPct.toFixed(1)}%</strong>
          {prevItem ? ` (${marginDiff >= 0 ? "menguat +" : ""}${marginDiff.toFixed(1)}% poin)` : ""}.{" "}
          {lastItem.marginPct >= 12
            ? "Struktur keuntungan pengiriman armada berada dalam kondisi sehat dan efisien."
            : "Disarankan untuk meninjau efisiensi negosiasi biaya rekanan vendor armada."}
        </>
      );

      return {
        badgeText,
        badgeColor,
        storyParagraph,
        metric1: {
          label: "Pertumbuhan vs Sebelumnya",
          val: prevItem ? `${growthSign}${revGrowth.toFixed(1)}%` : "Baseline",
          color: isPositiveGrowth ? "text-emerald-700" : "text-rose-700"
        },
        metric2: {
          label: "Margin Periode Terpilih",
          val: `${lastItem.marginPct.toFixed(1)}%`,
          color: "text-slate-900"
        },
        metric3: {
          label: "Total Laba Akumulasi",
          val: formatCurrency(summaryTotals.totalProf, true),
          color: "text-emerald-700"
        }
      };
    }

    if (activeTab === "operational") {
      const tripDiff = prevItem ? lastItem.trips - prevItem.trips : 0;
      const isTripUp = tripDiff >= 0;
      const tripSign = isTripUp ? "+" : "";

      const badgeText = isTripUp ? "🚚 RITASE MENINGKAT" : "⏳ RITASE TERKOREKSI";
      const badgeColor = isTripUp 
        ? "bg-indigo-50 text-indigo-800 border-indigo-200" 
        : "bg-slate-100 text-slate-800 border-slate-200";

      const storyParagraph = (
        <>
          Aktivitas pengiriman pada <strong className="text-slate-900">{lastItem.label}</strong> membukukan{" "}
          <strong className="text-indigo-800">{lastItem.trips} ritase trip</strong>
          {prevItem ? ` (${tripSign}${tripDiff} trip dibanding titik sebelumnya)` : ""}.
          Rerata nilai transaksi pengiriman mencapai{" "}
          <strong className="text-slate-900">
            {formatCurrency(lastItem.trips > 0 ? lastItem.revenue / lastItem.trips : 0, true)}
          </strong>{" "}
          per pengiriman armada. Utilisasi kendaraan operasional logistik terpantau konsisten.
        </>
      );

      return {
        badgeText,
        badgeColor,
        storyParagraph,
        metric1: {
          label: "Perubahan Ritase",
          val: prevItem ? `${tripSign}${tripDiff} Trip` : "Baseline",
          color: isTripUp ? "text-indigo-700" : "text-rose-700"
        },
        metric2: {
          label: "Rata-rata Nilai / Trip",
          val: formatCurrency(summaryTotals.avgTripVal, true),
          color: "text-slate-900"
        },
        metric3: {
          label: "Total Ritase Periode",
          val: `${summaryTotals.totalTrips} Trip`,
          color: "text-indigo-800"
        }
      };
    }

    // activeTab === "clients"
    const clientDiff = prevItem ? lastItem.clientCount - prevItem.clientCount : 0;
    const isClientUp = clientDiff >= 0;
    const clientSign = isClientUp ? "+" : "";

    const badgeText = lastItem.clientCount >= 3 ? "👥 BASIS KLIEN KUAT" : "📈 PENETRASI KLIEN";
    const badgeColor = "bg-violet-50 text-violet-800 border-violet-200";

    const storyParagraph = (
      <>
        Tercatat <strong className="text-violet-800">{lastItem.clientCount} perusahaan klien aktif</strong> bertransaksi
        pada rentang <strong className="text-slate-900">{lastItem.label}</strong>
        {prevItem ? ` (${clientSign}${clientDiff} klien dibanding titik sebelumnya)` : ""}.
        Pola order menunjukkan loyalitas pelanggan korporasi yang konsisten dengan pengiriman berulang (*repeat order*).
      </>
    );

    return {
      badgeText,
      badgeColor,
      storyParagraph,
      metric1: {
        label: "Dinamika Klien Aktif",
        val: prevItem ? `${clientSign}${clientDiff} Klien` : "Baseline",
        color: isClientUp ? "text-violet-700" : "text-rose-700"
      },
      metric2: {
        label: "Rerata Klien / Titik",
        val: `${summaryTotals.avgClientsPerMonth.toFixed(1)} Klien`,
        color: "text-slate-900"
      },
      metric3: {
        label: "Puncak Klien Aktif",
        val: `${summaryTotals.maxClientInMonth} Perusahaan`,
        color: "text-violet-800"
      }
    };
  }, [chartData, activeTab, summaryTotals]);

  // SVG Chart Dimensions & Scales
  // Dynamic width adapts when the narrative is collapsed or when more monthly bars are displayed
  const baseSvgWidth = showNarrative ? 540 : 880;
  const minBarGroupWidth = chartData.length > 12 ? 40 : 48;
  const svgWidth = Math.max(baseSvgWidth, chartData.length * minBarGroupWidth);
  const svgHeight = 220;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Maximum value for scaling based on activeTab
  const maxValue = useMemo(() => {
    if (activeTab === "financial") {
      const max = Math.max(...chartData.map((d) => Math.max(d.revenue, d.profit)), 10_000_000);
      return Math.ceil(max * 1.15);
    }
    if (activeTab === "operational") {
      const max = Math.max(...chartData.map((d) => d.trips), 5);
      return Math.ceil(max * 1.25);
    }
    const max = Math.max(...chartData.map((d) => d.clientCount), 4);
    return Math.ceil(max * 1.3);
  }, [activeTab, chartData]);

  // Calculate ticks
  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = maxValue * ratio;
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return { val, y, ratio };
    });
  }, [maxValue, plotHeight]);

  const barGroupWidth = plotWidth / (chartData.length || 1);
  const barWidth = Math.min(barGroupWidth * 0.32, 24);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      {/* Top Bar: Title + Badges, Metric Tabs, and Timeframe Dropdown */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Grafik Tren Pertumbuhan Bisnis
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100/80 text-sky-800 border border-sky-200/60">
                  {timeframeDisplayLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                <span className="inline-flex items-center gap-1 font-bold text-sky-800">
                  <Calendar className="w-3 h-3 text-sky-600" />
                  Rentang: {explicitRangeLabel}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400">
                  Tren makro mandiri (pilih rentang waktu di kanan)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls: Metric Tabs + Modern Timeframe Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Selector Tabs */}
          <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 text-xs font-bold">
            <button
              onClick={() => setActiveTab("financial")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "financial"
                  ? "bg-white text-sky-900 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-sky-600" />
              <span>Finansial</span>
            </button>

            <button
              onClick={() => setActiveTab("operational")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "operational"
                  ? "bg-white text-indigo-900 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Volume Trip</span>
            </button>

            <button
              onClick={() => setActiveTab("clients")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "clients"
                  ? "bg-white text-violet-900 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-violet-600" />
              <span>Klien Aktif</span>
            </button>
          </div>

          {/* Timeframe Dropdown Selector (Opsi 1) */}
          <div className="relative inline-flex items-center">
            <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl px-3 py-1.5 transition-all shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as TimeframePeriod)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <optgroup label="Fokus Bulanan (Tren Mingguan)">
                  <option value="this_month">Bulan Ini (Mingguan)</option>
                  <option value="last_month">Bulan Lalu (Mingguan)</option>
                </optgroup>
                <optgroup label="Tren Pertumbuhan">
                  <option value="3m">3 Bulan Terakhir</option>
                  <option value="6m">6 Bulan Terakhir (Standar)</option>
                  <option value="1y">1 Tahun Terakhir (12 Bln)</option>
                  <option value="2y">2 Tahun Terakhir (8 Kuartal)</option>
                </optgroup>
                <optgroup label="Tren Makro Tahunan">
                  <option value="3y">3 Tahun Terakhir (Tahunan)</option>
                  <option value="5y">5 Tahun Terakhir (Tahunan)</option>
                </optgroup>
                <optgroup label="Kustom Fleksibel">
                  <option value="custom">📅 Kustom Rentang Bulan...</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Expand / Collapse Insight Panel Toggle Button (Icon "anak panah" mencolok seperti sidemenu) */}
          <button
            onClick={() => setShowNarrative((prev) => !prev)}
            aria-label={showNarrative ? "Perlebar Grafik (Sembunyikan Panel Insight)" : "Kembalikan Tampilan Normal (Buka Panel Insight)"}
            title={showNarrative ? "Perlebar Grafik (Sembunyikan Panel Insight)" : "Kembalikan Tampilan Normal (Buka Panel Insight)"}
            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 shrink-0 border-2 ${
              showNarrative
                ? "bg-[#223249] hover:bg-sky-800 text-sky-200 hover:text-white border-sky-400/80 ring-2 ring-sky-500/20"
                : "bg-sky-600 hover:bg-sky-500 text-white border-white ring-2 ring-sky-400 animate-pulse"
            }`}
          >
            {showNarrative ? (
              <ChevronRight className="w-4.5 h-4.5 stroke-[2.5]" />
            ) : (
              <ChevronLeft className="w-4.5 h-4.5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (Shown when timeframe === 'custom') */}
      {timeframe === "custom" && (
        <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-bold text-sky-950 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-700" />
              Pilih Rentang Bulan:
            </span>

            {/* Dari Bulan & Tahun */}
            <div className="flex items-center gap-1 bg-white border border-sky-200 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Dari:</span>
              <select
                value={customStartMonth}
                onChange={(e) => setCustomStartMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={`sm-${idx}`} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={customStartYear}
                onChange={(e) => setCustomStartYear(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer border-l border-slate-200 pl-1 ml-1"
              >
                {availableYears.map((y) => (
                  <option key={`sy-${y}`} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-sky-400 hidden sm:inline" />

            {/* Sampai Bulan & Tahun */}
            <div className="flex items-center gap-1 bg-white border border-sky-200 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Sampai:</span>
              <select
                value={customEndMonth}
                onChange={(e) => setCustomEndMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={`em-${idx}`} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={customEndYear}
                onChange={(e) => setCustomEndYear(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer border-l border-slate-200 pl-1 ml-1"
              >
                {availableYears.map((y) => (
                  <option key={`ey-${y}`} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Presets for Custom Range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-sky-800 font-medium hidden md:inline">Preset cepat:</span>
            <button
              onClick={() => {
                const now = new Date();
                setCustomStartYear(now.getFullYear() - 1);
                setCustomStartMonth(now.getMonth());
                setCustomEndYear(now.getFullYear());
                setCustomEndMonth(now.getMonth());
              }}
              className="px-2 py-1 bg-white hover:bg-sky-100/70 border border-sky-200 rounded-md text-[11px] font-bold text-sky-800 transition-all cursor-pointer"
            >
              12 Bln Terakhir
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCustomStartYear(now.getFullYear() - 2);
                setCustomStartMonth(0);
                setCustomEndYear(now.getFullYear());
                setCustomEndMonth(now.getMonth());
              }}
              className="px-2 py-1 bg-white hover:bg-sky-100/70 border border-sky-200 rounded-md text-[11px] font-bold text-sky-800 transition-all cursor-pointer"
            >
              2 Tahun Penuh
            </button>
          </div>
        </div>
      )}

      {/* Split View: Left (Chart) vs Right (Executive Smart Narrative if showNarrative) */}
      <div className={`grid grid-cols-1 ${showNarrative ? "lg:grid-cols-12 gap-5" : "gap-0"} items-stretch`}>
        {/* Left Column: Visual SVG Chart */}
        <div className={`${showNarrative ? "lg:col-span-8" : "w-full"} flex flex-col justify-between relative transition-all duration-300`}>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-medium animate-pulse">
              Memuat data analitik tren pertumbuhan...
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-56 sm:h-64 select-none"
              >
                <defs>
                  <linearGradient id="gradRevenueSplit2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#0369a1" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="gradProfitSplit2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="gradTripsSplit2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="gradClientsSplit2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Gridlines & Labels */}
                {yTicks.map((tick, i) => (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={tick.y}
                      x2={svgWidth - paddingRight}
                      y2={tick.y}
                      stroke="#f1f5f9"
                      strokeDasharray={i === 0 ? "none" : "3,3"}
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={tick.y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono font-medium"
                    >
                      {activeTab === "financial"
                        ? formatCurrency(tick.val, true)
                        : Math.round(tick.val)}
                    </text>
                  </g>
                ))}

                {/* X-Axis Baseline */}
                <line
                  x1={paddingLeft}
                  y1={paddingTop + plotHeight}
                  x2={svgWidth - paddingRight}
                  y2={paddingTop + plotHeight}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />

                {/* Bars plotting */}
                {chartData.map((d, idx) => {
                  const groupCenterX = paddingLeft + (idx + 0.5) * barGroupWidth;
                  const isHovered = hoveredIdx === idx;

                  if (activeTab === "financial") {
                    const revHeight = Math.max(2, (d.revenue / maxValue) * plotHeight);
                    const profHeight = Math.max(2, (d.profit / maxValue) * plotHeight);
                    const revY = paddingTop + plotHeight - revHeight;
                    const profY = paddingTop + plotHeight - profHeight;
                    const revX = groupCenterX - barWidth - 1.5;
                    const profX = groupCenterX + 1.5;

                    return (
                      <g 
                        key={d.key} 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      >
                        <rect
                          x={groupCenterX - barGroupWidth * 0.45}
                          y={paddingTop}
                          width={barGroupWidth * 0.9}
                          height={plotHeight}
                          fill={isHovered ? "#f8fafc" : "transparent"}
                          rx="6"
                        />
                        <rect
                          x={revX}
                          y={revY}
                          width={barWidth}
                          height={revHeight}
                          rx="4"
                          fill="url(#gradRevenueSplit2)"
                          className="transition-all duration-300"
                          opacity={isHovered ? 1 : 0.9}
                        />
                        <rect
                          x={profX}
                          y={profY}
                          width={barWidth}
                          height={profHeight}
                          rx="4"
                          fill="url(#gradProfitSplit2)"
                          className="transition-all duration-300"
                          opacity={isHovered ? 1 : 0.9}
                        />
                        {d.marginPct > 0 && (barGroupWidth >= 28 || isHovered) && (
                          <text
                            x={profX + barWidth / 2}
                            y={profY - 5}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-black fill-emerald-600"
                          >
                            {d.marginPct.toFixed(0)}%
                          </text>
                        )}
                        <text
                          x={groupCenterX}
                          y={paddingTop + plotHeight + 18}
                          textAnchor="middle"
                          className={`text-[11px] font-bold ${
                            isHovered ? "fill-sky-800 font-black" : "fill-slate-500"
                          }`}
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  }

                  if (activeTab === "operational") {
                    const barH = Math.max(2, (d.trips / maxValue) * plotHeight);
                    const barY = paddingTop + plotHeight - barH;
                    const barX = groupCenterX - barWidth * 0.75;
                    const w = barWidth * 1.5;

                    return (
                      <g 
                        key={d.key} 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      >
                        <rect
                          x={groupCenterX - barGroupWidth * 0.45}
                          y={paddingTop}
                          width={barGroupWidth * 0.9}
                          height={plotHeight}
                          fill={isHovered ? "#f8fafc" : "transparent"}
                          rx="6"
                        />
                        <rect
                          x={barX}
                          y={barY}
                          width={w}
                          height={barH}
                          rx="5"
                          fill="url(#gradTripsSplit2)"
                          className="transition-all duration-300"
                          opacity={isHovered ? 1 : 0.9}
                        />
                        {d.trips > 0 && (
                          <text
                            x={groupCenterX}
                            y={barY - 5}
                            textAnchor="middle"
                            className="text-[10px] font-mono font-black fill-indigo-700"
                          >
                            {d.trips}
                          </text>
                        )}
                        <text
                          x={groupCenterX}
                          y={paddingTop + plotHeight + 18}
                          textAnchor="middle"
                          className={`text-[11px] font-bold ${
                            isHovered ? "fill-indigo-900 font-black" : "fill-slate-500"
                          }`}
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  }

                  // clients
                  const clientH = Math.max(2, (d.clientCount / maxValue) * plotHeight);
                  const clientY = paddingTop + plotHeight - clientH;
                  const clientX = groupCenterX - barWidth * 0.75;
                  const wClient = barWidth * 1.5;

                  return (
                    <g 
                      key={d.key} 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      <rect
                        x={groupCenterX - barGroupWidth * 0.45}
                        y={paddingTop}
                        width={barGroupWidth * 0.9}
                        height={plotHeight}
                        fill={isHovered ? "#f8fafc" : "transparent"}
                        rx="6"
                      />
                      <rect
                        x={clientX}
                        y={clientY}
                        width={wClient}
                        height={clientH}
                        rx="5"
                        fill="url(#gradClientsSplit2)"
                        className="transition-all duration-300"
                        opacity={isHovered ? 1 : 0.9}
                      />
                      {d.clientCount > 0 && (
                        <text
                          x={groupCenterX}
                          y={clientY - 5}
                          textAnchor="middle"
                          className="text-[10px] font-mono font-black fill-violet-700"
                        >
                          {d.clientCount}
                        </text>
                      )}
                      <text
                        x={groupCenterX}
                        y={paddingTop + plotHeight + 18}
                        textAnchor="middle"
                        className={`text-[11px] font-bold ${
                          isHovered ? "fill-violet-900 font-black" : "fill-slate-500"
                        }`}
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Hover Tooltip Overlay */}
          {hoveredIdx !== null && chartData[hoveredIdx] && (
            <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-lg border border-slate-800 text-xs pointer-events-none transition-all duration-200 z-20">
              <div className="font-extrabold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between gap-4">
                <span>Titik: {chartData[hoveredIdx].label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-900/60 text-sky-300 font-mono">
                  {timeframe.toUpperCase()}
                </span>
              </div>
              {activeTab === "financial" && (
                <div className="space-y-1 font-medium">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sky-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      Omset Penjualan:
                    </span>
                    <span className="font-mono font-bold">
                      {formatCurrency(chartData[hoveredIdx].revenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Laba Operasional:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(chartData[hoveredIdx].profit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Margin Laba:</span>
                    <span className="font-mono font-black text-amber-300">
                      {chartData[hoveredIdx].marginPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
              {activeTab === "operational" && (
                <div className="space-y-1 font-medium">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-indigo-300">Volume Pengiriman:</span>
                    <span className="font-mono font-bold">
                      {chartData[hoveredIdx].trips} Ritase / Trip
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Nilai Rata-rata / Trip:</span>
                    <span className="font-mono font-bold text-sky-300">
                      {chartData[hoveredIdx].trips > 0 
                        ? formatCurrency(chartData[hoveredIdx].revenue / chartData[hoveredIdx].trips) 
                        : "Rp 0"}
                    </span>
                  </div>
                </div>
              )}
              {activeTab === "clients" && (
                <div className="space-y-1 font-medium">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-violet-300">Klien Aktif:</span>
                    <span className="font-mono font-bold">
                      {chartData[hoveredIdx].clientCount} Perusahaan
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Melakukan transaksi pengiriman/billing pada titik ini
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Active Tab Legend */}
          <div className="pt-2 flex items-center gap-4 text-xs font-semibold">
            {activeTab === "financial" && (
              <>
                <div className="flex items-center gap-1.5 text-sky-800">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-600"></span>
                  <span>Omset Penjualan</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>
                  <span>Laba Operasional</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Margin (%)</span>
                </div>
              </>
            )}

            {activeTab === "operational" && (
              <div className="flex items-center gap-1.5 text-indigo-800">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span>
                <span>Jumlah Ritase Pengiriman (Trips)</span>
              </div>
            )}

            {activeTab === "clients" && (
              <div className="flex items-center gap-1.5 text-violet-800">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-600"></span>
                <span>Jumlah Klien Korporasi Aktif</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Executive Smart Narrative Panel (~35% width, collapsible) */}
        {showNarrative && (
          <div className="lg:col-span-4 bg-gradient-to-b from-slate-50 to-slate-100/70 rounded-2xl p-4.5 border border-slate-200/80 flex flex-col justify-between shadow-2xs transition-all duration-300">
            <div>
              {/* Panel Header with Badge and Close Button */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Lightbulb className="w-3.5 h-3.5 fill-amber-400" />
                  </div>
                  <span>Insight Eksekutif</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${narrativeData.badgeColor}`}>
                    {narrativeData.badgeText}
                  </span>
                  <button
                    onClick={() => setShowNarrative(false)}
                    title="Perlebar Grafik (Sembunyikan Insight)"
                    className="w-6 h-6 rounded-full bg-slate-200/80 hover:bg-[#223249] hover:text-white text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Smart Narrative Story Paragraph */}
              <div className="text-xs text-slate-600 leading-relaxed font-normal bg-white/80 p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
                {narrativeData.storyParagraph}
              </div>
            </div>

            {/* Key Metric Highlights */}
            <div className="pt-3 mt-3 border-t border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{narrativeData.metric1.label}:</span>
                <span className={`font-mono font-black ${narrativeData.metric1.color}`}>
                  {narrativeData.metric1.val}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{narrativeData.metric2.label}:</span>
                <span className={`font-mono font-black ${narrativeData.metric2.color}`}>
                  {narrativeData.metric2.val}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{narrativeData.metric3.label}:</span>
                <span className={`font-mono font-black ${narrativeData.metric3.color}`}>
                  {narrativeData.metric3.val}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary Pills */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Rentang aktif: <strong className="text-slate-700">{explicitRangeLabel}</strong></span>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "financial" && (
            <>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Akumulasi Omset</div>
                <div className="text-xs font-black text-sky-900 font-mono">
                  {formatCurrency(summaryTotals.totalRev, true)}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Profit</div>
                <div className="text-xs font-black text-emerald-700 font-mono">
                  {formatCurrency(summaryTotals.totalProf, true)}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Rata-rata Margin</div>
                <div className="text-xs font-black text-slate-800 font-mono">
                  {summaryTotals.avgMargin.toFixed(1)}%
                </div>
              </div>
            </>
          )}

          {activeTab === "operational" && (
            <>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Ritase</div>
                <div className="text-xs font-black text-indigo-900 font-mono">
                  {summaryTotals.totalTrips} Pengiriman
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Rerata Omset / Trip</div>
                <div className="text-xs font-black text-slate-800 font-mono">
                  {formatCurrency(summaryTotals.avgTripVal, true)}
                </div>
              </div>
            </>
          )}

          {activeTab === "clients" && (
            <>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Rerata Klien / Titik</div>
                <div className="text-xs font-black text-violet-900 font-mono">
                  {summaryTotals.avgClientsPerMonth.toFixed(1)} Klien
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Puncak Klien Aktif</div>
                <div className="text-xs font-black text-slate-800 font-mono">
                  {summaryTotals.maxClientInMonth} Klien
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
