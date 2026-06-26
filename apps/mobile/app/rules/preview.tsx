import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  usePreviewV2,
  useProcessV2,
  useProcessingSessions,
  useUndoSession,
  type PreviewItem,
  type ProcessingSession,
} from '@/lib/hooks/useFinancialRules';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CATEGORY_COLORS: Record<string, string> = {
  SAVINGS: Colors.secondary,
  INVESTMENT: Colors.success,
  DEBT: Colors.danger,
  CREDIT_CARD: Colors.tertiary,
  EMI: Colors.tertiary,
  RENT: Colors.primary,
  MORTGAGE: Colors.primary,
  UTILITIES: Colors.inverseSurface,
  GROCERY: Colors.secondaryContainer,
  LEISURE: Colors.tertiaryContainer,
  INSURANCE: Colors.tertiaryFixed,
  INDIAN_ACCOUNT: Colors.inverseSurface,
  CUSTOM: Colors.surfaceContainerHigh,
};

export default function PreviewScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const preview = usePreviewV2();
  const processV2 = useProcessV2();
  const { data: sessions, refetch: refetchSessions } = useProcessingSessions();
  const undoSession = useUndoSession();

  function stepMonth(dir: 1 | -1) {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
    preview.reset();
  }

  async function handlePreview() {
    try {
      await preview.mutateAsync({ year, month });
    } catch (e: any) {
      Alert.alert('Preview failed', e.message);
    }
  }

  async function handleProcess() {
    if (!preview.data) return;
    Alert.alert(
      'Process Salary',
      `Commit allocation for ${MONTH_NAMES[month - 1]} ${year}? This will create ledger entries for ${fmt(preview.data.totalAllocated)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: async () => {
            try {
              await processV2.mutateAsync({ year, month });
              preview.reset();
              refetchSessions();
              Alert.alert('Done', 'Salary processed successfully');
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  function handleUndo(session: ProcessingSession) {
    Alert.alert(
      'Undo Session',
      `Reverse the allocation from ${new Date(session.createdAt).toLocaleDateString('en-GB')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            try {
              await undoSession.mutateAsync(session.id);
              refetchSessions();
              Alert.alert('Done', 'Session reversed');
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  const result = preview.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Preview & Process" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Period picker */}
        <Card bordered style={styles.periodCard}>
          <Text style={styles.periodLabel}>Period</Text>
          <View style={styles.periodRow}>
            <TouchableOpacity onPress={() => stepMonth(-1)} style={styles.stepBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.periodValue}>
              {MONTH_NAMES[month - 1]} {year}
            </Text>
            <TouchableOpacity onPress={() => stepMonth(1)} style={styles.stepBtn}>
              <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Button
            label={preview.isPending ? 'Running preview…' : 'Run Preview'}
            onPress={handlePreview}
            loading={preview.isPending}
            variant="outline"
            size="sm"
          />
        </Card>

        {/* No income message */}
        {result?.message && (
          <Card color={Colors.surfaceContainerHigh}>
            <Text style={styles.noIncomeText}>{result.message}</Text>
          </Card>
        )}

        {/* Preview results */}
        {result && !result.message && (
          <>
            {/* Summary strip */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: Colors.secondary }, HardShadow.charcoal]}>
                <Text style={styles.summaryValue}>{fmt(result.totalIncome)}</Text>
                <Text style={styles.summaryLabel}>Total Income</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: Colors.primary }, HardShadow.charcoal]}>
                <Text style={styles.summaryValue}>{fmt(result.totalAllocated)}</Text>
                <Text style={styles.summaryLabel}>Allocated</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: Colors.inverseSurface }, HardShadow.charcoal]}>
                <Text style={styles.summaryValue}>{fmt(result.totalRemaining)}</Text>
                <Text style={styles.summaryLabel}>Remaining</Text>
              </View>
            </View>

            {/* Warnings */}
            {result.hasWarnings && (
              <Card color={Colors.errorContainer} bordered>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning-outline" size={18} color={Colors.error} />
                  <Text style={styles.warningTitle}>Warnings</Text>
                </View>
                {result.warnings.map((w, i) => (
                  <Text key={i} style={styles.warningText}>
                    {w.label}: requested {fmt(w.requested)}, allocated {fmt(w.allocated)} — {w.message}
                  </Text>
                ))}
              </Card>
            )}

            {/* Allocation items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Allocations ({result.items.length})</Text>
              {result.items.map((item) => (
                <Card key={item.financialRuleId} bordered style={styles.itemCard}>
                  <View style={styles.itemTop}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: CATEGORY_COLORS[item.category] ?? Colors.secondary },
                      ]}
                    />
                    <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
                    {item.wasConditionSkipped && (
                      <Badge label="skipped" variant="neutral" />
                    )}
                  </View>
                  <View style={styles.itemBottom}>
                    <Text style={styles.itemAmount}>{fmt(item.totalAllocated)}</Text>
                    <Text style={styles.itemPercent}>
                      {item.percentOfCombined.toFixed(1)}% of income
                    </Text>
                  </View>
                </Card>
              ))}
            </View>

            {/* Process button */}
            <Button
              label={processV2.isPending ? 'Processing…' : `Process ${MONTH_NAMES[month - 1]} ${year}`}
              onPress={handleProcess}
              loading={processV2.isPending}
              style={styles.processBtn}
            />
          </>
        )}

        {/* Recent sessions */}
        {!!sessions?.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {sessions.map((session) => (
              <Card key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionTop}>
                  <View>
                    <Text style={styles.sessionDate}>
                      {new Date(session.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                    {session.totalAmount != null && (
                      <Text style={styles.sessionAmount}>{fmt(Number(session.totalAmount))}</Text>
                    )}
                  </View>
                  <View style={styles.sessionRight}>
                    <Badge
                      label={session.status}
                      variant={
                        session.status === 'COMPLETED' ? 'success'
                          : session.status === 'UNDONE' ? 'neutral'
                          : 'warning'
                      }
                    />
                    {session.status === 'COMPLETED' && (
                      <TouchableOpacity
                        onPress={() => handleUndo(session)}
                        style={styles.undoBtn}
                      >
                        <Ionicons name="arrow-undo-outline" size={13} color={Colors.error} />
                        <Text style={styles.undoBtnText}>Undo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
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
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 40 },
  periodCard: { gap: Spacing.md, alignItems: 'center' },
  periodLabel: { ...Typography.label, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  stepBtn: { padding: 8 },
  periodValue: { ...Typography.h2, color: Colors.onSurface, minWidth: 120, textAlign: 'center' },
  noIncomeText: { ...Typography.body, color: Colors.onSurfaceVariant, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryCard: {
    flex: 1, borderRadius: Radius.md, padding: Spacing.sm,
    alignItems: 'center', gap: 2,
    borderWidth: 2, borderColor: Colors.onSurface,
  },
  summaryValue: { ...Typography.h3, color: Colors.white, fontSize: 14 },
  summaryLabel: { ...Typography.caption, color: Colors.white, opacity: 0.8 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  warningTitle: { ...Typography.bodyMedium, color: Colors.error, fontWeight: '700' },
  warningText: { ...Typography.caption, color: Colors.onErrorContainer, lineHeight: 18 },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  itemCard: { gap: Spacing.sm },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  itemLabel: { ...Typography.bodyMedium, color: Colors.onSurface, flex: 1, fontWeight: '600' },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemAmount: { ...Typography.h3, color: Colors.onSurface },
  itemPercent: { ...Typography.caption, color: Colors.onSurfaceVariant },
  processBtn: { marginTop: Spacing.sm },
  sessionCard: { gap: Spacing.sm },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionDate: { ...Typography.bodyMedium, color: Colors.onSurface, fontWeight: '700' },
  sessionAmount: { ...Typography.caption, color: Colors.secondary },
  sessionRight: { alignItems: 'flex-end', gap: Spacing.sm },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  undoBtnText: { ...Typography.caption, color: Colors.error, fontWeight: '600' },
});
