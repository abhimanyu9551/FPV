import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface MonthlySnapshot {
  id: string;
  month: string;
  status: 'DRAFT' | 'VERIFIED' | 'APPROVED';
  createdAt: string;
  income?: { totalSalary: number; totalOther: number; totalRemittances: number };
  expense?: { byCategory: Record<string, number>; total: number };
  debt?: { totalOutstanding: number; totalPaid: number };
  netWorth?: { assets: number; liabilities: number; net: number; delta: number };
}

export function useReports() {
  return useQuery<MonthlySnapshot[]>({
    queryKey: ['reports'],
    queryFn: () => api.get<MonthlySnapshot[]>('/reports'),
  });
}

export function useReport(month: string) {
  return useQuery<MonthlySnapshot>({
    queryKey: ['reports', month],
    queryFn: () => api.get<MonthlySnapshot>(`/reports/${month}`),
    enabled: !!month,
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { month: string }) => api.post('/reports', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
}
