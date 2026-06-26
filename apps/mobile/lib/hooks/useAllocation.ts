import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface AllocationRule {
  id: string;
  sourceId: string;
  name: string;
  target: string;
  targetId?: string;
  type: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING';
  amount?: number;
  percentage?: number;
  priority: number;
  isActive: boolean;
}

export interface SharedAllocationRule {
  id: string;
  name: string;
  category: string;
  totalAmount: number;
  currency: string;
  isActive: boolean;
  splits: Array<{ sourceId: string; percentage: number }>;
}

export interface MonthlyStatus {
  month: string;
  totalIncome: number;
  totalAllocated: number;
  unprocessedEntries: number;
}

export function useAllocationRules(sourceId: string) {
  return useQuery<AllocationRule[]>({
    queryKey: ['allocation', 'rules', sourceId],
    queryFn: () =>
      api.get<AllocationRule[]>(
        `/salary/allocation-rules?sourceId=${sourceId}`
      ),
    enabled: !!sourceId,
  });
}

export function useSharedRules() {
  return useQuery<SharedAllocationRule[]>({
    queryKey: ['allocation', 'shared'],
    queryFn: () => api.get<SharedAllocationRule[]>('/salary/shared-rules'),
  });
}

export function useMonthlyStatus(month: string) {
  return useQuery<MonthlyStatus>({
    queryKey: ['allocation', 'status', month],
    queryFn: () =>
      api.get<MonthlyStatus>(`/salary/monthly-status?month=${month}`),
    enabled: !!month,
  });
}

export function useProcessMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { month: string }) =>
      api.post('/salary/process-month', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocation'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateAllocationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AllocationRule>) =>
      api.post('/salary/allocation-rules', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allocation'] }),
  });
}

export function useDeleteAllocationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/salary/allocation-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allocation'] }),
  });
}
