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
import { useDebts, useDebtPlan } from '@/lib/hooks/useDebts';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DonutChart } from '@/components/charts/DonutChart';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

const debtTypeEmoji: Record<string, string> = {
  CREDIT_CARD: '💳',
  PERSONAL_LOAN: '🏦',
  FAMILY_LOAN: '👨‍👩‍👧',
  FRIEND_LOAN: '🤝',
  INFORMAL: '💰',
  MORTGAGE: '🏠',
  STUDENT_LOAN: '🎓',
  OTHER: '📋',
};

const RING_COLORS = [
  Colors.secondaryFixedDim,
  Colors.primary,
  Colors.tertiaryFixedDim,
  Colors.secondaryFixed,
];

export default function DebtsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: debts, isLoading, isFetching, refetch } = useDebts();
  const { data: plan } = useDebtPlan();

  const active = debts?.filter((d) => d.status === 'ACTIVE') ?? [];
  const totalDebt = active.reduce((s, d) => s + d.outstandingBalance, 0);

  const donutData = active.map((d, i) => ({
    value: d.outstandingBalance,
    color: RING_COLORS[i % RING_COLORS.length],
    label: d.name,
  }));

  if (isLoading) return <LoadingState message="Loading debts..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Debts"
        subtitle={`${active.length} active`}
        right={
          <TouchableOpacity onPress={() => router.push('/(tabs)/debts/new')} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => { qc.invalidateQueries({ queryKey: ['debts'] }); refetch(); }}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero – freedom countdown style dark card */}
        <View style={[styles.heroCard, HardShadow.primary]}>
          <Text style={styles.heroLabel}>Freedom Countdown</Text>
          <Text style={styles.heroValue}>{fmt(totalDebt)}</Text>
          <Text style={styles.heroSub}>Total outstanding</Text>
          {plan && (
            <View style={styles.heroPill}>
              <Ionicons name="trending-down" size={12} color={Colors.secondaryFixedDim} />
              <Text style={styles.heroPillText}>
                Payoff in ~{plan.totalMonths} months
              </Text>
            </View>
          )}
        </View>

        {donutData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Debt Breakdown</Text>
            <DonutChart
              data={donutData}
              centerValue={fmt(totalDebt)}
              centerLabel="total"
              size={160}
            />
          </View>
        )}

        {!active.length ? (
          <EmptyState
            icon="🎉"
            title="No active debts"
            message="You're debt free! Or add a debt to start tracking."
            actionLabel="Add Debt"
            onAction={() => router.push('/(tabs)/debts/new')}
          />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Debts</Text>
            {active.map((debt, i) => {
              const pct = debt.principalAmount > 0
                ? ((debt.principalAmount - debt.outstandingBalance) / debt.principalAmount) * 100
                : 0;
              const ringColor = RING_COLORS[i % RING_COLORS.length];
              return (
                <TouchableOpacity
                  key={debt.id}
                  onPress={() => router.push(`/(tabs)/debts/${debt.id}/edit`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.debtCard}>
                    <View style={styles.debtTop}>
                      <View style={[styles.debtIconWrap, { backgroundColor: Colors.tertiaryFixed }]}>
                        <Text style={styles.debtEmoji}>{debtTypeEmoji[debt.type] ?? '📋'}</Text>
                      </View>
                      <View style={styles.debtInfo}>
                        <Text style={styles.debtName}>{debt.name}</Text>
                        {debt.lender && <Text style={styles.debtLender}>{debt.lender}</Text>}
                      </View>
                      <View style={styles.debtRight}>
                        <Text style={[styles.debtBalance, { color: Colors.primary }]}>
                          {fmt(debt.outstandingBalance, debt.currency)}
                        </Text>
                        <Badge label={debt.strategy} variant="info" />
                      </View>
                    </View>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(pct, 100)}%` as any, backgroundColor: ringColor },
                        ]}
                      />
                    </View>
                    <View style={styles.debtMeta}>
                      <Text style={[styles.debtPct, { color: Colors.secondary }]}>
                        {Math.round(pct)}% paid off
                      </Text>
                      {debt.interestRate > 0 && (
                        <Text style={styles.debtRate}>{debt.interestRate}% APR</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
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
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    gap: 6,
  },
  heroLabel: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: { fontSize: 40, fontWeight: '800', color: Colors.secondaryFixedDim, letterSpacing: -1 },
  heroSub: { ...Typography.labelXs, color: 'rgba(255,255,255,0.5)' },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.onSecondaryFixedVariant,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  heroPillText: { ...Typography.labelXs, color: Colors.secondaryFixedDim, fontWeight: '700' },

  chartCard: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 8,
  },
  chartTitle: { ...Typography.h3, color: Colors.white },

  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },

  debtCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
  },
  debtTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  debtIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtEmoji: { fontSize: 22 },
  debtInfo: { flex: 1 },
  debtName: { ...Typography.label, color: Colors.onSurface },
  debtLender: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  debtRight: { alignItems: 'flex-end', gap: 4 },
  debtBalance: { ...Typography.h3 },
  progressBg: {
    height: 10,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },
  debtMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  debtPct: { ...Typography.label, fontWeight: '700' },
  debtRate: { ...Typography.labelXs, color: Colors.outline },
});
