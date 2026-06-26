import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export type RuleCategory =
  | 'SAVINGS' | 'INVESTMENT' | 'DEBT' | 'CREDIT_CARD' | 'EMI'
  | 'RENT' | 'MORTGAGE' | 'UTILITIES' | 'GROCERY' | 'LEISURE'
  | 'INSURANCE' | 'INDIAN_ACCOUNT' | 'CUSTOM';

export type AllocationType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING';
export type AllocationTarget = 'ACCOUNT' | 'REMITTANCE_CATEGORY' | 'BUDGET_CATEGORY' | 'SAVINGS_GOAL' | 'DEBT';
export type PaymentResponsibility = 'INDIVIDUAL' | 'SHARED';

export interface FinancialRuleSplit {
  id: string;
  userId: string;
  percent: number;
  user: { id: string; fullName: string; email: string };
}

export interface FinancialRule {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  category: RuleCategory;
  priority: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  allocationType: AllocationType;
  allocationValue?: number | null;
  allocationPercent?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  targetType: AllocationTarget;
  targetId?: string | null;
  paymentResponsibility: PaymentResponsibility;
  incomeSourceId?: string | null;
  carryForward: boolean;
  carryForwardTarget?: string | null;
  savingsGoalId?: string | null;
  splits: FinancialRuleSplit[];
  incomeSource?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  rules: Array<{
    name: string;
    category: RuleCategory;
    allocationType: AllocationType;
    allocationValue?: number | null;
    allocationPercent?: number | null;
    targetType: AllocationTarget;
    priority: number;
    paymentResponsibility?: PaymentResponsibility;
    isActive?: boolean;
  }>;
  createdAt: string;
}

export interface ProcessingSession {
  id: string;
  userId: string;
  sessionType: string;
  status: string;
  totalProcessed?: number | null;
  totalAmount?: number | null;
  ledgerIds: string[];
  notes?: string | null;
  undoneAt?: string | null;
  createdAt: string;
}

export interface PreviewItem {
  financialRuleId: string;
  label: string;
  category: string;
  targetType: string;
  targetId?: string | null;
  totalAllocated: number;
  percentOfCombined: number;
  wasConditionSkipped: boolean;
}

export interface PreviewWarning {
  financialRuleId: string;
  label: string;
  message: string;
  requested: number;
  allocated: number;
}

export interface PreviewResult {
  period: { year: number; month: number };
  sources: Array<{ id: string; name: string; availableGbp: number }>;
  items: PreviewItem[];
  totalIncome: number;
  totalAllocated: number;
  totalRemaining: number;
  warnings: PreviewWarning[];
  hasWarnings: boolean;
  message?: string;
}

export type CreateRuleInput = {
  name: string;
  category: RuleCategory;
  priority: number;
  allocationType: AllocationType;
  allocationValue?: number | null;
  allocationPercent?: number | null;
  targetType: AllocationTarget;
  targetId?: string | null;
  paymentResponsibility?: PaymentResponsibility;
  incomeSourceId?: string | null;
  description?: string | null;
  notes?: string | null;
  isActive?: boolean;
  splits?: Array<{ userId: string; percent: number }>;
};

export function useFinancialRules(filters?: { isActive?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  const qs = params.toString();
  return useQuery<FinancialRule[]>({
    queryKey: ['rules', filters],
    queryFn: () => api.get<FinancialRule[]>(`/rules${qs ? `?${qs}` : ''}`),
  });
}

export function useFinancialRule(id: string) {
  return useQuery<FinancialRule>({
    queryKey: ['rules', id],
    queryFn: () => api.get<FinancialRule>(`/rules/${id}`),
    enabled: !!id,
  });
}

export function useRuleTemplates() {
  return useQuery<RuleTemplate[]>({
    queryKey: ['rules', 'templates'],
    queryFn: () => api.get<RuleTemplate[]>('/rules/templates'),
  });
}

export function useProcessingSessions(limit = 5) {
  return useQuery<ProcessingSession[]>({
    queryKey: ['salary', 'sessions'],
    queryFn: () => api.get<ProcessingSession[]>(`/salary/sessions?limit=${limit}`),
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRuleInput) => api.post<FinancialRule>('/rules', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateRuleInput>) =>
      api.patch<FinancialRule>(`/rules/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

export function useApplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: RuleTemplate) => {
      for (const rule of template.rules) {
        await api.post('/rules', {
          ...rule,
          paymentResponsibility: rule.paymentResponsibility ?? 'INDIVIDUAL',
          isActive: rule.isActive ?? true,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

export function usePreviewV2() {
  return useMutation({
    mutationFn: (data: { year?: number; month?: number }) =>
      api.post<PreviewResult>('/salary/preview-v2', data),
  });
}

export function useProcessV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { year?: number; month?: number }) =>
      api.post<{ session: ProcessingSession; totalAllocated: number }>('/salary/process-v2', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUndoSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post<{ success: boolean }>('/salary/undo', { sessionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
