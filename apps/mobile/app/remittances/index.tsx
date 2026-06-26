import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRemittances, useRemittanceCategories } from '@/lib/hooks/useRemittances';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { DonutChart } from '@/components/charts/DonutChart';
import { Colors, Spacing, Typography } from '@/lib/colors';

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
  COMPLETED: 'success',
  PLANNED: 'warning',
  INITIATED: 'info',
  FAILED: 'danger',
};

export default function RemittancesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: remittances, isLoading, isFetching, refetch } = useRemittances();
  const { data: categories } = useRemittanceCategories();

  const totalGbp = remittances?.filter((r) => r.status === 'COMPLETED').reduce((s, r) => s + r.amount, 0) ?? 0;
  const totalInr = remittances?.filter((r) => r.status === 'COMPLETED').reduce((s, r) => s + (r.amountInr ?? 0), 0) ?? 0;

  const catColors = [Colors.secondary, Colors.tertiaryContainer, Colors.primary, Colors.inverseSurface, Colors.tertiaryFixedDim];
  const donutData = (categories ?? []).map((cat, i) => {
    const total = remittances?.filter((r) => r.categoryId === cat.id && r.status === 'COMPLETED').reduce((s, r) => s + r.amount, 0) ?? 0;
    return { value: total || 0, color: catColors[i % catColors.length], label: cat.name };
  }).filter((d) => d.value > 0);

  if (isLoading) return <LoadingState message="Loading remittances..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Remittances"
        showBack
        subtitle="India transfers"
        right={
          <TouchableOpacity onPress={() => router.push('/remittances/new' as any)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { qc.invalidateQueries({ queryKey: ['remittances'] }); refetch(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.row}>
          <KpiCard label="Sent (GBP)" value={fmt(totalGbp)} color={Colors.secondary} textLight style={styles.half} />
          <KpiCard label="Sent (INR)" value={fmt(totalInr, 'INR')} color={Colors.tertiaryContainer} textLight style={styles.half} />
        </View>

        {donutData.length > 0 && (
          <Card color={Colors.inverseSurface} style={styles.chartCard}>
            <Text style={styles.chartTitle}>By Category</Text>
            <DonutChart data={donutData} centerValue={fmt(totalGbp)} centerLabel="total" size={150} />
          </Card>
        )}

        {!remittances?.length ? (
          <EmptyState
            icon="✈️"
            title="No remittances yet"
            message="Track your India transfers here"
            actionLabel="Add Remittance"
            onAction={() => router.push('/remittances/new' as any)}
          />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Transfers</Text>
            {remittances.map((r) => (
              <Card key={r.id} style={styles.remCard}>
                <View style={styles.remTop}>
                  <View style={styles.remLeft}>
                    <Text style={styles.remAmount}>{fmt(r.amount, r.currency)}</Text>
                    {r.amountInr && <Text style={styles.remInr}>≈ {fmt(r.amountInr, 'INR')}</Text>}
                  </View>
                  <Badge label={r.status} variant={statusVariant[r.status] ?? 'neutral'} />
                </View>
                <View style={styles.remMeta}>
                  <Text style={styles.remCat}>{r.category?.name ?? 'Unknown'}</Text>
                  {r.sentAt && (
                    <Text style={styles.remDate}>
                      {new Date(r.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                {r.exchangeRate && (
                  <Text style={styles.remRate}>Rate: 1 GBP = {r.exchangeRate.toFixed(2)} INR</Text>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 32 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  chartCard: { padding: Spacing.lg, gap: 8 },
  chartTitle: { ...Typography.h3, color: Colors.white, marginBottom: 4 },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  remCard: { gap: 6 },
  remTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  remLeft: { gap: 2 },
  remAmount: { ...Typography.h3, color: Colors.onSurface },
  remInr: { ...Typography.caption, color: Colors.onSurfaceVariant },
  remMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  remCat: { ...Typography.label, color: Colors.tertiary, fontWeight: '600' },
  remDate: { ...Typography.caption, color: Colors.outline },
  remRate: { ...Typography.caption, color: Colors.outline },
});
