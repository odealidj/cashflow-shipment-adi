'use client';

/**
 * Shared Calculation Hook & Utilities for Cashflow Shipment
 * Sesuai dokumen proses bisnis: docs/proses-bisnis/01-proses-bisnis-cashflow.md
 */

export interface CalculationInputs {
  kredit: number;
  debit: number;
  grandCost: number;
  grandSelling: number;
  dateOfEntry: string;
  topDays: number;
}

export interface CalculationOutputs {
  saldo: number;
  profit: number;
  marginPct: number;
  dueDate: string;
}

export function calculateProfit(grandSelling: number, grandCost: number): number {
  return grandSelling - grandCost;
}

export function calculateMarginPct(profit: number, grandSelling: number): number {
  if (grandSelling <= 0) return 0;
  return Number(((profit / grandSelling) * 100).toFixed(2));
}

export function calculateDueDate(dateStr: string, topDays: number): string {
  if (!dateStr) return '';
  if (isNaN(topDays) || topDays <= 0) return dateStr;
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  d.setDate(d.getDate() + Number(topDays));
  return d.toISOString().split('T')[0];
}

export function useAutoCalculate(inputs: CalculationInputs, previousSaldo = 0): CalculationOutputs {
  const saldo = previousSaldo + Number(inputs.kredit || 0) - Number(inputs.debit || 0);
  const profit = calculateProfit(Number(inputs.grandSelling || 0), Number(inputs.grandCost || 0));
  const marginPct = calculateMarginPct(profit, Number(inputs.grandSelling || 0));
  const dueDate = calculateDueDate(inputs.dateOfEntry, Number(inputs.topDays || 0));

  return {
    saldo,
    profit,
    marginPct,
    dueDate
  };
}

export function formatRupiah(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
