import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDebt, useUpdateDebt, useRecordDebtPayment } from '@/lib/hooks/useDebts';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography } from '@/lib/colors';

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export default function EditDebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: debt, isLoading } = useDebt(id);
  const updateDebt = useUpdateDebt(id);
  const recordPayment = useRecordDebtPayment(id);

  const [outstanding, setOutstanding] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [notes, setNotes] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (debt) {
      setOutstanding(String(debt.outstandingBalance));
      setInterestRate(String(debt.interestRate ?? ''));
      setMinPayment(String(debt.minimumPayment ?? ''));
      setNotes(debt.notes ?? '');
    }
  }, [debt]);

  async function handleUpdate() {
    try {
      await updateDebt.mutateAsync({
        outstandingBalance: parseFloat(outstanding),
        interestRate: parseFloat(interestRate) || 0,
        minimumPayment: parseFloat(minPayment) || undefined,
        notes: notes || undefined,
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
        currency: debt?.currency ?? 'GBP',
        paidAt: payDate,
      });
      Alert.alert('Payment recorded', `${fmt(parseFloat(payAmount), debt?.currency)} payment logged`);
      setPayAmount('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (isLoading) return <LoadingState message="Loading debt..." />;
  if (!debt) return null;

  const pct = debt.principalAmount > 0
    ? ((debt.principalAmount - debt.outstandingBalance) / debt.principalAmount) * 100
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={debt.name} showBack subtitle={debt.type.replace(/_/g, ' ')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <Card color={Colors.inverseSurface} style={styles.progressCard}>
            <Text style={styles.progressLabel}>Paid off</Text>
            <Text style={styles.progressValue}>{Math.round(pct)}%</Text>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` as any }]} />
            </View>
            <Text style={styles.progressSub}>
              {fmt(debt.principalAmount - debt.outstandingBalance, debt.currency)} of {fmt(debt.principalAmount, debt.currency)}
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
              />
              <Button
                label="Record Payment"
                onPress={handlePayment}
                variant="secondary"
                loading={recordPayment.isPending}
              />
            </Card>
          </View>

          {/* Edit fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Details</Text>
            <Input label="Outstanding Balance" value={outstanding} onChangeText={setOutstanding} placeholder="0.00" keyboardType="decimal-pad" />
            <Input label="Interest Rate (%)" value={interestRate} onChangeText={setInterestRate} placeholder="0.0" keyboardType="decimal-pad" />
            <Input label="Minimum Monthly Payment" value={minPayment} onChangeText={setMinPayment} placeholder="0.00" keyboardType="decimal-pad" />
            <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes..." multiline numberOfLines={3} />
            <Button label="Save Changes" onPress={handleUpdate} loading={updateDebt.isPending} />
          </View>
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
});
