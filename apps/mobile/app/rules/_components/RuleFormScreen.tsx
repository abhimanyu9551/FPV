import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '@/lib/colors';
import { useIncomeSources } from '@/lib/hooks/useIncome';
import { useCreateRule, useUpdateRule } from '@/lib/hooks/useFinancialRules';
import type {
  RuleCategory,
  AllocationType,
  AllocationTarget,
  PaymentResponsibility,
  CreateRuleInput,
} from '@/lib/hooks/useFinancialRules';

const CATEGORIES: RuleCategory[] = [
  'SAVINGS', 'INVESTMENT', 'DEBT', 'CREDIT_CARD', 'EMI',
  'RENT', 'MORTGAGE', 'UTILITIES', 'GROCERY', 'LEISURE',
  'INSURANCE', 'INDIAN_ACCOUNT', 'CUSTOM',
];

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  SAVINGS: 'Savings', INVESTMENT: 'Invest', DEBT: 'Debt',
  CREDIT_CARD: 'CC', EMI: 'EMI', RENT: 'Rent',
  MORTGAGE: 'Mortgage', UTILITIES: 'Utilities', GROCERY: 'Grocery',
  LEISURE: 'Leisure', INSURANCE: 'Insurance', INDIAN_ACCOUNT: 'India',
  CUSTOM: 'Custom',
};

const TARGET_TYPES: AllocationTarget[] = [
  'ACCOUNT', 'SAVINGS_GOAL', 'DEBT', 'REMITTANCE_CATEGORY', 'BUDGET_CATEGORY',
];

const TARGET_LABELS: Record<AllocationTarget, string> = {
  ACCOUNT: 'Account',
  SAVINGS_GOAL: 'Goal',
  DEBT: 'Debt',
  REMITTANCE_CATEGORY: 'Remittance',
  BUDGET_CATEGORY: 'Budget',
};

interface ChipRowProps<T extends string> {
  options: T[];
  labels?: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}

