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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography } from '@/lib/colors';

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
  source: string;
}

function fmt(n: number) {
  return n.toFixed(4);
}

export default function SettingsScreen() {
  const qc = useQueryClient();
  const { data: rates, isLoading } = useQuery<ExchangeRate[]>({
    queryKey: ['exchange-rates'],
    queryFn: () => api.get<ExchangeRate[]>('/exchange-rates'),
  });

  const createRate = useMutation({
    mutationFn: (data: { fromCurrency: string; toCurrency: string; rate: number; date: string }) =>
      api.post('/exchange-rates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchange-rates'] }),
  });

  const [from, setFrom] = useState('GBP');
  const [to, setTo] = useState('INR');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  async function handleAddRate() {
    if (!rate) {
      Alert.alert('Validation', 'Rate is required');
      return;
    }
    try {
      await createRate.mutateAsync({ fromCurrency: from, toCurrency: to, rate: parseFloat(rate), date });
      setRate('');
      Alert.alert('Added', `Rate ${from}/${to} = ${rate} saved`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (isLoading) return <LoadingState message="Loading settings..." />;

  const latestGbpInr = rates?.find((r) => r.fromCurrency === 'GBP' && r.toCurrency === 'INR');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Settings" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Current rates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exchange Rates</Text>
            {latestGbpInr && (
              <Card color={Colors.secondary} style={styles.rateHero}>
                <Text style={styles.ratePair}>GBP / INR</Text>
                <Text style={styles.rateValue}>{fmt(latestGbpInr.rate)}</Text>
                <Text style={styles.rateDate}>
                  {new Date(latestGbpInr.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  · {latestGbpInr.source}
                </Text>
              </Card>
            )}

            {(rates ?? []).slice(0, 10).map((r) => (
              <Card key={r.id} style={styles.rateRow}>
                <Text style={styles.ratePairSmall}>{r.fromCurrency} → {r.toCurrency}</Text>
                <Text style={styles.rateValueSmall}>{fmt(r.rate)}</Text>
                <Text style={styles.rateDateSmall}>{new Date(r.date).toLocaleDateString('en-GB')}</Text>
              </Card>
            ))}
          </View>

          {/* Add rate */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Exchange Rate</Text>
            <Card style={styles.addCard}>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Input label="From" value={from} onChangeText={setFrom} placeholder="GBP" autoCapitalize="characters" />
                </View>
                <View style={styles.half}>
                  <Input label="To" value={to} onChangeText={setTo} placeholder="INR" autoCapitalize="characters" />
                </View>
              </View>
              <Input label="Rate" value={rate} onChangeText={setRate} placeholder="e.g. 107.5" keyboardType="decimal-pad" />
              <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
              <Button label="Save Rate" onPress={handleAddRate} loading={createRate.isPending} />
            </Card>
          </View>

          {/* App info */}
          <Card color={Colors.inverseSurface} style={styles.infoCard}>
            <Text style={styles.infoTitle}>FPV Finance</Text>
            <Text style={styles.infoVersion}>Version 1.0.0</Text>
            <Text style={styles.infoDesc}>Family Finance Planner · Mobile App</Text>
          </Card>
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
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  rateHero: { padding: Spacing.lg, gap: 4 },
  ratePair: { ...Typography.label, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  rateValue: { fontSize: 40, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  rateDate: { ...Typography.caption, color: 'rgba(255,255,255,0.5)' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ratePairSmall: { ...Typography.bodyMedium, color: Colors.onSurface, fontWeight: '600', flex: 1 },
  rateValueSmall: { ...Typography.bodyMedium, color: Colors.secondary, fontWeight: '700' },
  rateDateSmall: { ...Typography.caption, color: Colors.onSurfaceVariant },
  addCard: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  infoCard: { padding: Spacing.lg, alignItems: 'center', gap: 4 },
  infoTitle: { ...Typography.h2, color: Colors.white },
  infoVersion: { ...Typography.label, color: 'rgba(255,255,255,0.5)' },
  infoDesc: { ...Typography.caption, color: 'rgba(255,255,255,0.4)' },
});
