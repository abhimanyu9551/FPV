import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFinancialRule } from '@/lib/hooks/useFinancialRules';
import { LoadingState } from '@/components/ui/LoadingState';
import { RuleFormScreen } from '../_components/RuleFormScreen';

export default function EditRuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rule, isLoading } = useFinancialRule(id);

  if (isLoading || !rule) return <LoadingState message="Loading rule..." />;

  return (
    <RuleFormScreen
      title="Edit Rule"
      defaultValues={{
        id: rule.id,
        name: rule.name,
        category: rule.category,
        priority: rule.priority,
        allocationType: rule.allocationType,
        allocationValue: rule.allocationValue ?? undefined,
        allocationPercent: rule.allocationPercent ?? undefined,
        targetType: rule.targetType,
        paymentResponsibility: rule.paymentResponsibility,
        incomeSourceId: rule.incomeSourceId ?? null,
        notes: rule.notes ?? '',
        isActive: rule.isActive,
      }}
    />
  );
}
