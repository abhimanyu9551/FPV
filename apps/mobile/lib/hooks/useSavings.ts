import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate?: string;
  description?: string;
  emoji?: string;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amount: number;
  currency: string;
  date: string;
  notes?: string;
}

export function useSavingsGoals() {
  return useQuery<SavingsGoal[]>({
    queryKey: ['savings'],
    queryFn: () => api.get<SavingsGoal[]>('/savings'),
  });
}

export function useCreateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SavingsGoal>) => api.post('/savings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
}
