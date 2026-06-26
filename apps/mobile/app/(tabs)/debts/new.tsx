import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useCreateDebt } from '@/lib/hooks/useDebts';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/lib/colors';

const DEBT_TYPES = ['CREDIT_CARD', 'PERSONAL_LOAN', 'FAMILY_LOAN', 'FRIEND_LOAN', 'MORTGAGE', 'STUDENT_LOAN', 'OTHER'];
const STRATEGIES = ['SNOWBALL', 'AVALANCHE', 'CUSTOM'];

function Chips({ options, value, onSelect }: { options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Card
          key={o}
          color={value === o ? Colors.primary : Colors.surfaceContainerLowest}
          padded={false}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: value === o ? Colors.primary : Colors.outlineVariant }}
        >
          <Text
            onPress={() => onSelect(o)}
            style={[styles.chipLabel, { color: value === o ? Colors.white : Colors.onSurface }]}
          >
            {o.replace(/_/g, ' ')}
          </Text>
        </Card>
      ))}
    </View>
  );
}

export default function NewDebtScreen() {
  const router = useRouter();
  const createDebt = useCreateDebt();

  const [name, setName] = useState('');
  const [debtType, setDebtType] = useState('PERSONAL_LOAN');
  const [repaymentStrategy, setRepaymentStrategy] = useState('AVALANCHE');
  const [currencyCode, setCurrencyCode] = useState('GBP');
  const [originalAmount, setOriginalAmount] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [creditorName, setCreditorName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    if (!name || !originalAmount || !outstandingBalance) {
      Alert.alert('Validation', 'Name, principal, and outstanding balance are required');
      return;
    }
    try {
      await createDebt.mutateAsync({
        name,
        debtType,
        repaymentStrategy,
        currencyCode,
        originalAmount: parseFloat(originalAmount),
        outstandingBalance: parseFloat(outstandingBalance),
        interestRate: parseFloat(interestRate) || undefined,
        minimumPayment: parseFloat(minimumPayment) || undefined,
        creditorName: creditorName || undefined,
        startDate,
        notes: notes || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Add Debt" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Input label="Debt Name *" value={name} onChangeText={setName} placeholder="e.g. HSBC Credit Card" />

          <View style={styles.section}>
            <Text style={styles.label}>Type</Text>
            <Chips options={DEBT_TYPES} value={debtType} onSelect={setDebtType} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Payoff Strategy</Text>
            <Chips options={STRATEGIES} value={repaymentStrategy} onSelect={setRepaymentStrategy} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Currency</Text>
            <Chips options={['GBP', 'INR', 'USD']} value={currencyCode} onSelect={setCurrencyCode} />
          </View>

          <Input label="Original Principal *" value={originalAmount} onChangeText={setOriginalAmount} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Outstanding Balance *" value={outstandingBalance} onChangeText={setOutstandingBalance} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Interest Rate (%)" value={interestRate} onChangeText={setInterestRate} placeholder="0.0" keyboardType="decimal-pad" />
          <Input label="Minimum Monthly Payment" value={minimumPayment} onChangeText={setMinimumPayment} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Lender / Institution" value={creditorName} onChangeText={setCreditorName} placeholder="e.g. HSBC" />
          <Input label="Start Date *" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional..." multiline numberOfLines={3} />

          <Button label="Add Debt" onPress={handleSubmit} loading={createDebt.isPending} style={styles.btn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 40 },
  section: { gap: Spacing.sm },
  label: { ...Typography.label, color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipLabel: { ...Typography.label, fontWeight: '600' },
  btn: { marginTop: Spacing.sm },
});
