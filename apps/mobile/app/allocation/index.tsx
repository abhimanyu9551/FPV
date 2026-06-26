import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSharedRules,
  useProcessMonth,
  useMonthlyStatus,
} from '@/lib/hooks/useAllocation';
import { useIncomeSources } from '@/lib/hooks/useIncome';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { KpiCard } from '@/components/ui/KpiCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography } from '@/lib/colors';

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
}

const ruleTypeColors: Record<string, string> = {
  FIXED_AMOUNT: Colors.secondary,
  PERCENTAGE: Colors.tertiaryContainer,
  REMAINING: Colors.primary,
};

export default function AllocationScreen() {
  const qc = useQueryClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: sharedRules, isLoading } = useSharedRules();
  const { data: sources } = useIncomeSources();
  const { data: status, isFetching, refetch } = useMonthlyStatus(currentMonth);
  const processMonth = useProcessMonth();

  async function handleProcess() {
    Alert.alert(
      'Process Month',
      `Run allocation for ${currentMonth}? This will distribute income according to your rules.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          style: 'default',
          onPress: async () => {
            try {
              await processMonth.mutateAsync({ month: currentMonth });
              Alert.alert('Done', 'Allocation processed successfully');
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  if (isLoading) return <LoadingState message="Loading allocation rules..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Allocation" showBack subtitle={currentMonth} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { qc.invalidateQueries({ queryKey: ['allocation'] }); refetch(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly status */}
        {status && (
          <View style={styles.row}>
            <KpiCard label="Total Income" value={fmt(status.totalIncome)} color={Colors.secondary} textLight style={styles.half} />
            <KpiCard label="Allocated" value={fmt(status.totalAllocated)} color={Colors.tertiaryContainer} textLight style={styles.half} />
          </View>
        )}

        {status && status.unprocessedEntries > 0 && (
          <Card color={Colors.inverseSurface} style={styles.processCard}>
            <Text style={styles.processText}>
              {status.unprocessedEntries} unprocessed income{status.unprocessedEntries > 1 ? ' entries' : ' entry'} this month
            </Text>
            <Button
              label="Process Now"
              onPress={handleProcess}
              loading={processMonth.isPending}
              variant="secondary"
              size="sm"
            />
          </Card>
        )}

        {/* Income sources with rules */}
        {sources && sources.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Income Sources</Text>
            {sources.map((s) => (
              <Card key={s.id} style={styles.sourceCard}>
                <View style={styles.sourceTop}>
                  <Text style={styles.sourceName}>{s.name}</Text>
                  <Badge label={s.type} variant="teal" />
                </View>
                <Text style={styles.sourceInfo}>{s.currency} · {s.isActive ? 'Active' : 'Inactive'}</Text>
              </Card>
            ))}
          </View>
        )}

        {/* Shared rules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared Allocation Rules</Text>
          {!sharedRules?.length ? (
            <EmptyState
              icon="⚙️"
              title="No shared rules"
              message="Shared rules split expenses across multiple income sources"
            />
          ) : (
            sharedRules.map((rule) => (
              <Card key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleTop}>
                  <Text style={styles.ruleName}>{rule.name}</Text>
                  <Badge label={rule.category.replace(/_/g, ' ')} variant="info" />
                </View>
                <Text style={styles.ruleAmount}>{fmt(rule.totalAmount)}</Text>
                <View style={styles.ruleSplits}>
                  {rule.splits.map((split, i) => {
                    const src = sources?.find((s) => s.id === split.sourceId);
                    return (
                      <View key={i} style={styles.split}>
                        <Text style={styles.splitSource}>{src?.name ?? split.sourceId}</Text>
                        <Text style={styles.splitPct}>{split.percentage}%</Text>
                      </View>
                    );
                  })}
                </View>
                <Badge label={rule.isActive ? 'Active' : 'Inactive'} variant={rule.isActive ? 'success' : 'neutral'} />
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  processCard: { padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  processText: { ...Typography.bodyMedium, color: Colors.white, flex: 1 },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  sourceCard: { gap: 4 },
  sourceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceName: { ...Typography.bodyMedium, color: Colors.onSurface, fontWeight: '700' },
  sourceInfo: { ...Typography.caption, color: Colors.onSurfaceVariant },
  ruleCard: { gap: Spacing.sm },
  ruleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ruleName: { ...Typography.bodyMedium, color: Colors.onSurface, fontWeight: '700', flex: 1 },
  ruleAmount: { ...Typography.h3, color: Colors.onSurface },
  ruleSplits: { gap: 4 },
  split: { flexDirection: 'row', justifyContent: 'space-between' },
  splitSource: { ...Typography.caption, color: Colors.onSurfaceVariant },
  splitPct: { ...Typography.caption, color: Colors.secondary, fontWeight: '700' },
});