function ChipRow<T extends string>({ options, labels, value, onChange }: ChipRowProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, value === opt && styles.chipActive]}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
              {labels ? labels[opt] : opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

interface RuleFormScreenProps {
  title: string;
  defaultValues?: Partial<CreateRuleInput & { id: string }>;
}

export function RuleFormScreen({ title, defaultValues }: RuleFormScreenProps) {
  const router = useRouter();
  const { data: sources } = useIncomeSources();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();

  const [name, setName] = useState(defaultValues?.name ?? '');
  const [category, setCategory] = useState<RuleCategory>(defaultValues?.category ?? 'CUSTOM');
  const [priority, setPriority] = useState(String(defaultValues?.priority ?? '1'));
  const [allocationType, setAllocationType] = useState<AllocationType>(
    defaultValues?.allocationType ?? 'FIXED_AMOUNT',
  );
  const [allocationValue, setAllocationValue] = useState(
    String(defaultValues?.allocationValue ?? ''),
  );
  const [allocationPercent, setAllocationPercent] = useState(
    String(defaultValues?.allocationPercent ?? ''),
  );
  const [targetType, setTargetType] = useState<AllocationTarget>(
    defaultValues?.targetType ?? 'ACCOUNT',
  );
  const [paymentResponsibility, setPaymentResponsibility] = useState<PaymentResponsibility>(
    defaultValues?.paymentResponsibility ?? 'INDIVIDUAL',
  );
  const [incomeSourceId, setIncomeSourceId] = useState<string | null>(
    defaultValues?.incomeSourceId ?? null,
  );
  const [notes, setNotes] = useState(defaultValues?.notes ?? '');
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);

  const isEditing = !!defaultValues?.id;
  const isBusy = createRule.isPending || updateRule.isPending;

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Validation', 'Rule name is required');
      return;
    }
    const prio = parseInt(priority, 10);
    if (isNaN(prio) || prio < 1) {
      Alert.alert('Validation', 'Priority must be a number ≥ 1');
      return;
    }
    if (allocationType === 'FIXED_AMOUNT' && !parseFloat(allocationValue)) {
      Alert.alert('Validation', 'Amount is required for Fixed Amount rules');
      return;
    }
    if (allocationType === 'PERCENTAGE' && !parseFloat(allocationPercent)) {
      Alert.alert('Validation', 'Percent is required for Percentage rules');
      return;
    }

    const payload: CreateRuleInput = {
      name: name.trim(),
      category,
      priority: prio,
      allocationType,
      allocationValue: allocationType === 'FIXED_AMOUNT' ? parseFloat(allocationValue) : null,
      allocationPercent: allocationType === 'PERCENTAGE' ? parseFloat(allocationPercent) : null,
      targetType,
      paymentResponsibility,
      incomeSourceId: incomeSourceId || null,
      notes: notes.trim() || null,
      isActive,
    };

    try {
      if (isEditing) {
        await updateRule.mutateAsync({ id: defaultValues!.id!, ...payload });
      } else {
        await createRule.mutateAsync(payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={title} showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Rule Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emergency Fund"
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <ChipRow
              options={CATEGORIES}
              labels={CATEGORY_LABELS}
              value={category}
              onChange={setCategory}
            />
          </View>

          <Input
            label="Priority (lower runs first)"
            value={priority}
            onChangeText={setPriority}
            keyboardType="number-pad"
            placeholder="1"
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Allocation Type</Text>
            <View style={styles.toggleRow}>
              {(['FIXED_AMOUNT', 'PERCENTAGE', 'REMAINING'] as AllocationType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setAllocationType(t)}
                  style={[styles.toggleBtn, allocationType === t && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, allocationType === t && styles.toggleTextActive]}>
                    {t === 'FIXED_AMOUNT' ? 'Fixed £' : t === 'PERCENTAGE' ? 'Percent %' : 'Remaining'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {allocationType === 'FIXED_AMOUNT' && (
            <Input
              label="Amount (£)"
              value={allocationValue}
              onChangeText={setAllocationValue}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          )}
          {allocationType === 'PERCENTAGE' && (
            <Input
              label="Percent (%)"
              value={allocationPercent}
              onChangeText={setAllocationPercent}
              keyboardType="decimal-pad"
              placeholder="10"
            />
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Target Type</Text>
            <ChipRow
              options={TARGET_TYPES}
              labels={TARGET_LABELS}
              value={targetType}
              onChange={setTargetType}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Payment</Text>
            <View style={styles.toggleRow}>
              {(['INDIVIDUAL', 'SHARED'] as PaymentResponsibility[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setPaymentResponsibility(r)}
                  style={[styles.toggleBtn, paymentResponsibility === r && styles.toggleBtnActive, styles.toggleHalf]}
                >
                  <Text style={[styles.toggleText, paymentResponsibility === r && styles.toggleTextActive]}>
                    {r === 'INDIVIDUAL' ? 'Individual' : 'Shared'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {paymentResponsibility === 'SHARED' && (
              <Text style={styles.hint}>Configure splits on the web dashboard after saving.</Text>
            )}
          </View>

          {sources && sources.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Income Source (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    onPress={() => setIncomeSourceId(null)}
                    style={[styles.chip, incomeSourceId === null && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, incomeSourceId === null && styles.chipTextActive]}>
                      Any
                    </Text>
                  </TouchableOpacity>
                  {sources.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setIncomeSourceId(s.id)}
                      style={[styles.chip, incomeSourceId === s.id && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, incomeSourceId === s.id && styles.chipTextActive]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: Colors.outlineVariant, true: Colors.secondary }}
              thumbColor={Colors.white}
            />
          </View>

          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional context..."
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />

          <Button
            label={isEditing ? 'Save Changes' : 'Create Rule'}
            onPress={handleSubmit}
            loading={isBusy}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 40 },
  field: { gap: Spacing.sm },
  fieldLabel: {
    ...Typography.label,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipScroll: { marginHorizontal: -Spacing.xs },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  chipText: { ...Typography.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  chipTextActive: { color: Colors.primary },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  toggleHalf: { flex: 1 },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  toggleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  toggleText: { ...Typography.label, color: Colors.onSurfaceVariant },
  toggleTextActive: { color: Colors.primary },
  hint: { ...Typography.caption, color: Colors.onSurfaceVariant, fontStyle: 'italic' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  switchLabel: { ...Typography.bodyMedium, color: Colors.onSurface },
  notesInput: { textAlignVertical: 'top' },
  submitBtn: { marginTop: Spacing.sm },
});
