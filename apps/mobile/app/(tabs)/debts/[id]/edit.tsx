import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDebt, useUpdateDebt, useDeleteDebt, useRecordDebtPayment } from '@/lib/hooks/useDebts';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Radius, Spacing, Typography } from '@/lib/colors';

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

const DEBT_TYPES = ['CREDIT_CARD', 'PERSONAL_LOAN', 'FAMILY_LOAN', 'FRIEND_LOAN', 'MORTGAGE', 'STUDENT_LOAN', 'INFORMAL', 'OTHER'];
const STRATEGIES = ['SNOWBALL', 'AVALANCHE', 'CUSTOM'];
const STATUSES = ['ACTIVE', 'PAID_OFF', 'DEFERRED', 'WRITTEN_OFF'];
const CURRENCIES = ['GBP', 'INR', 'USD', 'EUR'];

function ChipRow({ options, value, onSelect }: { options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContent}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          onPress={() => onSelect(o)}
          style={[styles.chip, value === o && styles.chipActive]}
        >
          <Text style={[styles.chipLabel, value === o && styles.chipLabelActive]}>
            {o.replace(/_/g, ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function EditDebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: debt, isLoading } = useDebt(id);
  const updateDebt = useUpdateDebt(id);
  const deleteDebt = useDeleteDebt();
  const recordPayment = useRecordDebtPayment(id);

  const [name, setName] = useState('');
  const [debtType, setDebtType] = useState('PERSONAL_LOAN');
  const [status, setStatus] = useState('ACTIVE');
  const [creditorName, setCreditorName] = useState('');
  const [currencyCode, setCurrencyCode] = useState('GBP');
  const [repaymentStrategy, setRepaymentStrategy] = useState('AVALANCHE');
  const [originalAmount, setOriginalAmount] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [notes, setNotes] = useState('');

  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (debt) {
      setName(debt.name);
      setDebtType(debt.debtType);
      setStatus(debt.status);
      setCreditorName(debt.creditorName ?? '');
      setCurrencyCode(debt.currencyCode);
      setRepaymentStrategy(debt.repaymentStrategy);
      setOriginalAmount(String(debt.originalAmount));
      setOutstandingBalance(String(debt.outstandingBalance));
      setInterestRate(String(debt.interestRate ?? ''));
      setMinimumPayment(String(debt.minimumPayment ?? ''));
      setNotes(debt.notes ?? '');
    }
  }, [debt?.id]);

  if (isLoading || !debt) return <LoadingState message="Loading debt..." />;
  const safeDebt = debt;

  const principal = Number(safeDebt.originalAmount);
  const outstanding = Number(safeDebt.outstandingBalance);
  const pct = principal > 0 ? ((principal - outstanding) / principal) * 100 : 0;

  async function handleUpdate() {
    if (!name.trim()) {
      Alert.alert('Validation', 'Debt name is required');
      return;
    }
    try {
      await updateDebt.mutateAsync({
        name: name.trim(),
        debtType,
        status,
        creditorName: creditorName.trim() || null,
        currencyCode,
        repaymentStrategy,
        originalAmount: parseFloat(originalAmount) || principal,
        outstandingBalance: parseFloat(outstandingBalance),
        interestRate: parseFloat(interestRate) || null,
        minimumPayment: parseFloat(minimumPayment) || null,
        notes: notes.trim() || null,
      });
      Alert.alert('Updated', 'Debt updated successfully');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handlePayment() {
    if (!payAmount) {
      Alert.alert('Validation', 'Enter a payment amount');
      return;
    }
    try {
      await recordPayment.mutateAsync({
        amount: parseFloat(payAmount),
        currency: safeDebt.currencyCode,
        paidAt: payDate,
      });
      Alert.alert('Payment recorded', `${fmt(parseFloat(payAmount), safeDebt.currencyCode)} payment logged`);
      setPayAmount('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Debt',
      `Delete "${safeDebt.name}"? This will also remove all associated payment records and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDebt.mutateAsync(id);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={safeDebt.name} showBack subtitle={safeDebt.debtType.replace(/_/g, ' ')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Progress */}
          <Card color={Colors.inverseSurface} style={styles.progressCard}>
            <Text style={styles.progressLabel}>Paid off</Text>
            <Text style={styles.progressValue}>{Math.round(pct)}%</Text>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` as any }]} />
            </View>
            <Text style={styles.progressSub}>
              {fmt(principal - outstanding, safeDebt.currencyCode)} of {fmt(principal, safeDebt.currencyCode)}
            </Text>
          </Card>

          {/* Record Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Record Payment</Text>
            <Card style={styles.payCard}>
              <Input
                label="Payment Amount"
                value={payAmount}
                onChangeText={setPayAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <Input
                label="Payment Date"
                value={payDate}
                onChangeText={setPayDate}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />
              <Button
                label="Record Payment"
                onPress={handlePayment}
                variant="secondary"
                loading={recordPayment.isPending}
              />
            </Card>
          </View>

          {/* Edit Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Edit Details</Text>

            <Input label="Debt Name *" value={name} onChangeText={setName} placeholder="e.g. HSBC Credit Card" />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Type</Text>
              <ChipRow options={DEBT_TYPES} value={debtType} onSelect={setDebtType} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Status</Text>
              <ChipRow options={STATUSES} value={status} onSelect={setStatus} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Strategy</Text>
              <ChipRow options={STRATEGIES} value={repaymentStrategy} onSelect={setRepaymentStrategy} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Currency</Text>
              <ChipRow options={CURRENCIES} value={currencyCode} onSelect={setCurrencyCode} />
            </View>

            <Input label="Creditor / Lender" value={creditorName} onChangeText={setCreditorName} placeholder="e.g. HSBC" />
            <Input label="Original Principal" value={originalAmount} onChangeText={setOriginalAmount} placeholder="0.00" keyboardType="decimal-pad" />
            <Input label="Outstanding Balance" value={outstandingBalance} onChangeText={setOutstandingBalance} placeholder="0.00" keyboardType="decimal-pad" />
            <Input label="Interest Rate (% APR)" value={interestRate} onChangeText={setInterestRate} placeholder="0.0" keyboardType="decimal-pad" />
            <Input label="Minimum Monthly Payment" value={minimumPayment} onChangeText={setMinimumPayment} placeholder="0.00" keyboardType="decimal-pad" />
            <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes..." multiline numberOfLines={3} />

            <Button label="Save Changes" onPress={handleUpdate} loading={updateDebt.isPending} />
          </View>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleteDebt.isPending}
            style={[styles.deleteBtn, deleteDebt.isPending && styles.deleteBtnDisabled]}
          >
            <Text style={[styles.deleteBtnText, deleteDebt.isPending && styles.deleteBtnTextDisabled]}>
              {deleteDebt.isPending ? 'Deleting…' : 'Delete Debt'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 40 },

  progressCard: { padding: Spacing.lg, gap: 8 },
  progressLabel: { ...Typography.label, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressValue: { fontSize: 48, fontWeight: '800', color: Colors.white, letterSpacing: -2 },
  progressBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 5 },
  progressFill: { height: 10, borderRadius: 5, backgroundColor: Colors.secondaryFixedDim },
  progressSub: { ...Typography.caption, color: 'rgba(255,255,255,0.5)' },

  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  payCard: { gap: Spacing.md },

  field: { gap: 6 },
  fieldLabel: {
    ...Typography.label,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipScroll: { flexGrow: 0 },
  chipContent: { gap: 8, paddingBottom: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryFixed },
  chipLabel: { ...Typography.label, color: Colors.onSurfaceVariant, fontWeight: '600' },
  chipLabelActive: { color: Colors.primary },

  deleteBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.error,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  deleteBtnDisabled: { borderColor: Colors.outlineVariant, opacity: 0.4 },
  deleteBtnText: { ...Typography.label, color: Colors.error },
  deleteBtnTextDisabled: { color: Colors.onSurfaceVariant },
});
