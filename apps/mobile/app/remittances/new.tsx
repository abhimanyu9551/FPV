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
import { useCreateRemittance, useRemittanceCategories } from '@/lib/hooks/useRemittances';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/lib/colors';

const STATUSES = ['PLANNED', 'INITIATED', 'COMPLETED', 'FAILED'];

export default function NewRemittanceScreen() {
  const router = useRouter();
  const { data: categories } = useRemittanceCategories();
  const createRemittance = useCreateRemittance();

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountInr, setAmountInr] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [status, setStatus] = useState('COMPLETED');
  const [sentAt, setSentAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    if (!categoryId || !amount) {
      Alert.alert('Validation', 'Category and amount are required');
      return;
    }
    try {
      await createRemittance.mutateAsync({
        categoryId,
        amount: parseFloat(amount),
        currency: 'GBP',
        amountInr: amountInr ? parseFloat(amountInr) : undefined,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
        status: status as any,
        sentAt: sentAt || undefined,
        notes: notes || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Add Remittance" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.chips}>
              {categories?.map((cat) => (
                <Card key={cat.id} color={categoryId === cat.id ? Colors.tertiary : Colors.surfaceContainerLowest} padded={false} style={styles.chip}>
                  <Text onPress={() => setCategoryId(cat.id)} style={[styles.chipLabel, { color: categoryId === cat.id ? Colors.white : Colors.onSurface }]}>
                    {cat.name}
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <Input label="Amount (GBP) *" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Amount (INR)" value={amountInr} onChangeText={setAmountInr} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Exchange Rate" value={exchangeRate} onChangeText={setExchangeRate} placeholder="e.g. 107.5" keyboardType="decimal-pad" hint="1 GBP = ? INR" />

          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.chips}>
              {STATUSES.map((s) => (
                <Card key={s} color={status === s ? Colors.secondary : Colors.surfaceContainerLowest} padded={false} style={styles.chip}>
                  <Text onPress={() => setStatus(s)} style={[styles.chipLabel, { color: status === s ? Colors.white : Colors.onSurface }]}>
                    {s}
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <Input label="Date Sent" value={sentAt} onChangeText={setSentAt} placeholder="YYYY-MM-DD" />
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional..." multiline numberOfLines={3} />
          <Button label="Add Remittance" onPress={handleSubmit} loading={createRemittance.isPending} style={styles.btn} />
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
  chip: { paddingHorizontal: 14, paddingVertical: 10 },
  chipLabel: { ...Typography.bodyMedium, fontWeight: '600' },
  btn: { marginTop: Spacing.sm },
});
