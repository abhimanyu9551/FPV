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

export default function NewDebtScreen() {
  const router = useRouter();
  const createDebt = useCreateDebt();

  const [name, setName] = useState('');
  const [type, setType] = useState('PERSONAL_LOAN');
  const [strategy, setStrategy] = useState('AVALANCHE');
  const [currency, setCurrency] = useState('GBP');
  const [principal, setPrincipal] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [lender, setLender] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    if (!name || !principal || !outstanding) {
      Alert.alert('Validation', 'Name, principal, and outstanding balance are required');
      return;
    }
    try {
      await createDebt.mutateAsync({
        name,
        type,
        strategy,
        currency,
        principalAmount: parseFloat(principal),
        outstandingBalance: parseFloat(outstanding),
        interestRate: parseFloat(interestRate) || 0,
        minimumPayment: parseFloat(minPayment) || undefined,
        lender: lender || undefined,
        notes: notes || undefined,
        status: 'ACTIVE',
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function Chips({ options, value, onSelect }: { options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
      <View style={styles.chips}>
        {options.map((o) => (
          <Card key={o} color={value === o ? Colors.primary : Colors.surfaceContainerLowest} padded={false} style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: value === o ? Colors.primary : Colors.outlineVariant }}>
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Add Debt" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Input label="Debt Name *" value={name} onChangeText={setName} placeholder="e.g. HSBC Credit Card" />

          <View style={styles.section}>
            <Text style={styles.label}>Type</Text>
            <Chips options={DEBT_TYPES} value={type} onSelect={setType} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Payoff Strategy</Text>
            <Chips options={STRATEGIES} value={strategy} onSelect={setStrategy} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Currency</Text>
            <Chips options={['GBP', 'INR', 'USD']} value={currency} onSelect={setCurrency} />
          </View>

          <Input label="Original Principal *" value={principal} onChangeText={setPrincipal} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Outstanding Balance *" value={outstanding} onChangeText={setOutstanding} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Interest Rate (%)" value={interestRate} onChangeText={setInterestRate} placeholder="0.0" keyboardType="decimal-pad" />
          <Input label="Minimum Monthly Payment" value={minPayment} onChangeText={setMinPayment} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Lender / Institution" value={lender} onChangeText={setLender} placeholder="e.g. HSBC" />
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
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2 },
  chipLabel: { ...Typography.label, fontWeight: '600' },
  btn: { marginTop: Spacing.sm },
});
