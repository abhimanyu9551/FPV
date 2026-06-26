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
import { useIncomeEntries, useIncomeSources } from '@/lib/hooks/useIncome';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LineChart } from '@/components/charts/LineChart';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function IncomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: entries, isLoading, isFetching, refetch } = useIncomeEntries();
  const { data: sources } = useIncomeSources();

  const total = entries?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const processed = entries?.filter((e) => e.isProcessed).length ?? 0;

  const lineData = (entries ?? [])
    .slice(-8)
    .map((e) => ({
      value: e.amount,
      label: new Date(e.receivedAt).toLocaleDateString('en-GB', { month: 'short' }),
    }));

  if (isLoading) return <LoadingState message="Loading income..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Income"
        subtitle={`${sources?.length ?? 0} source${sources?.length === 1 ? '' : 's'}`}
        right={
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/income/new')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => { qc.invalidateQueries({ queryKey: ['income'] }); refetch(); }}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* KPI row */}
        <View style={styles.row}>
          <View style={[styles.halfCard, { backgroundColor: Colors.secondary }, HardShadow.charcoal]}>
            <Text style={styles.kpiLabel}>Total Income</Text>
            <Text style={styles.kpiValue}>{fmt(total)}</Text>
          </View>
          <View style={[styles.halfCard, { backgroundColor: Colors.tertiaryContainer }, HardShadow.charcoal]}>
            <Text style={styles.kpiLabel}>Processed</Text>
            <Text style={styles.kpiValue}>{processed}/{entries?.length ?? 0}</Text>
          </View>
        </View>

        {lineData.length > 1 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Income Trend</Text>
            <LineChart data={lineData} color={Colors.secondaryFixedDim} height={130} />
          </View>
        )}

        {/* Income Sources */}
        {(sources?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Income Sources</Text>
            {sources!.map((s) => (
              <View key={s.id} style={styles.sourceCard}>
                <View style={styles.sourceIcon}>
                  <Text style={{ fontSize: 20 }}>💼</Text>
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>{s.name}</Text>
                  <Text style={styles.sourceType}>{s.type} · {s.currency}</Text>
                </View>
                <Badge label={s.isActive ? 'Active' : 'Inactive'} variant={s.isActive ? 'success' : 'neutral'} />
              </View>
            ))}
          </View>
        )}

        {/* Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {!entries?.length ? (
            <EmptyState
              icon="💸"
              title="No income entries yet"
              message="Add your first income entry to get started"
              actionLabel="Add Income"
              onAction={() => router.push('/(tabs)/income/new')}
            />
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryLeft}>
                  <Text style={styles.entryAmount}>{fmt(entry.amount, entry.currency)}</Text>
                  <Text style={styles.entryDate}>
                    {new Date(entry.receivedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  {entry.notes && <Text style={styles.entryNotes}>{entry.notes}</Text>}
                </View>
                <Badge label={entry.isProcessed ? 'Processed' : 'Pending'} variant={entry.isProcessed ? 'success' : 'warning'} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 32 },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: { flexDirection: 'row', gap: Spacing.md },
  halfCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 4,
    borderWidth: 2,
    borderColor: Colors.onSurface,
  },
  kpiLabel: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kpiValue: { fontSize: 24, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },

  chartCard: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 8,
  },
  chartTitle: { ...Typography.h3, color: Colors.white },

  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },

  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceInfo: { flex: 1 },
  sourceName: { ...Typography.label, color: Colors.onSurface },
  sourceType: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 2 },

  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
  },
  entryLeft: { flex: 1, gap: 2 },
  entryAmount: { ...Typography.h3, color: Colors.onSurface },
  entryDate: { ...Typography.labelXs, color: Colors.onSurfaceVariant },
  entryNotes: { ...Typography.caption, color: Colors.outline, fontStyle: 'italic' },
});
