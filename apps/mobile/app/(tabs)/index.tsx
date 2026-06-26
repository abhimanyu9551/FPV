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
import { useDashboard } from '@/lib/hooks/useDashboard';
import { useQueryClient } from '@tanstack/react-query';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';
import { supabase } from '@/lib/supabase';

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardScreen() {
  const { data, isLoading, refetch, isFetching } = useDashboard();
  const qc = useQueryClient();
  const router = useRouter();

  async function handleRefresh() {
    await qc.invalidateQueries({ queryKey: ['dashboard'] });
    refetch();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (isLoading) return <LoadingState message="Loading dashboard..." />;

  const trend = data?.monthlyTrend ?? [];
  const barData = trend.slice(-6).map((t) => ({
    value: t.income,
    label: t.month.slice(0, 3),
  }));
  const barSecondary = trend.slice(-6).map((t) => ({
    value: t.expenses,
    label: t.month.slice(0, 3),
  }));

  const savingsRate = data?.savingsRate ?? 0;
  const donutData = [
    { value: savingsRate, color: Colors.secondary, label: 'Savings' },
    { value: 100 - savingsRate, color: Colors.primary, label: 'Spent' },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.month}>
              {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Net Worth hero – dark card with primary hard shadow */}
        <View style={[styles.heroCard, HardShadow.primary]}>
          <View style={styles.heroInner}>
            <Text style={styles.heroLabel}>Total Net Worth</Text>
            <Text style={styles.heroValue}>{fmt(data?.netWorth ?? 0)}</Text>
            <View style={styles.trendPill}>
              <Ionicons name="trending-up" size={12} color={Colors.secondaryFixedDim} />
              <Text style={styles.trendPillText}>+12% this month</Text>
            </View>
          </View>
        </View>

        {/* 2-col KPIs */}
        <View style={styles.row}>
          <View style={[styles.halfCard, styles.bordered, HardShadow.charcoal]}>
            <Text style={styles.kpiLabel}>Monthly Income</Text>
            <Text style={[styles.kpiValue, { color: Colors.secondary }]}>
              {fmt(data?.totalIncome ?? 0)}
            </Text>
            <Text style={styles.kpiEmoji}>💰</Text>
          </View>
          <View style={[styles.halfCard, styles.bordered, HardShadow.charcoal]}>
            <Text style={styles.kpiLabel}>Total Debt</Text>
            <Text style={[styles.kpiValue, { color: Colors.primary }]}>
              {fmt(data?.totalDebt ?? 0)}
            </Text>
            <Text style={styles.kpiEmoji}>💳</Text>
          </View>
        </View>

        {/* Income vs Expense chart */}
        <Card color={Colors.inverseSurface} style={styles.chartCard} padded>
          <Text style={styles.cardTitle}>Income vs Expenses</Text>
          <Text style={styles.cardSubtitle}>Last 6 months</Text>
          <BarChart
            data={barData}
            secondaryData={barSecondary}
            color={Colors.secondaryFixedDim}
            secondaryColor={Colors.tertiaryFixedDim}
            height={150}
          />
        </Card>

        {/* Savings rate donut */}
        <Card color={Colors.inverseSurface} style={styles.chartCard} padded>
          <Text style={styles.cardTitle}>Savings Rate</Text>
          <Text style={styles.cardSubtitle}>This month</Text>
          <DonutChart
            data={donutData}
            centerValue={`${savingsRate}%`}
            centerLabel="saved"
            size={140}
          />
        </Card>

        {/* Savings Goals */}
        {(data?.savingsGoals?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Savings Goals</Text>
            {data!.savingsGoals.map((g) => {
              const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
              return (
                <View key={g.name} style={[styles.goalCard, styles.bordered]}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalName}>{g.name}</Text>
                    <Text style={[styles.goalPct, { color: Colors.primary }]}>
                      {Math.round(pct)}%
                    </Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(pct, 100)}%` as any,
                          backgroundColor: Colors.secondary,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.goalAmounts}>
                    <Text style={[styles.goalCurrent, { color: Colors.onSurface }]}>
                      {fmt(g.current)}
                    </Text>
                    <Text style={styles.goalTarget}>of {fmt(g.target)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Active Debts */}
        {(data?.debtSummary?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Debts</Text>
            {data!.debtSummary.map((d) => (
              <View key={d.name} style={[styles.debtRow, styles.bordered]}>
                <View style={styles.debtIcon}>
                  <Text>💳</Text>
                </View>
                <View style={styles.debtInfo}>
                  <Text style={styles.debtName}>{d.name}</Text>
                  <Text style={styles.debtBalance}>{fmt(d.balance, d.currency)}</Text>
                </View>
                <Badge label="Active" variant="info" />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greeting: { ...Typography.h2, color: Colors.primary },
  month: { ...Typography.labelXs, color: Colors.onSurfaceVariant, marginTop: 2, letterSpacing: 0.5 },
  signOutBtn: { padding: 8 },

  // Hero net worth card
  heroCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  heroInner: {
    backgroundColor: Colors.inverseSurface,
    padding: Spacing.xl,
    gap: 8,
  },
  heroLabel: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
  },
  trendPill: {
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
  trendPillText: {
    ...Typography.labelXs,
    color: Colors.secondaryFixedDim,
    fontWeight: '700',
  },

  // 2-col KPIs
  row: { flexDirection: 'row', gap: Spacing.md },
  halfCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  bordered: {
    borderWidth: 2,
    borderColor: Colors.onSurface,
  },
  kpiLabel: {
    ...Typography.label,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiEmoji: { fontSize: 24, position: 'absolute', top: Spacing.md, right: Spacing.md, opacity: 0.25 },

  // Chart cards
  chartCard: { gap: 6 },
  cardTitle: { ...Typography.h3, color: Colors.white },
  cardSubtitle: { ...Typography.labelXs, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },

  // Sections
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },

  // Goal cards
  goalCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 10,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalName: { ...Typography.label, color: Colors.onSurface },
  goalPct: { ...Typography.label, fontWeight: '800' },
  progressBg: {
    height: 10,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },
  goalAmounts: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  goalCurrent: { ...Typography.label, fontWeight: '800' },
  goalTarget: { ...Typography.labelXs, color: Colors.outline },

  // Debt rows
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  debtIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.tertiaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtInfo: { flex: 1 },
  debtName: { ...Typography.label, color: Colors.onSurface },
  debtBalance: { ...Typography.labelXs, color: Colors.onSurfaceVariant, marginTop: 2 },
});
