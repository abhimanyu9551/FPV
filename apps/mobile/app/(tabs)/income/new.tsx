import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useCreateIncomeEntry, useIncomeSources } from '@/lib/hooks/useIncome';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, Radius, Spacing, Typography } from '@/lib/colors';

export default function NewIncomeScreen() {
  const router = useRouter();
  const { data: sources } = useIncomeSources();
  const createEntry = useCreateIncomeEntry();

  const [sourceId, setSourceId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    if (!sourceId || !amount || !receivedAt) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }
    try {
      await createEntry.mutateAsync({
        sourceId,
        amount: parseFloat(amount),
        currency,
        receivedAt,
        notes: notes || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Add Income" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Source chips */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Income Source *</Text>
            <View style={styles.chipRow}>
              {sources?.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSourceId(s.id)}
                  style={[
                    styles.chip,
                    sourceId === s.id
                      ? { backgroundColor: Colors.primary, borderColor: Colors.primary }
                      : { backgroundColor: Colors.surfaceContainerLowest, borderColor: Colors.outlineVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: sourceId === s.id ? Colors.white : Colors.onSurface },
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Amount *"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          {/* Currency chips */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Currency</Text>
            <View style={styles.chipRow}>
              {['GBP', 'INR', 'USD'].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCurrency(c)}
                  style={[
                    styles.chip,
                    currency === c
                      ? { backgroundColor: Colors.secondary, borderColor: Colors.secondary }
                      : { backgroundColor: Colors.surfaceContainerLowest, borderColor: Colors.outlineVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: currency === c ? Colors.white : Colors.onSurface },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Date Received *"
            value={receivedAt}
            onChangeText={setReceivedAt}
            placeholder="YYYY-MM-DD"
          />

          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes..."
            multiline
            numberOfLines={3}
          />

          <Button
            label="Add Income Entry"
            onPress={handleSubmit}
            loading={createEntry.isPending}
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
  section: { gap: Spacing.sm },
  fieldLabel: {
    ...Typography.label,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 2,
  },
  chipLabel: { ...Typography.label },
  submitBtn: { marginTop: Spacing.sm },
});
