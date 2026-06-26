import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { DonutChart } from '@/components/charts/DonutChart';
import { Colors, Spacing, Typography } from '@/lib/colors';

interface Investment {
  id: string;
  name: string;
  type: string;
  currentValue: number;
  purchaseValue: number;
  currency: string;
  institution?: string;
}

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

const typeEmoji: Record<string, string> = {
  STOCKS: '📈',
  MUTUAL_FUND: '📊',
  INDEX_FUND: '🏦',
  FIXED_DEPOSIT: '🔒',
  CHIT_FUND: '🤝',
  BONDS: '📄',
  CRYPTO: '₿',
  OTHER: '💼',
};

export default function InvestmentsScreen() {
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['investments'],
    queryFn: () => api.get<Investment[]>('/investments'),
  });

  const total = investments?.reduce((s, i) => s + i.currentValue, 0) ?? 0;
  const totalCost = investments?.reduce((s, i) => s + i.purchaseValue, 0) ?? 0;
  const gain = total - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;

  const catColors = [Colors.secondary, Colors.tertiaryContainer, Colors.primary, Colors.tertiaryFixedDim, Colors.inverseSurface];
  const byType = Object.entries(
    (investments ?? []).reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] ?? 0) + inv.currentValue;
      return acc;
    }, {} as Record<string, number>)
  );
  const donutData = byType.map(([type, value], i) => ({
    value,
    color: catColors[i % catColors.length],
    label: type.replace(/_/g, ' '),
  }));

  if (isLoading) return <LoadingState message="Loading investments..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Investments" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <KpiCard label="Portfolio Value" value={fmt(total)} color={Colors.secondary} textLight style={styles.half} />
          <KpiCard
            label="Total Gain"
            value={`${gain >= 0 ? '+' : ''}${gainPct.toFixed(1)}%`}
            color={gain >= 0 ? Colors.success : Colors.danger}
            textLight
            style={styles.half}
          />
        </View>

        {donutData.length > 0 && (
          <Card color={Colors.inverseSurface} style={styles.chartCard}>
            <Text style={styles.chartTitle}>By Type</Text>
            <DonutChart data={donutData} centerValue={fmt(total)} centerLabel="total" size={150} />
          </Card>
        )}

        {!investments?.length ? (
          <EmptyState icon="📈" title="No investments yet" message="Your investment portfolio will appear here" />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Holdings</Text>
            {investments.map((inv) => {
              const g = inv.currentValue - inv.purchaseValue;
              const gPct = inv.purchaseValue > 0 ? (g / inv.purchaseValue) * 100 : 0;
              return (
                <Card key={inv.id} style={styles.invCard}>
                  <View style={styles.invTop}>
                    <View style={styles.invIcon}>
                      <Text style={styles.invEmoji}>{typeEmoji[inv.type] ?? '💼'}</Text>
                    </View>
                    <View style={styles.invInfo}>
                      <Text style={styles.invName}>{inv.name}</Text>
                      {inv.institution && <Text style={styles.invInst}>{inv.institution}</Text>}
                    </View>
                    <View style={styles.invRight}>
                      <Text style={styles.invValue}>{fmt(inv.currentValue, inv.currency)}</Text>
                      <Text style={[styles.invGain, { color: g >= 0 ? Colors.success : Colors.danger }]}>
                        {g >= 0 ? '+' : ''}{gPct.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <Badge label={inv.type.replace(/_/g, ' ')} variant="info" />
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  chartCard: { padding: Spacing.lg, gap: 8 },
  chartTitle: { ...Typography.h3, color: Colors.white, marginBottom: 4 },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  invCard: { gap: Spacing.sm },
  invTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  invIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  invEmoji: { fontSize: 22 },
  invInfo: { flex: 1 },
  invName: { ...Typography.bodyMedium, color: Colors.onSurface, fontWeight: '700' },
  invInst: { ...Typography.caption, color: Colors.onSurfaceVariant },
  invRight: { alignItems: 'flex-end' },
  invValue: { ...Typography.h3, color: Colors.onSurface },
  invGain: { ...Typography.label, fontWeight: '700' },
});
