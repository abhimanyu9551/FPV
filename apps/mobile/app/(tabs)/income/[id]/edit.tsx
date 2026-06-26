import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIncomeSources, useIncomeEntry, useUpdateIncomeEntry, useDeleteIncomeEntry } from '@/lib/hooks/useIncome';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Radius, Spacing, Typography } from '@/lib/colors';

const CURRENCIES = ['GBP', 'INR', 'USD', 'EUR'];

export default function EditIncomeEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: entry, isLoading } = useIncomeEntry(id);
  const { data: sources } = useIncomeSources();
  const updateEntry = useUpdateIncomeEntry();
  const deleteEntry = useDeleteIncomeEntry();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [exchangeRate, setExchangeRate] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (entry) {
      setAmount(String(entry.amount));
      setCurrency(entry.currency);
      setReceivedDate(entry.receivedAt?.slice(0, 10) ?? '');
      setNotes(entry.notes ?? '');
    }
  }, [entry?.id]);

  if (isLoading || !entry) return <LoadingState message="Loading entry..." />;
  const safeEntry = entry;

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation', 'Amount must be greater than 0');
      return;
    }
    if (!receivedDate) {
      Alert.alert('Validation', 'Date received is required');
      return;
    }
    if (currency !== 'GBP' && !exchangeRate) {
      Alert.alert('Validation', 'Exchange rate is required for non-GBP currencies');
      return;
    }

    try {
      await updateEntry.mutateAsync({
        id,
        originalAmount: parseFloat(amount),
        originalCurrency: currency,
        receivedDate,
        notes: notes.trim() || null,
        ...(currency !== 'GBP' && exchangeRate ? { exchangeRate: parseFloat(exchangeRate) } : {}),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete() {
    if (safeEntry.isProcessed) {
      Alert.alert('Cannot Delete', 'This entry has been allocated. Undo the allocation session first.');
      return;
    }
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this income entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry.mutateAsync(id);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  const source = sources?.find((s) => s.id === (safeEntry as any).incomeSourceId || (safeEntry as any).sourceId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Edit Entry" showBack />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Entry info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{source?.name ?? 'Income Entry'}</Text>
              <Badge
                label={entry.isProcessed ? 'Allocated' : 'Pending'}
                variant={entry.isProcessed ? 'success' : 'warning'}
              />
            </View>
            {entry.isProcessed && (
              <Text style={styles.processedWarning}>
                This entry has been allocated. Editing the amount will not retroactively change ledger entries.
              </Text>
            )}
          </View>

          {/* Amount row */}
          <View style={styles.row}>
            <View style={styles.flex}>
              <Input
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="3000.00"
              />
            </View>
            <View style={styles.currencyCol}>
              <Text style={styles.fieldLabel}>Currency</Text>
              <View style={styles.currencyPicker}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
                  >
                    <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {currency !== 'GBP' && (
            <Input
              label={`Exchange Rate (${currency} per £1)`}
              value={exchangeRate}
              onChangeText={setExchangeRate}
              keyboardType="decimal-pad"
              placeholder="107.50"
              hint={`Current GBP value: £${entry.amount.toFixed(2)}`}
            />
          )}

          <Input
            label="Date Received"
            value={receivedDate}
            onChangeText={setReceivedDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />

          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. June salary"
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />

          <Button
            label="Save Changes"
            onPress={handleSave}
            loading={updateEntry.isPending}
            style={styles.saveBtn}
          />

          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleteEntry.isPending || entry.isProcessed}
            style={[styles.deleteBtn, entry.isProcessed && styles.deleteBtnDisabled]}
          >
            <Text style={[styles.deleteBtnText, entry.isProcessed && styles.deleteBtnTextDisabled]}>
              {deleteEntry.isPending ? 'Deleting…' : 'Delete Entry'}
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
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { ...Typography.bodyMedium, color: Colors.onSurface, fontWeight: '700' },
  processedWarning: { ...Typography.caption, color: Colors.tertiary, lineHeight: 18 },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  currencyCol: { gap: Spacing.sm },
  fieldLabel: {
    ...Typography.label,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  currencyPicker: { gap: 4 },
  currencyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
  },
  currencyBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryFixed },
  currencyText: { ...Typography.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  currencyTextActive: { color: Colors.primary },
  notesInput: { textAlignVertical: 'top' },
  saveBtn: { marginTop: Spacing.sm },
  deleteBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  deleteBtnDisabled: { borderColor: Colors.outlineVariant, opacity: 0.4 },
  deleteBtnText: { ...Typography.label, color: Colors.error },
  deleteBtnTextDisabled: { color: Colors.onSurfaceVariant },
});
