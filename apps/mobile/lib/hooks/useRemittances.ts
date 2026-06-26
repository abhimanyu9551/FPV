import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface RemittanceCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Remittance {
  id: string;
  categoryId: string;
  category?: RemittanceCategory;
  amount: number;
  currency: string;
  amountInr?: number;
  exchangeRate?: number;
  status: 'PLANNED' | 'INITIATED' | 'COMPLETED' | 'FAILED';
  sentAt?: string;
  notes?: string;
}

export function useRemittanceCategories() {
  return useQuery<RemittanceCategory[]>({
    queryKey: ['remittances', 'categories'],
    queryFn: () => api.get<RemittanceCategory[]>('/remittances/categories'),
  });
}

export function useRemittances() {
  return useQuery<Remittance[]>({
    queryKey: ['remittances'],
    queryFn: () => api.get<Remittance[]>('/remittances'),
  });
}

export function useCreateRemittance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Remittance>) =>
      api.post('/remittances', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['remittances'] }),
  });
}
