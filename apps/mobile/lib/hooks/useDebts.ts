import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface Debt {
  id: string;
  name: string;
  debtType: string;
  creditorName: string | null;
  originalAmount: number;
  outstandingBalance: number;
  interestRate: number | null;
  minimumPayment: number | null;
  paymentDueDay: number | null;
  currencyCode: string;
  startDate: string;
  maturityDate: string | null;
  repaymentStrategy: string;
  priority: number;
  notes: string | null;
  status: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  currency: string;
  paidAt: string;
  principalPortion?: number;
  interestPortion?: number;
}

export interface DebtPlan {
  debts: Array<{
    debt: Debt;
    monthsToPayoff: number;
    totalInterest: number;
    payoffDate: string;
  }>;
  totalMonths: number;
  totalInterestSaved: number;
}

export interface CreateDebtInput {
  name: string;
  debtType: string;
  creditorName?: string;
  originalAmount: number;
  outstandingBalance: number;
  interestRate?: number;
  minimumPayment?: number;
  paymentDueDay?: number;
  currencyCode?: string;
  startDate: string;
  maturityDate?: string;
  repaymentStrategy?: string;
  priority?: number;
  notes?: string;
}

export function useDebts() {
  return useQuery<Debt[]>({
    queryKey: ['debts'],
    queryFn: () => api.get<Debt[]>('/debts'),
  });
}

export function useDebt(id: string) {
  return useQuery<Debt>({
    queryKey: ['debts', id],
    queryFn: () => api.get<Debt>(`/debts/${id}`),
    enabled: !!id,
  });
}

export function useDebtPlan() {
  return useQuery<DebtPlan>({
    queryKey: ['debts', 'plan'],
    queryFn: () => api.get<DebtPlan>('/debts/plan'),
  });
}

export function useDebtPayments(debtId: string) {
  return useQuery<DebtPayment[]>({
    queryKey: ['debts', debtId, 'payments'],
    queryFn: () => api.get<DebtPayment[]>(`/debts/${debtId}/payments`),
    enabled: !!debtId,
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDebtInput) => api.post('/debts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useUpdateDebt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Omit<Debt, 'id'>>) => api.put(`/debts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/debts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useRecordDebtPayment(debtId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; currency: string; paidAt: string }) =>
      api.post(`/debts/${debtId}/payments`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}
