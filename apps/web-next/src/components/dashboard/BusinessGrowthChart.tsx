"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  ArrowRight,
  Maximize2,
  Minimize2,
  Tv,
  X,
  Table,
  ExternalLink
} from "lucide-react";
import { ChartInfoPopover } from "@/components/shared/ChartInfoPopover";
import { SmartNarrativeBox } from "@/components/shared/SmartNarrativeBox";

export type MetricTab = "financial" | "operational" | "clients";
export type TimeframePeriod = 
  | "this_month"
  | "last_month"
  | "3m"
  | "6m"
  | "1y"
  | "this_year_q"
  | "last_year_q"
  | "4q"
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
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

export function BusinessGrowthChart({
  cashflowEntries,
  invoices,
  loading = false
}: BusinessGrowthChartProps) {
  const [timeframe, setTimeframe] = useState<TimeframePeriod>("this_year_q");
  const [hoveredFinancialIdx, setHoveredFinancialIdx] = useState<number | null>(null);
  const [hoveredTripIdx, setHoveredTripIdx] = useState<number | null>(null);
  const [hoveredClientIdx, setHoveredClientIdx] = useState<number | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [focusedChart, setFocusedChart] = useState<"financial" | "trips" | "clients" | null>(null);

  const enterPresentation = () => {
    setIsPresentationMode(true);
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const exitPresentation = () => {
    setIsPresentationMode(false);
    if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document !== "undefined" && !document.fullscreenElement && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (focusedChart) {
          setFocusedChart(null);
        } else if (isPresentationMode) {
          exitPresentation();
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPresentationMode, focusedChart]);

  const isQuarterly = timeframe === "this_year_q" || timeframe === "last_year_q" || timeframe === "4q" || timeframe === "2y";

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
          fullPeriodName: `${item.label} (${MONTH_NAMES[m]} ${y})`,
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
          fullPeriodName: `${item.label} (${MONTH_NAMES[m]} ${y})`,
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
          fullPeriodName: `Tahun ${item.label}`,
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

    // 4. ANALISIS KUARTALAN: Tahun Ini (Q1-Q4) & Tahun Lalu (Q1-Q4)
    if (timeframe === "this_year_q" || timeframe === "last_year_q") {
      const targetYear = timeframe === "this_year_q" ? currentYear : currentYear - 1;
      const qNames = [
        "Januari – Maret",
        "April – Juni",
        "Juli – September",
        "Oktober – Desember"
      ];

      const quarters = [1, 2, 3, 4].map((qNum) => {
        const startM = (qNum - 1) * 3;
        const endM = startM + 2;
        const lastDayOfQ = new Date(targetYear, endM + 1, 0).getDate();
        return {
          key: `${targetYear}-Q${qNum}`,
          label: `Q${qNum} '${String(targetYear).slice(2)}`,
          fullPeriodName: `Q${qNum} ${targetYear} (${qNames[qNum - 1]})`,
          startStr: `${targetYear}-${String(startM + 1).padStart(2, "0")}-01`,
          endStr: `${targetYear}-${String(endM + 1).padStart(2, "0")}-${String(lastDayOfQ).padStart(2, "0")}`,
          revenue: 0,
          profit: 0,
          trips: 0,
          clients: new Set<string>()
        };
      });

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

      return {
        chartData: quarters.map((item) => ({
          key: item.key,
          label: item.label,
          fullPeriodName: item.fullPeriodName,
          revenue: Math.max(0, item.revenue),
          profit: Math.max(0, item.profit),
          marginPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
          trips: item.trips,
          clientCount: item.clients.size
        })),
        explicitRangeLabel: `1 Jan – 31 Des ${targetYear} (Q1 – Q4)`,
        timeframeDisplayLabel: `Tahun ${targetYear} (4 Kuartal: Q1–Q4)`
      };
    }

    // 5. ANALISIS KUARTALAN BERGULIR: 4 Kuartal (Rolling 1 Thn) & 8 Kuartal (2 Tahun)
    if (timeframe === "4q" || timeframe === "2y") {
      const quarterCount = timeframe === "4q" ? 4 : 8;
      const qNames = ["Jan – Mar", "Apr – Jun", "Jul – Sep", "Okt – Des"];
      const quarters: {
        key: string;
        label: string;
        fullPeriodName: string;
        startStr: string;
        endStr: string;
        revenue: number;
        profit: number;
        trips: number;
        clients: Set<string>;
      }[] = [];

      const currentQ = Math.floor(currentMonth / 3) + 1;
      for (let i = quarterCount - 1; i >= 0; i--) {
        const totalQ = currentYear * 4 + currentQ - 1 - i;
        const qYear = Math.floor(totalQ / 4);
        const qNum = (totalQ % 4) + 1;
        const startM = (qNum - 1) * 3;
        const endM = startM + 2;
        const lastDayOfQ = new Date(qYear, endM + 1, 0).getDate();

        quarters.push({
          key: `${qYear}-Q${qNum}`,
          label: `Q${qNum} '${String(qYear).slice(2)}`,
          fullPeriodName: `Q${qNum} ${qYear} (${qNames[qNum - 1]})`,
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
          fullPeriodName: item.fullPeriodName,
          revenue: Math.max(0, item.revenue),
          profit: Math.max(0, item.profit),
          marginPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
          trips: item.trips,
          clientCount: item.clients.size
        })),
        explicitRangeLabel: `${firstQ.label} – ${lastQ.label} (${quarterCount} Kuartal)`,
        timeframeDisplayLabel: timeframe === "4q" ? "4 Kuartal Terakhir (Rolling 1 Thn)" : "8 Kuartal Terakhir (Tren 2 Tahun)"
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
          fullPeriodName: `${MONTH_NAMES[item.month]} ${item.year}`,
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
    const maxTripsInMonth = Math.max(...chartData.map((d) => d.trips), 0);
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
      maxTripsInMonth,
      maxClientInMonth,
      avgClientsPerMonth
    };
  }, [chartData]);

  // Focus Index: find latest point with active data or last item
  const focusIdx = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    let idx = chartData.length - 1;
    if (chartData[idx].revenue === 0 && chartData[idx].trips === 0) {
      for (let i = chartData.length - 1; i >= 0; i--) {
        if (chartData[i].revenue > 0 || chartData[i].trips > 0) {
          idx = i;
          break;
        }
      }
    }
    return idx;
  }, [chartData]);

  const lastItem = chartData[focusIdx];
  const prevItem = focusIdx > 0 ? chartData[focusIdx - 1] : null;

  // 1. Financial Smart Narrative
  const financialNarrative = useMemo(() => {
    if (!lastItem) {
      return {
        badgeText: "DATA MENUNGGU",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        storyParagraph: "Belum ada data finansial yang tercatat pada rentang periode yang dipilih.",
        metric1: { label: "Pertumbuhan", val: "-" },
        metric2: { label: "Margin", val: "-" },
        metric3: { label: "Status", val: "Stabil" }
      };
    }

    const revGrowth = prevItem && prevItem.revenue > 0
      ? ((lastItem.revenue - prevItem.revenue) / prevItem.revenue) * 100
      : 0;
    const marginDiff = prevItem ? lastItem.marginPct - prevItem.marginPct : 0;

    let badgeText = isQuarterly ? "🟢 EKSPANSI KUARTAL POSITIF" : "🟢 TREN EKSPANSI POSITIF";
    let badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";

    if (revGrowth < 0 && lastItem.marginPct < 10) {
      badgeText = isQuarterly ? "🔴 EVALUASI BIAYA KUARTAL" : "🔴 PERLU EVALUASI BIAYA";
      badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
    } else if (revGrowth >= 0 && lastItem.marginPct < 10) {
      badgeText = isQuarterly ? "🟡 MARGIN KUARTAL TERTEKAN" : "🟡 MARGIN TERTEKAN";
      badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
    } else if (revGrowth < 0) {
      badgeText = isQuarterly ? "📉 VOLUME KUARTAL TERKOREKSI" : "📉 VOLUME TERKOREKSI";
      badgeColor = "bg-slate-100 text-slate-800 border-slate-200";
    }

    const isPositiveGrowth = revGrowth >= 0;
    const growthSign = isPositiveGrowth ? "+" : "";

    const comparisonText = prevItem 
      ? isQuarterly 
        ? ` (${growthSign}${revGrowth.toFixed(1)}% QoQ vs ${prevItem.label})` 
        : ` (${growthSign}${revGrowth.toFixed(1)}% vs sebelumnya)` 
      : "";

    const storyParagraph = (
      <>
        Omset pada {isQuarterly ? "kuartal " : "titik "}
        <strong className="text-slate-900">{lastItem.label}</strong> tercatat{" "}
        <strong className="text-sky-800">{formatCurrency(lastItem.revenue, true)}</strong>
        {comparisonText} dengan perolehan laba kotor{" "}
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
        label: isQuarterly ? "Pertumbuhan QoQ" : "Pertumbuhan vs Sebelumnya",
        val: prevItem ? `${growthSign}${revGrowth.toFixed(1)}%` : "Baseline",
        color: isPositiveGrowth ? "text-emerald-700" : "text-rose-700"
      },
      metric2: {
        label: isQuarterly ? "Margin Kuartal Terpilih" : "Margin Periode Terpilih",
        val: `${lastItem.marginPct.toFixed(1)}%`,
        color: "text-slate-900"
      },
      metric3: {
        label: "Total Laba Akumulasi",
        val: formatCurrency(summaryTotals.totalProf, true),
        color: "text-emerald-700"
      }
    };
  }, [lastItem, prevItem, isQuarterly, summaryTotals.totalProf]);

  // 2. Trip / Operational Smart Narrative
  const tripNarrative = useMemo(() => {
    if (!lastItem) {
      return {
        badgeText: "DATA MENUNGGU",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        storyParagraph: "Belum ada data pengiriman armada yang tercatat pada rentang periode yang dipilih.",
        metric1: { label: "Perubahan Ritase", val: "-" },
        metric2: { label: "Rerata Nilai/Trip", val: "-" },
        metric3: { label: "Total Ritase", val: "-" }
      };
    }

    const tripDiff = prevItem ? lastItem.trips - prevItem.trips : 0;
    const isTripUp = tripDiff >= 0;
    const tripSign = isTripUp ? "+" : "";

    const badgeText = isTripUp 
      ? (isQuarterly ? "🚚 RITASE KUARTAL NAIK" : "🚚 RITASE MENINGKAT") 
      : (isQuarterly ? "⏳ RITASE KUARTAL TURUN" : "⏳ RITASE TERKOREKSI");
    const badgeColor = isTripUp 
      ? "bg-indigo-50 text-indigo-800 border-indigo-200" 
      : "bg-slate-100 text-slate-800 border-slate-200";

    const storyParagraph = (
      <>
        Aktivitas pengiriman pada {isQuarterly ? "kuartal " : ""}<strong className="text-slate-900">{lastItem.label}</strong> membukukan{" "}
        <strong className="text-indigo-800">{lastItem.trips} ritase trip</strong>
        {prevItem ? ` (${tripSign}${tripDiff} trip dibanding ${isQuarterly ? prevItem.label : "titik sebelumnya"})` : ""}.
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
        label: isQuarterly ? "Perubahan Ritase QoQ" : "Perubahan Ritase",
        val: prevItem ? `${tripSign}${tripDiff} Trip` : "Baseline",
        color: isTripUp ? "text-indigo-700" : "text-rose-700"
      },
      metric2: {
        label: isQuarterly ? "Rata-rata Nilai / Trip" : "Rata-rata Nilai / Trip",
        val: formatCurrency(summaryTotals.avgTripVal, true),
        color: "text-slate-900"
      },
      metric3: {
        label: "Total Ritase Periode",
        val: `${summaryTotals.totalTrips} Trip`,
        color: "text-indigo-800"
      }
    };
  }, [lastItem, prevItem, isQuarterly, summaryTotals.avgTripVal, summaryTotals.totalTrips]);

  // 3. Client Retention Smart Narrative
  const clientNarrative = useMemo(() => {
    if (!lastItem) {
      return {
        badgeText: "DATA MENUNGGU",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        storyParagraph: "Belum ada data klien korporasi yang tercatat pada rentang periode yang dipilih.",
        metric1: { label: "Dinamika Klien", val: "-" },
        metric2: { label: "Rerata Klien", val: "-" },
        metric3: { label: "Puncak Klien", val: "-" }
      };
    }

    const clientDiff = prevItem ? lastItem.clientCount - prevItem.clientCount : 0;
    const isClientUp = clientDiff >= 0;
    const clientSign = isClientUp ? "+" : "";

    const badgeText = lastItem.clientCount >= 3 
      ? (isQuarterly ? "👥 RETENSI KLIEN KUAT" : "👥 BASIS KLIEN KUAT") 
      : "📈 PENETRASI KLIEN";
    const badgeColor = "bg-violet-50 text-violet-800 border-violet-200";

    const storyParagraph = (
      <>
        Tercatat <strong className="text-violet-800">{lastItem.clientCount} perusahaan klien aktif</strong> bertransaksi
        pada rentang {isQuarterly ? "kuartal " : ""}<strong className="text-slate-900">{lastItem.label}</strong>
        {prevItem ? ` (${clientSign}${clientDiff} klien dibanding ${isQuarterly ? prevItem.label : "titik sebelumnya"})` : ""}.
        Pola order menunjukkan loyalitas pelanggan korporasi yang konsisten dengan pengiriman berulang (*repeat order*).
      </>
    );

    return {
      badgeText,
      badgeColor,
      storyParagraph,
      metric1: {
        label: isQuarterly ? "Dinamika Klien QoQ" : "Dinamika Klien Aktif",
        val: prevItem ? `${clientSign}${clientDiff} Klien` : "Baseline",
        color: isClientUp ? "text-violet-700" : "text-rose-700"
      },
      metric2: {
        label: isQuarterly ? "Rerata Klien / Kuartal" : "Rerata Klien / Titik",
        val: `${summaryTotals.avgClientsPerMonth.toFixed(1)} Klien`,
        color: "text-slate-900"
      },
      metric3: {
        label: isQuarterly ? "Puncak Klien Kuartal" : "Puncak Klien Aktif",
        val: `${summaryTotals.maxClientInMonth} Perusahaan`,
        color: "text-violet-800"
      }
    };
  }, [lastItem, prevItem, isQuarterly, summaryTotals.avgClientsPerMonth, summaryTotals.maxClientInMonth]);

  // Chart 1 (Financial) SVG Dimensions & Scales
  const financialBaseSvgWidth = 880;
  const financialMinBarGroupWidth = chartData.length > 12 ? 40 : 48;
  const financialSvgWidth = Math.max(financialBaseSvgWidth, chartData.length * financialMinBarGroupWidth);
  const financialSvgHeight = 220;
  const financialPaddingLeft = 60;
  const financialPaddingRight = 20;
  const financialPaddingTop = 25;
  const financialPaddingBottom = 35;
  const financialPlotWidth = financialSvgWidth - financialPaddingLeft - financialPaddingRight;
  const financialPlotHeight = financialSvgHeight - financialPaddingTop - financialPaddingBottom;

  const financialMaxValue = useMemo(() => {
    const max = Math.max(...chartData.map((d) => Math.max(d.revenue, d.profit)), 10_000_000);
    return Math.ceil(max * 1.15);
  }, [chartData]);

  const financialYTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = financialMaxValue * ratio;
      const y = financialPaddingTop + financialPlotHeight - ratio * financialPlotHeight;
      return { val, y, ratio };
    });
  }, [financialMaxValue, financialPlotHeight]);

  const financialBarGroupWidth = financialPlotWidth / (chartData.length || 1);
  const financialBarWidth = Math.min(financialBarGroupWidth * 0.32, 24);

  // Chart 2 (Trips) SVG Dimensions & Scales
  const tripBaseSvgWidth = 460;
  const tripMinBarGroupWidth = chartData.length > 12 ? 34 : 40;
  const tripSvgWidth = Math.max(tripBaseSvgWidth, chartData.length * tripMinBarGroupWidth);
  const tripSvgHeight = 200;
  const tripPaddingLeft = 40;
  const tripPaddingRight = 15;
  const tripPaddingTop = 25;
  const tripPaddingBottom = 35;
  const tripPlotWidth = tripSvgWidth - tripPaddingLeft - tripPaddingRight;
  const tripPlotHeight = tripSvgHeight - tripPaddingTop - tripPaddingBottom;

  const tripMaxValue = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.trips), 5);
    return Math.ceil(max * 1.25);
  }, [chartData]);

  const tripYTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = Math.round(tripMaxValue * ratio);
      const y = tripPaddingTop + tripPlotHeight - ratio * tripPlotHeight;
      return { val, y, ratio };
    });
  }, [tripMaxValue, tripPlotHeight]);

  const tripBarGroupWidth = tripPlotWidth / (chartData.length || 1);
  const tripBarWidth = Math.min(tripBarGroupWidth * 0.45, 26);

  // Chart 3 (Clients) SVG Dimensions & Scales
  const clientBaseSvgWidth = 460;
  const clientMinBarGroupWidth = chartData.length > 12 ? 34 : 40;
  const clientSvgWidth = Math.max(clientBaseSvgWidth, chartData.length * clientMinBarGroupWidth);
  const clientSvgHeight = 200;
  const clientPaddingLeft = 35;
  const clientPaddingRight = 15;
  const clientPaddingTop = 25;
  const clientPaddingBottom = 35;
  const clientPlotWidth = clientSvgWidth - clientPaddingLeft - clientPaddingRight;
  const clientPlotHeight = clientSvgHeight - clientPaddingTop - clientPaddingBottom;

  const clientMaxValue = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.clientCount), 4);
    return Math.ceil(max * 1.3);
  }, [chartData]);

  const clientYTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = Math.round(clientMaxValue * ratio);
      const y = clientPaddingTop + clientPlotHeight - ratio * clientPlotHeight;
      return { val, y, ratio };
    });
  }, [clientMaxValue, clientPlotHeight]);

  const clientBarGroupWidth = clientPlotWidth / (chartData.length || 1);
  const clientBarWidth = Math.min(clientBarGroupWidth * 0.45, 26);

  return (
    <div className={isPresentationMode 
      ? "fixed inset-0 z-50 bg-[#090f1e] text-slate-100 overflow-y-auto p-4 sm:p-8 space-y-6 soft-scrollbar animate-in fade-in duration-200" 
      : "space-y-3.5"
    }>
      {/* If in presentation mode, show Boardroom Top Banner */}
      {isPresentationMode && (
        <div className="bg-[#121c32] border border-slate-700/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Mode Presentasi Rapat (Boardroom)
                </span>
                <span className="text-xs text-slate-400 font-semibold">• PT Adijayantara Logistics Indonesia</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                Evaluasi Makro: Finansial, Ritase Armada & Retensi Klien
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Rentang Terpilih: <strong className="text-slate-200">{explicitRangeLabel}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as TimeframePeriod)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
              >
                <optgroup label="Analisis Kuartalan (Quarterly / QoQ)" className="bg-slate-900 text-white">
                  <option value="this_year_q">Tahun Ini (4 Kuartal: Q1–Q4 {new Date().getFullYear()})</option>
                  <option value="4q">4 Kuartal Terakhir (QoQ Rolling 1 Thn)</option>
                  <option value="last_year_q">Tahun Lalu (4 Kuartal: Q1–Q4 {new Date().getFullYear() - 1})</option>
                  <option value="2y">8 Kuartal Terakhir (Tren 2 Tahun)</option>
                </optgroup>
                <optgroup label="Tren Bulanan" className="bg-slate-900 text-white">
                  <option value="3m">3 Bulan Terakhir</option>
                  <option value="6m">6 Bulan Terakhir (Standar)</option>
                  <option value="1y">1 Tahun Terakhir (12 Bln)</option>
                </optgroup>
                <optgroup label="Fokus Bulanan (Tren Mingguan)" className="bg-slate-900 text-white">
                  <option value="this_month">Bulan Ini (Mingguan)</option>
                  <option value="last_month">Bulan Lalu (Mingguan)</option>
                </optgroup>
                <optgroup label="Tren Makro Tahunan" className="bg-slate-900 text-white">
                  <option value="3y">3 Tahun Terakhir (Tahunan)</option>
                  <option value="5y">5 Tahun Terakhir (Tahunan)</option>
                </optgroup>
              </select>
            </div>

            <button
              type="button"
              onClick={exitPresentation}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white border border-rose-500/50 shadow-sm transition-all cursor-pointer"
              title="Keluar dari Mode Presentasi (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Keluar (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Macro Control & Period Synchronization Bar (Compact 1-Row Format) */}
      {!isPresentationMode && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-4 py-2 sm:px-5 sm:py-2.5 space-y-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Sisi Kiri: Identitas Tren Makro (Compact 1-Row) */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0 shadow-2xs border border-indigo-100">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    TREN MAKRO EKSEKUTIF
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100/80 text-sky-800 border border-sky-200/60">
                    {timeframeDisplayLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">
                    Tren Pertumbuhan Makro & Kapasitas Bisnis
                  </h2>
                  <span className="hidden xl:inline text-xs text-slate-400 font-medium">
                    • Rentang: <span className="font-bold text-sky-800">{explicitRangeLabel}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Controls (Pilih Timeframe + Mode Rapat di paling kanan) */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl px-2.5 py-1.5 transition-all shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Timeframe:</span>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as TimeframePeriod)}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <optgroup label="Analisis Kuartalan (Quarterly / QoQ)">
                    <option value="this_year_q">Tahun Ini (4 Kuartal: Q1–Q4 {new Date().getFullYear()})</option>
                    <option value="4q">4 Kuartal Terakhir (QoQ Rolling 1 Thn)</option>
                    <option value="last_year_q">Tahun Lalu (4 Kuartal: Q1–Q4 {new Date().getFullYear() - 1})</option>
                    <option value="2y">8 Kuartal Terakhir (Tren 2 Tahun)</option>
                  </optgroup>
                  <optgroup label="Tren Bulanan">
                    <option value="3m">3 Bulan Terakhir</option>
                    <option value="6m">6 Bulan Terakhir (Standar)</option>
                    <option value="1y">1 Tahun Terakhir (12 Bln)</option>
                  </optgroup>
                  <optgroup label="Fokus Bulanan (Tren Mingguan)">
                    <option value="this_month">Bulan Ini (Mingguan)</option>
                    <option value="last_month">Bulan Lalu (Mingguan)</option>
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

              {/* Button Mode Rapat (Di paling kanan) */}
              <button
                type="button"
                onClick={enterPresentation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                title="Tampilkan dalam Mode Presentasi Rapat (Layar Penuh TV)"
              >
                <Tv className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>Mode Rapat</span>
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
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCustomStartYear(now.getFullYear());
                  setCustomStartMonth(0);
                  setCustomEndYear(now.getFullYear());
                  setCustomEndMonth(now.getMonth());
                }}
                className="px-2 py-1 bg-white hover:bg-sky-100/70 border border-sky-200 rounded-md text-[11px] font-bold text-sky-800 transition-all cursor-pointer"
              >
                YTD (Jan - Sekarang)
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCustomStartYear(now.getFullYear() - 1);
                  setCustomStartMonth(now.getMonth());
                  setCustomEndYear(now.getFullYear());
                  setCustomEndMonth(now.getMonth());
                }}
                className="px-2 py-1 bg-white hover:bg-sky-100/70 border border-sky-200 rounded-md text-[11px] font-bold text-sky-800 transition-all cursor-pointer"
              >
                12 Bulan Terakhir
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCustomStartYear(now.getFullYear() - 2);
                  setCustomStartMonth(now.getMonth());
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
      </div>
      )}

      {/* CARD 1 (FULL WIDTH): Tren Finansial & Profitabilitas Makro */}
      <div className={`rounded-2xl border transition-all duration-200 ${
        isPresentationMode 
          ? "bg-[#10192e] border-slate-700/80 shadow-2xl p-6 space-y-5" 
          : "bg-white border-slate-200/80 shadow-xs p-4 sm:p-4.5 space-y-3.5"
      }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${
          isPresentationMode ? "border-slate-800" : "border-slate-100"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 border ${
              isPresentationMode ? "bg-sky-950/60 text-sky-400 border-sky-500/30" : "bg-sky-50 text-sky-700 border-sky-100"
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black tracking-tight ${isPresentationMode ? "text-base sm:text-lg text-white" : "text-sm text-slate-900"}`}>
                  Tren Finansial & Profitabilitas Makro
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                  Omset, Laba & Margin %
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Rentang: <strong className={isPresentationMode ? "text-slate-200" : "text-slate-600"}>{explicitRangeLabel}</strong> • Evaluasi omset, laba operasional, dan tren margin kotor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFocusedChart("financial")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isPresentationMode 
                  ? "text-slate-400 hover:text-white hover:bg-slate-800" 
                  : "text-slate-400 hover:text-sky-700 hover:bg-sky-50"
              }`}
              title="Perbesar Grafik & Lihat Rincian Tabel Angka"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <ChartInfoPopover
              title="Tren Finansial & Profitabilitas Makro"
              purpose="Memantau arah perkembangan omset penjualan, laba kotor operasional, dan tren margin keuntungan multi-periode."
              benefits={[
                "Mendeteksi tren ekspansi atau koreksi pendapatan dari kuartal ke kuartal (QoQ).",
                "Mengidentifikasi erosi margin keuntungan sebelum membebani kas perusahaan.",
                "Mengevaluasi efisiensi struktur beban pokok rekanan vendor (HPP) terhadap omset faktur."
              ]}
              formula="Omset = Total Tagihan Faktur | Laba Kotor = Omset - HPP Vendor | Margin % = (Laba / Omset) * 100"
            />
          </div>
        </div>

        {/* Visual SVG Chart (Full Width) */}
        <div className="w-full flex flex-col justify-between relative transition-all duration-300">
          {loading ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-xs font-medium animate-pulse">
              Memuat data analitik tren finansial...
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${financialSvgWidth} ${financialSvgHeight}`}
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
                </defs>

                {/* Y-Axis Gridlines & Labels */}
                {financialYTicks.map((tick, i) => (
                  <g key={i}>
                    <line
                      x1={financialPaddingLeft}
                      y1={tick.y}
                      x2={financialSvgWidth - financialPaddingRight}
                      y2={tick.y}
                      stroke="#f1f5f9"
                      strokeDasharray={i === 0 ? "none" : "3,3"}
                      strokeWidth="1"
                    />
                    <text
                      x={financialPaddingLeft - 8}
                      y={tick.y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono font-medium"
                    >
                      {formatCurrency(tick.val, true)}
                    </text>
                  </g>
                ))}

                {/* Margin % Trend Line */}
                {chartData.length > 1 && (
                  <path
                    d={chartData.map((d, idx) => {
                      const groupCenterX = financialPaddingLeft + idx * financialBarGroupWidth + financialBarGroupWidth / 2;
                      const marginRatio = Math.min(Math.max(d.marginPct / 40, 0), 1);
                      const cy = financialPaddingTop + financialPlotHeight - marginRatio * financialPlotHeight;
                      return `${idx === 0 ? "M" : "L"} ${groupCenterX} ${cy}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.85"
                  />
                )}

                {/* Bars & Interactive Groups */}
                {chartData.map((d, idx) => {
                  const groupCenterX = financialPaddingLeft + idx * financialBarGroupWidth + financialBarGroupWidth / 2;
                  const isHovered = hoveredFinancialIdx === idx;

                  const revHeight = Math.max(2, (d.revenue / financialMaxValue) * financialPlotHeight);
                  const profHeight = Math.max(2, (d.profit / financialMaxValue) * financialPlotHeight);
                  const revY = financialPaddingTop + financialPlotHeight - revHeight;
                  const profY = financialPaddingTop + financialPlotHeight - profHeight;
                  const revX = groupCenterX - financialBarWidth - 1.5;
                  const profX = groupCenterX + 1.5;

                  const marginRatio = Math.min(Math.max(d.marginPct / 40, 0), 1);
                  const marginY = financialPaddingTop + financialPlotHeight - marginRatio * financialPlotHeight;

                  return (
                    <g 
                      key={d.key} 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredFinancialIdx(idx)}
                      onMouseLeave={() => setHoveredFinancialIdx(null)}
                    >
                      <rect
                        x={groupCenterX - financialBarGroupWidth * 0.45}
                        y={financialPaddingTop}
                        width={financialBarGroupWidth * 0.9}
                        height={financialPlotHeight}
                        fill={isHovered ? "#f8fafc" : "transparent"}
                        rx="6"
                      />
                      {/* Revenue Bar */}
                      <rect
                        x={revX}
                        y={revY}
                        width={financialBarWidth}
                        height={revHeight}
                        rx="4"
                        fill="url(#gradRevenueSplit2)"
                        className="transition-all duration-300"
                        opacity={isHovered ? 1 : 0.9}
                      />
                      {/* Profit Bar */}
                      <rect
                        x={profX}
                        y={profY}
                        width={financialBarWidth}
                        height={profHeight}
                        rx="4"
                        fill="url(#gradProfitSplit2)"
                        className="transition-all duration-300"
                        opacity={isHovered ? 1 : 0.9}
                      />
                      {/* Margin Dot */}
                      <circle
                        cx={groupCenterX}
                        cy={marginY}
                        r={isHovered ? 4.5 : 3.5}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      {d.marginPct > 0 && (financialBarGroupWidth >= 28 || isHovered) && (
                        <text
                          x={profX + financialBarWidth / 2}
                          y={profY - 5}
                          textAnchor="middle"
                          className="text-[9px] font-mono font-black fill-emerald-600"
                        >
                          {d.marginPct.toFixed(0)}%
                        </text>
                      )}
                      <text
                        x={groupCenterX}
                        y={financialPaddingTop + financialPlotHeight + 18}
                        textAnchor="middle"
                        className={`text-[11px] font-bold ${
                          isHovered ? "fill-sky-800 font-black" : "fill-slate-500"
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
          {hoveredFinancialIdx !== null && chartData[hoveredFinancialIdx] && (
            <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-lg border border-slate-800 text-xs pointer-events-none transition-all duration-200 z-20">
              <div className="font-extrabold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between gap-4">
                <span>{(chartData[hoveredFinancialIdx] as any).fullPeriodName || `Titik: ${chartData[hoveredFinancialIdx].label}`}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-900/60 text-sky-300 font-mono">
                  {isQuarterly ? "KUARTAL" : timeframe.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1 font-medium">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sky-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    Omset Penjualan:
                  </span>
                  <span className="font-mono font-bold">
                    {formatCurrency(chartData[hoveredFinancialIdx].revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Laba Operasional:
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrency(chartData[hoveredFinancialIdx].profit)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Margin Laba:</span>
                  <span className="font-mono font-black text-amber-300">
                    {chartData[hoveredFinancialIdx].marginPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab Legend */}
          <div className="pt-2 flex items-center gap-4 text-xs font-semibold">
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
          </div>

          {/* Footer Summary Pills */}
          <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
            isPresentationMode ? "border-slate-800" : "border-slate-100"
          }`}>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Rentang aktif: <strong className={isPresentationMode ? "text-slate-200" : "text-slate-700"}>{explicitRangeLabel}</strong></span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Akumulasi Omset</div>
                <div className={`font-mono ${isPresentationMode ? "text-base sm:text-lg font-black text-sky-400" : "text-xs font-black text-sky-900"}`}>
                  {formatCurrency(summaryTotals.totalRev, true)}
                </div>
              </div>
              <div className={`h-6 w-px ${isPresentationMode ? "bg-slate-700" : "bg-slate-200"}`} />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Profit</div>
                <div className={`font-mono ${isPresentationMode ? "text-base sm:text-lg font-black text-emerald-400" : "text-xs font-black text-emerald-700"}`}>
                  {formatCurrency(summaryTotals.totalProf, true)}
                </div>
              </div>
              <div className={`h-6 w-px ${isPresentationMode ? "bg-slate-700" : "bg-slate-200"}`} />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Rata-rata Margin</div>
                <div className={`font-mono ${isPresentationMode ? "text-base sm:text-lg font-black text-amber-400" : "text-xs font-black text-slate-800"}`}>
                  {summaryTotals.avgMargin.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Executive Smart Narrative Box */}
        <SmartNarrativeBox
          status={
            financialNarrative.badgeText.includes("🔴")
              ? "danger"
              : financialNarrative.badgeText.includes("🟡")
              ? "warning"
              : "success"
          }
          title="Insight Eksekutif Tren Finansial"
          badges={[
            {
              label: financialNarrative.badgeText.replace(/^[^\w\s]+/, "").trim(),
              variant: financialNarrative.badgeText.includes("🔴")
                ? "danger"
                : financialNarrative.badgeText.includes("🟡")
                ? "warning"
                : "success"
            },
            {
              label: `${financialNarrative.metric1.label}: ${financialNarrative.metric1.val}`,
              variant: "default"
            },
            {
              label: `${financialNarrative.metric2.label}: ${financialNarrative.metric2.val}`,
              variant: "default"
            },
            {
              label: `${financialNarrative.metric3.label}: ${financialNarrative.metric3.val}`,
              variant: "info"
            }
          ]}
          narrative={financialNarrative.storyParagraph}
        />
      </div>

      {/* ROW 2: 2-COLUMN GRID (Operational Trips & Commercial Clients) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* CARD 2 (KOLOM KIRI): Tren Volume Ritase & Produktivitas Pengiriman */}
        <div className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
          isPresentationMode 
            ? "bg-[#10192e] border-slate-700/80 shadow-2xl p-6 space-y-5" 
            : "bg-white border-slate-200/80 shadow-xs p-4 sm:p-4.5 space-y-3.5"
        }`}>
          <div>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4 ${
              isPresentationMode ? "border-slate-800" : "border-slate-100"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 border ${
                  isPresentationMode ? "bg-indigo-950/60 text-indigo-400 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                }`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-black tracking-tight ${isPresentationMode ? "text-base sm:text-lg text-white" : "text-sm text-slate-900"}`}>
                      Tren Volume Ritase & Utilisasi Armada
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Ritase Trips
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Frekuensi perjalanan armada & rata-rata nilai omset per trip
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFocusedChart("trips")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isPresentationMode 
                      ? "text-slate-400 hover:text-white hover:bg-slate-800" 
                      : "text-slate-400 hover:text-indigo-700 hover:bg-indigo-50"
                  }`}
                  title="Perbesar Grafik & Lihat Rincian Tabel Angka"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <ChartInfoPopover
                  title="Tren Volume Ritase & Produktivitas Pengiriman"
                  purpose="Memantau frekuensi pengiriman logistik armada dan utilisasi kapasitas operasional multi-periode."
                  benefits={[
                    "Mengukur produktivitas pengiriman armada dari kuartal ke kuartal.",
                    "Mendeteksi pola musiman (seasonality) kenaikan atau penurunan ritase jalan.",
                    "Menghitung rerata nilai omset yang dihasilkan per satu kali perjalanan armada."
                  ]}
                  formula="Total Ritase = Akumulasi Ritase Jalan Selesai | Rerata Omset/Trip = Omset / Total Ritase"
                />
              </div>
            </div>

            {/* Visual SVG Chart (Trips) */}
            <div className="w-full flex flex-col justify-between relative transition-all duration-300">
              {loading ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-medium animate-pulse">
                  Memuat data volume ritase...
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${tripSvgWidth} ${tripSvgHeight}`}
                    className="w-full h-48 sm:h-52 select-none"
                  >
                    <defs>
                      <linearGradient id="gradTripsSplit2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Gridlines & Labels */}
                    {tripYTicks.map((tick, i) => (
                      <g key={i}>
                        <line
                          x1={tripPaddingLeft}
                          y1={tick.y}
                          x2={tripSvgWidth - tripPaddingRight}
                          y2={tick.y}
                          stroke="#f1f5f9"
                          strokeDasharray={i === 0 ? "none" : "3,3"}
                          strokeWidth="1"
                        />
                        <text
                          x={tripPaddingLeft - 6}
                          y={tick.y + 3.5}
                          textAnchor="end"
                          className="text-[10px] fill-slate-400 font-mono font-medium"
                        >
                          {tick.val}
                        </text>
                      </g>
                    ))}

                    {/* Trip Bars */}
                    {chartData.map((d, idx) => {
                      const groupCenterX = tripPaddingLeft + idx * tripBarGroupWidth + tripBarGroupWidth / 2;
                      const isHovered = hoveredTripIdx === idx;
                      const barH = Math.max(2, (d.trips / tripMaxValue) * tripPlotHeight);
                      const barY = tripPaddingTop + tripPlotHeight - barH;
                      const barX = groupCenterX - tripBarWidth / 2;

                      return (
                        <g 
                          key={d.key} 
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredTripIdx(idx)}
                          onMouseLeave={() => setHoveredTripIdx(null)}
                        >
                          <rect
                            x={groupCenterX - tripBarGroupWidth * 0.45}
                            y={tripPaddingTop}
                            width={tripBarGroupWidth * 0.9}
                            height={tripPlotHeight}
                            fill={isHovered ? "#f8fafc" : "transparent"}
                            rx="6"
                          />
                          <rect
                            x={barX}
                            y={barY}
                            width={tripBarWidth}
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
                            y={tripPaddingTop + tripPlotHeight + 18}
                            textAnchor="middle"
                            className={`text-[11px] font-bold ${
                              isHovered ? "fill-indigo-900 font-black" : "fill-slate-500"
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

              {/* Hover Tooltip Overlay for Trips */}
              {hoveredTripIdx !== null && chartData[hoveredTripIdx] && (
                <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl px-3 py-2 shadow-lg border border-slate-800 text-xs pointer-events-none transition-all duration-200 z-20">
                  <div className="font-extrabold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between gap-3">
                    <span>{(chartData[hoveredTripIdx] as any).fullPeriodName || `Titik: ${chartData[hoveredTripIdx].label}`}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono">
                      RITASE
                    </span>
                  </div>
                  <div className="space-y-1 font-medium">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-indigo-300">Volume Pengiriman:</span>
                      <span className="font-mono font-bold">
                        {chartData[hoveredTripIdx].trips} Ritase / Trip
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Rerata Nilai / Trip:</span>
                      <span className="font-mono font-bold text-sky-300">
                        {chartData[hoveredTripIdx].trips > 0 
                          ? formatCurrency(chartData[hoveredTripIdx].revenue / chartData[hoveredTripIdx].trips, true) 
                          : "Rp 0"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Legend & Summary Pills for Trips */}
              <div className="pt-2 flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-indigo-800">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span>
                  <span>Jumlah Ritase Pengiriman (Trips)</span>
                </div>
              </div>

              <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${
                isPresentationMode ? "border-slate-800" : "border-slate-100"
              }`}>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Ritase</div>
                  <div className={`font-mono ${isPresentationMode ? "text-base sm:text-lg font-black text-indigo-400" : "text-xs font-black text-indigo-900"}`}>
                    {summaryTotals.totalTrips} Pengiriman
                  </div>
                </div>
                <div className={`h-6 w-px ${isPresentationMode ? "bg-slate-700" : "bg-slate-200"}`} />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Rerata Omset / Trip</div>
                  <div className={`font-mono ${isPresentationMode ? "text-base sm:text-lg font-black text-slate-200" : "text-xs font-black text-slate-800"}`}>
                    {formatCurrency(summaryTotals.avgTripVal, true)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Smart Narrative Box */}
          <div className="mt-4">
            <SmartNarrativeBox
              status={tripNarrative.badgeText.includes("⏳") ? "warning" : "success"}
              title="Insight Eksekutif Utilisasi Ritase"
              badges={[
                {
                  label: tripNarrative.badgeText.replace(/^[^\w\s]+/, "").trim(),
                  variant: tripNarrative.badgeText.includes("⏳") ? "warning" : "success"
                },
                {
                  label: `${tripNarrative.metric1.label}: ${tripNarrative.metric1.val}`,
                  variant: "default"
                },
                {
                  label: `${tripNarrative.metric2.label}: ${tripNarrative.metric2.val}`,
                  variant: "default"
                },
                {
                  label: `${tripNarrative.metric3.label}: ${tripNarrative.metric3.val}`,
                  variant: "info"
                }
              ]}
              narrative={tripNarrative.storyParagraph}
            />
          </div>
        </div>

        {/* CARD 3 (KOLOM KANAN): Tren Basis & Retensi Klien Korporasi */}
        <div className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
          isPresentationMode 
            ? "bg-[#10192e] border-slate-700/80 shadow-2xl p-6 space-y-5" 
            : "bg-white border-slate-200/80 shadow-xs p-4 sm:p-4.5 space-y-3.5"
        }`}>
          <div>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4 ${
              isPresentationMode ? "border-slate-800" : "border-slate-100"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 border ${
                  isPresentationMode ? "bg-violet-950/60 text-violet-400 border-violet-500/30" : "bg-violet-50 text-violet-700 border-violet-100"
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-black tracking-tight ${isPresentationMode ? "text-base sm:text-lg text-white" : "text-sm text-slate-900"}`}>
                      Tren Basis & Retensi Klien Korporasi
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-200">
                      Klien Aktif
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Jumlah perusahaan korporasi bertransaksi aktif per periode
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFocusedChart("clients")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isPresentationMode 
                      ? "text-slate-400 hover:text-white hover:bg-slate-800" 
                      : "text-slate-400 hover:text-violet-700 hover:bg-violet-50"
                  }`}
                  title="Perbesar Grafik & Lihat Rincian Tabel Angka"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <ChartInfoPopover
                  title="Tren Basis & Retensi Klien Korporasi"
                  purpose="Mengevaluasi penetrasi pasar, retensi pelanggan, dan loyalitas klien korporasi yang bertransaksi aktif."
                  benefits={[
                    "Memastikan basis pelanggan korporasi terus bertumbuh atau tetap stabil.",
                    "Mendeteksi dini risiko hilangnya akun pelanggan korporasi penting (churn indicator).",
                    "Mengukur konsistensi transaksi berulang (repeat order) dari akun pelanggan utama."
                  ]}
                  formula="Klien Aktif = Jumlah Unik Customer/Perusahaan dengan Transaksi Pengiriman/Billing Aktif"
                />
              </div>
            </div>

            {/* Visual SVG Chart (Clients) */}
            <div className="w-full flex flex-col justify-between relative transition-all duration-300">
              {loading ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-medium animate-pulse">
                  Memuat data klien korporasi...
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${clientSvgWidth} ${clientSvgHeight}`}
                    className="w-full h-48 sm:h-52 select-none"
                  >
                    <defs>
                      <linearGradient id="gradClientsSplit2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Gridlines & Labels */}
                    {clientYTicks.map((tick, i) => (
                      <g key={i}>
                        <line
                          x1={clientPaddingLeft}
                          y1={tick.y}
                          x2={clientSvgWidth - clientPaddingRight}
                          y2={tick.y}
                          stroke="#f1f5f9"
                          strokeDasharray={i === 0 ? "none" : "3,3"}
                          strokeWidth="1"
                        />
                        <text
                          x={clientPaddingLeft - 6}
                          y={tick.y + 3.5}
                          textAnchor="end"
                          className="text-[10px] fill-slate-400 font-mono font-medium"
                        >
                          {tick.val}
                        </text>
                      </g>
                    ))}

                    {/* Client Bars */}
                    {chartData.map((d, idx) => {
                      const groupCenterX = clientPaddingLeft + idx * clientBarGroupWidth + clientBarGroupWidth / 2;
                      const isHovered = hoveredClientIdx === idx;
                      const clientH = Math.max(2, (d.clientCount / clientMaxValue) * clientPlotHeight);
                      const clientY = clientPaddingTop + clientPlotHeight - clientH;
                      const clientX = groupCenterX - clientBarWidth / 2;

                      return (
                        <g 
                          key={d.key} 
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredClientIdx(idx)}
                          onMouseLeave={() => setHoveredClientIdx(null)}
                        >
                          <rect
                            x={groupCenterX - clientBarGroupWidth * 0.45}
                            y={clientPaddingTop}
                            width={clientBarGroupWidth * 0.9}
                            height={clientPlotHeight}
                            fill={isHovered ? "#f8fafc" : "transparent"}
                            rx="6"
                          />
                          <rect
                            x={clientX}
                            y={clientY}
                            width={clientBarWidth}
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
                            y={clientPaddingTop + clientPlotHeight + 18}
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

              {/* Hover Tooltip Overlay for Clients */}
              {hoveredClientIdx !== null && chartData[hoveredClientIdx] && (
                <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl px-3 py-2 shadow-lg border border-slate-800 text-xs pointer-events-none transition-all duration-200 z-20">
                  <div className="font-extrabold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between gap-3">
                    <span>{(chartData[hoveredClientIdx] as any).fullPeriodName || `Titik: ${chartData[hoveredClientIdx].label}`}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-900/60 text-violet-300 font-mono">
                      KLIEN
                    </span>
                  </div>
                  <div className="space-y-1 font-medium">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-violet-300">Klien Aktif:</span>
                      <span className="font-mono font-bold">
                        {chartData[hoveredClientIdx].clientCount} Perusahaan
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Bertransaksi aktif pada periode ini
                    </p>
                  </div>
                </div>
              )}

              {/* Legend & Summary Pills for Clients */}
              <div className="pt-2 flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-violet-800">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-600"></span>
                  <span>Jumlah Klien Korporasi Aktif</span>
                </div>
              </div>

              <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${
                isPresentationMode ? "border-slate-800" : "border-slate-100"
              }`}>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    {isQuarterly ? "Rerata / Kuartal" : "Rerata / Titik"}
                  </div>
                  <div className={`font-mono ${isPresentationMode ? "text-base sm:text-lg font-black text-violet-400" : "text-xs font-black text-violet-900"}`}>
                    {summaryTotals.avgClientsPerMonth.toFixed(1)} Klien
                  </div>
                </div>
                <div className={`h-6 w-px ${isPresentationMode ? "bg-slate-700" : "bg-slate-200"}`} />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    {isQuarterly ? "Puncak Kuartal" : "Puncak Klien"}
                  </div>
                  <div className={`font-mono ${isPresentationMode ? "text-base sm:text-lg font-black text-slate-200" : "text-xs font-black text-slate-800"}`}>
                    {summaryTotals.maxClientInMonth} Klien
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Smart Narrative Box */}
          <div className="mt-4">
            <SmartNarrativeBox
              status="info"
              title="Insight Eksekutif Retensi Klien"
              badges={[
                {
                  label: clientNarrative.badgeText.replace(/^[^\w\s]+/, "").trim(),
                  variant: "info"
                },
                {
                  label: `${clientNarrative.metric1.label}: ${clientNarrative.metric1.val}`,
                  variant: "default"
                },
                {
                  label: `${clientNarrative.metric2.label}: ${clientNarrative.metric2.val}`,
                  variant: "default"
                },
                {
                  label: `${clientNarrative.metric3.label}: ${clientNarrative.metric3.val}`,
                  variant: "info"
                }
              ]}
              narrative={clientNarrative.storyParagraph}
            />
          </div>
        </div>
      </div>

      {/* FOCUS MODAL: Deep-Dive Chart & Period Breakout Data Table */}
      {focusedChart && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setFocusedChart(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  focusedChart === "financial" ? "bg-sky-100 text-sky-700" :
                  focusedChart === "trips" ? "bg-indigo-100 text-indigo-700" :
                  "bg-violet-100 text-violet-700"
                }`}>
                  {focusedChart === "financial" ? <DollarSign className="w-5 h-5" /> :
                   focusedChart === "trips" ? <Truck className="w-5 h-5" /> :
                   <Users className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900">
                      {focusedChart === "financial" ? "Evaluasi Mendalam: Tren Finansial & Profitabilitas Makro" :
                       focusedChart === "trips" ? "Evaluasi Mendalam: Tren Volume Ritase & Utilisasi Armada" :
                       "Evaluasi Mendalam: Tren Basis & Retensi Klien Korporasi"}
                    </h2>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      focusedChart === "financial" ? "bg-sky-100 text-sky-800 border border-sky-200" :
                      focusedChart === "trips" ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                      "bg-violet-100 text-violet-800 border border-violet-200"
                    }`}>
                      {focusedChart === "financial" ? "Omset, Laba & Margin" :
                       focusedChart === "trips" ? "Ritase Trips" :
                       "Klien Aktif"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Rentang Evaluasi: <strong className="text-slate-700">{explicitRangeLabel}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFocusedChart(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 soft-scrollbar">
              {/* Section 1: KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {focusedChart === "financial" && (
                  <>
                    <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100">
                      <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Akumulasi Omset</span>
                      <p className="text-lg font-black text-sky-950 mt-0.5">{formatCurrency(summaryTotals.totalRev, true)}</p>
                      <span className="text-[10px] text-slate-500 font-medium">{formatCurrency(summaryTotals.totalRev)}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Total Laba Operasional</span>
                      <p className="text-lg font-black text-emerald-950 mt-0.5">{formatCurrency(summaryTotals.totalProf, true)}</p>
                      <span className="text-[10px] text-slate-500 font-medium">{formatCurrency(summaryTotals.totalProf)}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100">
                      <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Rata-rata Margin Kotor</span>
                      <p className="text-lg font-black text-amber-950 mt-0.5">{summaryTotals.avgMargin.toFixed(1)}%</p>
                      <span className="text-[10px] text-slate-500 font-medium">Efisiensi struktur biaya vendor</span>
                    </div>
                  </>
                )}

                {focusedChart === "trips" && (
                  <>
                    <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Total Ritase Pengiriman</span>
                      <p className="text-lg font-black text-indigo-950 mt-0.5">{summaryTotals.totalTrips} Pengiriman</p>
                      <span className="text-[10px] text-slate-500 font-medium">Akumulasi perjalanan armada</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100">
                      <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Rerata Nilai per Ritase</span>
                      <p className="text-lg font-black text-sky-950 mt-0.5">{formatCurrency(summaryTotals.avgTripVal, true)}</p>
                      <span className="text-[10px] text-slate-500 font-medium">Produktivitas per trip</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100">
                      <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">Puncak Ritase Periode</span>
                      <p className="text-lg font-black text-purple-950 mt-0.5">{summaryTotals.maxTripsInMonth} Trip</p>
                      <span className="text-[10px] text-slate-500 font-medium">Frekuensi tertinggi</span>
                    </div>
                  </>
                )}

                {focusedChart === "clients" && (
                  <>
                    <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-100">
                      <span className="text-[10px] font-black uppercase text-violet-700 tracking-wider">Rata-rata Klien Aktif</span>
                      <p className="text-lg font-black text-violet-950 mt-0.5">{summaryTotals.avgClientsPerMonth.toFixed(1)} Klien</p>
                      <span className="text-[10px] text-slate-500 font-medium">Perusahaan aktif per {isQuarterly ? "kuartal" : "bulan"}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Puncak Klien Bertransaksi</span>
                      <p className="text-lg font-black text-indigo-950 mt-0.5">{summaryTotals.maxClientInMonth} Perusahaan</p>
                      <span className="text-[10px] text-slate-500 font-medium">Jumlah akun korporasi terbanyak</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Stabilitas Retensi</span>
                      <p className="text-lg font-black text-emerald-950 mt-0.5">Tinggi</p>
                      <span className="text-[10px] text-slate-500 font-medium">Konsistensi repeat order</span>
                    </div>
                  </>
                )}
              </div>

              {/* Section 2: Visual Chart Canvas (Enlarged Height) */}
              <div className="rounded-2xl border border-slate-200/80 p-4 bg-slate-50/40">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-slate-700">Visualisasi Grafik Pembesaran:</span>
                  {focusedChart === "financial" && (
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#0284c7]" /> Omset</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /> Laba</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Margin %</span>
                    </div>
                  )}
                  {focusedChart === "trips" && (
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" /> Jumlah Ritase Pengiriman
                    </div>
                  )}
                  {focusedChart === "clients" && (
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-violet-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-violet-600" /> Jumlah Perusahaan Korporasi
                    </div>
                  )}
                </div>

                <div className="w-full overflow-x-auto">
                  {focusedChart === "financial" && (
                    <svg viewBox={`0 0 ${financialSvgWidth} ${financialSvgHeight}`} className="w-full h-64 sm:h-72 select-none">
                      <defs>
                        <linearGradient id="focusGradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#0369a1" stopOpacity="0.8" />
                        </linearGradient>
                        <linearGradient id="focusGradProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
                        </linearGradient>
                      </defs>

                      {/* Y-Axis Gridlines & Labels */}
                      {financialYTicks.map((tick, i) => (
                        <g key={i}>
                          <line
                            x1={financialPaddingLeft}
                            y1={tick.y}
                            x2={financialSvgWidth - financialPaddingRight}
                            y2={tick.y}
                            stroke="#e2e8f0"
                            strokeDasharray={i === 0 ? "none" : "3,3"}
                          />
                          <text
                            x={financialPaddingLeft - 10}
                            y={tick.y + 4}
                            textAnchor="end"
                            className="text-[10px] fill-slate-400 font-mono font-medium"
                          >
                            {formatCurrency(tick.val, true)}
                          </text>
                        </g>
                      ))}

                      {/* Margin % Trend Line */}
                      {chartData.length > 1 && (
                        <path
                          d={chartData.map((d, idx) => {
                            const groupCenterX = financialPaddingLeft + idx * financialBarGroupWidth + financialBarGroupWidth / 2;
                            const marginRatio = Math.min(Math.max(d.marginPct / 40, 0), 1);
                            const cy = financialPaddingTop + financialPlotHeight - marginRatio * financialPlotHeight;
                            return `${idx === 0 ? "M" : "L"} ${groupCenterX} ${cy}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeDasharray="4,4"
                        />
                      )}

                      {/* Bars & Interactive Groups */}
                      {chartData.map((d, idx) => {
                        const groupCenterX = financialPaddingLeft + idx * financialBarGroupWidth + financialBarGroupWidth / 2;
                        const revHeight = Math.max(2, (d.revenue / financialMaxValue) * financialPlotHeight);
                        const profHeight = Math.max(2, (d.profit / financialMaxValue) * financialPlotHeight);
                        const revY = financialPaddingTop + financialPlotHeight - revHeight;
                        const profY = financialPaddingTop + financialPlotHeight - profHeight;
                        const revX = groupCenterX - financialBarWidth - 1.5;
                        const profX = groupCenterX + 1.5;

                        const marginRatio = Math.min(Math.max(d.marginPct / 40, 0), 1);
                        const marginY = financialPaddingTop + financialPlotHeight - marginRatio * financialPlotHeight;

                        return (
                          <g key={d.key}>
                            {/* Revenue Bar */}
                            <rect
                              x={revX}
                              y={revY}
                              width={financialBarWidth}
                              height={revHeight}
                              fill="url(#focusGradRevenue)"
                              rx="3"
                            />
                            {/* Profit Bar */}
                            <rect
                              x={profX}
                              y={profY}
                              width={financialBarWidth}
                              height={profHeight}
                              fill="url(#focusGradProfit)"
                              rx="3"
                            />
                            {/* Margin % Marker Dot */}
                            <circle
                              cx={groupCenterX}
                              cy={marginY}
                              r={d.marginPct > 0 ? "4.5" : "3"}
                              fill="#f59e0b"
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                            {/* Value on top of dot */}
                            {d.marginPct > 0 && (
                              <text
                                x={groupCenterX}
                                y={marginY - 8}
                                textAnchor="middle"
                                className="text-[10px] font-black fill-amber-700 font-mono"
                              >
                                {d.marginPct.toFixed(0)}%
                              </text>
                            )}
                            {/* X-Axis Label */}
                            <text
                              x={groupCenterX}
                              y={financialSvgHeight - 10}
                              textAnchor="middle"
                              className="text-[11px] font-black fill-slate-700"
                            >
                              {d.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}

                  {focusedChart === "trips" && (
                    <svg viewBox={`0 0 ${tripSvgWidth} ${tripSvgHeight}`} className="w-full h-56 sm:h-64 select-none">
                      <defs>
                        <linearGradient id="focusGradTrips" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.8" />
                        </linearGradient>
                      </defs>

                      {tripYTicks.map((tick, i) => (
                        <g key={i}>
                          <line
                            x1={tripPaddingLeft}
                            y1={tick.y}
                            x2={tripSvgWidth - tripPaddingRight}
                            y2={tick.y}
                            stroke="#e2e8f0"
                            strokeDasharray={i === 0 ? "none" : "3,3"}
                          />
                          <text
                            x={tripPaddingLeft - 8}
                            y={tick.y + 4}
                            textAnchor="end"
                            className="text-[10px] fill-slate-400 font-mono"
                          >
                            {tick.val}
                          </text>
                        </g>
                      ))}

                      {chartData.map((d, idx) => {
                        const groupCenterX = tripPaddingLeft + idx * tripBarGroupWidth + tripBarGroupWidth / 2;
                        const barHeight = Math.max(2, (d.trips / tripMaxValue) * tripPlotHeight);
                        const barY = tripPaddingTop + tripPlotHeight - barHeight;
                        const barX = groupCenterX - tripBarWidth / 2;

                        return (
                          <g key={d.key}>
                            <rect
                              x={barX}
                              y={barY}
                              width={tripBarWidth}
                              height={barHeight}
                              fill="url(#focusGradTrips)"
                              rx="3"
                            />
                            {d.trips > 0 && (
                              <text
                                x={groupCenterX}
                                y={barY - 6}
                                textAnchor="middle"
                                className="text-[11px] font-black fill-indigo-700 font-mono"
                              >
                                {d.trips}
                              </text>
                            )}
                            <text
                              x={groupCenterX}
                              y={tripSvgHeight - 10}
                              textAnchor="middle"
                              className="text-[11px] font-black fill-slate-700"
                            >
                              {d.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}

                  {focusedChart === "clients" && (
                    <svg viewBox={`0 0 ${clientSvgWidth} ${clientSvgHeight}`} className="w-full h-56 sm:h-64 select-none">
                      <defs>
                        <linearGradient id="focusGradClients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
                        </linearGradient>
                      </defs>

                      {clientYTicks.map((tick, i) => (
                        <g key={i}>
                          <line
                            x1={clientPaddingLeft}
                            y1={tick.y}
                            x2={clientSvgWidth - clientPaddingRight}
                            y2={tick.y}
                            stroke="#e2e8f0"
                            strokeDasharray={i === 0 ? "none" : "3,3"}
                          />
                          <text
                            x={clientPaddingLeft - 8}
                            y={tick.y + 4}
                            textAnchor="end"
                            className="text-[10px] fill-slate-400 font-mono"
                          >
                            {tick.val}
                          </text>
                        </g>
                      ))}

                      {chartData.map((d, idx) => {
                        const groupCenterX = clientPaddingLeft + idx * clientBarGroupWidth + clientBarGroupWidth / 2;
                        const barHeight = Math.max(2, (d.clientCount / clientMaxValue) * clientPlotHeight);
                        const barY = clientPaddingTop + clientPlotHeight - barHeight;
                        const barX = groupCenterX - clientBarWidth / 2;

                        return (
                          <g key={d.key}>
                            <rect
                              x={barX}
                              y={barY}
                              width={clientBarWidth}
                              height={barHeight}
                              fill="url(#focusGradClients)"
                              rx="3"
                            />
                            {d.clientCount > 0 && (
                              <text
                                x={groupCenterX}
                                y={barY - 6}
                                textAnchor="middle"
                                className="text-[11px] font-black fill-violet-700 font-mono"
                              >
                                {d.clientCount}
                              </text>
                            )}
                            <text
                              x={groupCenterX}
                              y={clientSvgHeight - 10}
                              textAnchor="middle"
                              className="text-[11px] font-black fill-slate-700"
                            >
                              {d.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>

              {/* Section 3: Data Breakout Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Table className="w-3.5 h-3.5 text-indigo-600" />
                    Tabel Rincian Angka per Periode (Data Breakout)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Total: {chartData.length} Periode Terdata</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  {focusedChart === "financial" && (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                        <tr>
                          <th className="p-3">Periode</th>
                          <th className="p-3 text-right">Omset Penjualan</th>
                          <th className="p-3 text-right">Beban Pokok (HPP)</th>
                          <th className="p-3 text-right">Laba Operasional</th>
                          <th className="p-3 text-right">Margin %</th>
                          <th className="p-3 text-center">Dinamika QoQ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {chartData.map((d, idx) => {
                          const prev = idx > 0 ? chartData[idx - 1] : null;
                          const hpp = Math.max(0, d.revenue - d.profit);
                          const diffRev = prev && prev.revenue > 0 ? ((d.revenue - prev.revenue) / prev.revenue) * 100 : null;
                          return (
                            <tr key={idx} className="hover:bg-sky-50/40 transition-colors">
                              <td className="p-3 font-bold text-slate-900">{d.label} {(d as any).fullPeriodName ? <span className="text-[11px] text-slate-400 font-normal">({(d as any).fullPeriodName})</span> : null}</td>
                              <td className="p-3 text-right font-black text-sky-900">{formatCurrency(d.revenue)}</td>
                              <td className="p-3 text-right font-medium text-slate-500">{formatCurrency(hpp)}</td>
                              <td className="p-3 text-right font-black text-emerald-700">{formatCurrency(d.profit)}</td>
                              <td className="p-3 text-right font-black text-amber-600">{d.marginPct.toFixed(1)}%</td>
                              <td className="p-3 text-center">
                                {diffRev === null ? (
                                  <span className="text-[10px] text-slate-400 font-medium">-</span>
                                ) : diffRev >= 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                    +{diffRev.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                    {diffRev.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100/80 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                        <tr>
                          <td className="p-3">TOTAL / RERATA</td>
                          <td className="p-3 text-right text-sky-900">{formatCurrency(summaryTotals.totalRev)}</td>
                          <td className="p-3 text-right text-slate-600">{formatCurrency(Math.max(0, summaryTotals.totalRev - summaryTotals.totalProf))}</td>
                          <td className="p-3 text-right text-emerald-800">{formatCurrency(summaryTotals.totalProf)}</td>
                          <td className="p-3 text-right text-amber-700">{summaryTotals.avgMargin.toFixed(1)}%</td>
                          <td className="p-3 text-center text-slate-500">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {focusedChart === "trips" && (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                        <tr>
                          <th className="p-3">Periode</th>
                          <th className="p-3 text-right">Total Ritase (Trips)</th>
                          <th className="p-3 text-right">Omset yang Dihasilkan</th>
                          <th className="p-3 text-right">Rerata Omset / Trip</th>
                          <th className="p-3 text-center">Perubahan Trip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {chartData.map((d, idx) => {
                          const prev = idx > 0 ? chartData[idx - 1] : null;
                          const diffTrip = prev ? d.trips - prev.trips : null;
                          const avgPerTrip = d.trips > 0 ? d.revenue / d.trips : 0;
                          return (
                            <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="p-3 font-bold text-slate-900">{d.label} {(d as any).fullPeriodName ? <span className="text-[11px] text-slate-400 font-normal">({(d as any).fullPeriodName})</span> : null}</td>
                              <td className="p-3 text-right font-black text-indigo-900">{d.trips} Pengiriman</td>
                              <td className="p-3 text-right font-medium text-slate-700">{formatCurrency(d.revenue)}</td>
                              <td className="p-3 text-right font-black text-indigo-700">{formatCurrency(avgPerTrip)}</td>
                              <td className="p-3 text-center">
                                {diffTrip === null ? (
                                  <span className="text-[10px] text-slate-400 font-medium">-</span>
                                ) : diffTrip >= 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                                    +{diffTrip} Trip
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                    {diffTrip} Trip
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100/80 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                        <tr>
                          <td className="p-3">TOTAL / RERATA</td>
                          <td className="p-3 text-right text-indigo-950">{summaryTotals.totalTrips} Pengiriman</td>
                          <td className="p-3 text-right text-slate-800">{formatCurrency(summaryTotals.totalRev)}</td>
                          <td className="p-3 text-right text-indigo-800">{formatCurrency(summaryTotals.avgTripVal)}</td>
                          <td className="p-3 text-center text-slate-500">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {focusedChart === "clients" && (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                        <tr>
                          <th className="p-3">Periode</th>
                          <th className="p-3 text-right">Klien Korporasi Aktif</th>
                          <th className="p-3 text-right">Omset yang Dihasilkan</th>
                          <th className="p-3 text-center">Dinamika Klien</th>
                          <th className="p-3 text-center">Tingkat Penetrasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {chartData.map((d, idx) => {
                          const prev = idx > 0 ? chartData[idx - 1] : null;
                          const diffClient = prev ? d.clientCount - prev.clientCount : null;
                          return (
                            <tr key={idx} className="hover:bg-violet-50/40 transition-colors">
                              <td className="p-3 font-bold text-slate-900">{d.label} {(d as any).fullPeriodName ? <span className="text-[11px] text-slate-400 font-normal">({(d as any).fullPeriodName})</span> : null}</td>
                              <td className="p-3 text-right font-black text-violet-900">{d.clientCount} Perusahaan</td>
                              <td className="p-3 text-right font-medium text-slate-700">{formatCurrency(d.revenue)}</td>
                              <td className="p-3 text-center">
                                {diffClient === null ? (
                                  <span className="text-[10px] text-slate-400 font-medium">-</span>
                                ) : diffClient >= 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-100 text-violet-800">
                                    +{diffClient} Klien
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                    {diffClient} Klien
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                                  {d.clientCount >= 5 ? "Tinggi (Diversified)" : d.clientCount >= 2 ? "Moderat" : "Rintisan"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100/80 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                        <tr>
                          <td className="p-3">PUNCAK / RERATA</td>
                          <td className="p-3 text-right text-violet-950">Rerata {summaryTotals.avgClientsPerMonth.toFixed(1)} Klien (Max: {summaryTotals.maxClientInMonth})</td>
                          <td className="p-3 text-right text-slate-800">{formatCurrency(summaryTotals.totalRev)}</td>
                          <td className="p-3 text-center text-slate-500">-</td>
                          <td className="p-3 text-center text-slate-500">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>

              {/* Section 4: Smart Executive Narrative */}
              <div>
                {focusedChart === "financial" && (
                  <SmartNarrativeBox
                    status={
                      financialNarrative.badgeText.includes("🔴")
                        ? "danger"
                        : financialNarrative.badgeText.includes("🟡")
                        ? "warning"
                        : "success"
                    }
                    title="Insight Eksekutif Tren Finansial"
                    badges={[
                      {
                        label: financialNarrative.badgeText.replace(/^[^\w\s]+/, "").trim(),
                        variant: financialNarrative.badgeText.includes("🔴")
                          ? "danger"
                          : financialNarrative.badgeText.includes("🟡")
                          ? "warning"
                          : "success"
                      },
                      {
                        label: `${financialNarrative.metric1.label}: ${financialNarrative.metric1.val}`,
                        variant: "default"
                      },
                      {
                        label: `${financialNarrative.metric2.label}: ${financialNarrative.metric2.val}`,
                        variant: "default"
                      },
                      {
                        label: `${financialNarrative.metric3.label}: ${financialNarrative.metric3.val}`,
                        variant: "success"
                      }
                    ]}
                    narrative={financialNarrative.storyParagraph}
                  />
                )}

                {focusedChart === "trips" && (
                  <SmartNarrativeBox
                    status={tripNarrative.badgeText.includes("⏳") ? "warning" : "success"}
                    title="Insight Eksekutif Utilisasi Ritase"
                    badges={[
                      {
                        label: tripNarrative.badgeText.replace(/^[^\w\s]+/, "").trim(),
                        variant: tripNarrative.badgeText.includes("⏳") ? "warning" : "success"
                      },
                      {
                        label: `${tripNarrative.metric1.label}: ${tripNarrative.metric1.val}`,
                        variant: "default"
                      },
                      {
                        label: `${tripNarrative.metric2.label}: ${tripNarrative.metric2.val}`,
                        variant: "default"
                      },
                      {
                        label: `${tripNarrative.metric3.label}: ${tripNarrative.metric3.val}`,
                        variant: "success"
                      }
                    ]}
                    narrative={tripNarrative.storyParagraph}
                  />
                )}

                {focusedChart === "clients" && (
                  <SmartNarrativeBox
                    status="info"
                    title="Insight Eksekutif Retensi Klien"
                    badges={[
                      {
                        label: clientNarrative.badgeText.replace(/^[^\w\s]+/, "").trim(),
                        variant: "info"
                      },
                      {
                        label: `${clientNarrative.metric1.label}: ${clientNarrative.metric1.val}`,
                        variant: "default"
                      },
                      {
                        label: `${clientNarrative.metric2.label}: ${clientNarrative.metric2.val}`,
                        variant: "default"
                      },
                      {
                        label: `${clientNarrative.metric3.label}: ${clientNarrative.metric3.val}`,
                        variant: "info"
                      }
                    ]}
                    narrative={clientNarrative.storyParagraph}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
