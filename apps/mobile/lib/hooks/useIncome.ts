import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface IncomeSource {
  id: string;
  name: string;
  type: string;
  currency: string;
  isActive: boolean;
}

export interface IncomeEntry {
  id: string;
  sourceId: string;
  source?: IncomeSource;
  amount: number;
  currency: string;
  receivedAt: string;
  isProcessed: boolean;
  notes?: string;
}

export function useIncomeSources() {
  return useQuery<IncomeSource[]>({
    queryKey: ['income', 'sources'],
    queryFn: () => api.get<IncomeSource[]>('/income/sources'),
  });
}

export function useIncomeEntries() {
  return useQuery<IncomeEntry[]>({
    queryKey: ['income', 'entries'],
    queryFn: () => api.get<IncomeEntry[]>('/income'),
  });
}

export function useCreateIncomeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sourceId: string;
      amount: number;
      currency: string;
      receivedAt: string;
      notes?: string;
    }) => api.post('/income', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
}

export function useCreateIncomeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string; currency: string }) =>
      api.post('/income/sources', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income', 'sources'] }),
  });
}

export function useIncomeEntry(id: string) {
  return useQuery<IncomeEntry>({
    queryKey: ['income', 'entry', id],
    queryFn: () => api.get<IncomeEntry>(`/income/${id}`),
    enabled: !!id,
  });
}

export function useUpdateIncomeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      originalAmount?: number;
      originalCurrency?: string;
      exchangeRate?: number;
      receivedDate?: string;
      notes?: string | null;
      incomeSourceId?: string;
    }) => api.patch(`/income/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
}

export function useDeleteIncomeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/income/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
}
