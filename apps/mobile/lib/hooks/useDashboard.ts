import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  savingsRate: number;
  totalDebt: number;
  monthlyBudgetUsed: number;
  currency: string;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    category?: string;
  }>;
  debtSummary: Array<{ name: string; balance: number; currency: string }>;
  savingsGoals: Array<{ name: string; current: number; target: number }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  });
}
