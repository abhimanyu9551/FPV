import React from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useFinancialRules,
  useProcessingSessions,
  useDeleteRule,
  useUpdateRule,
  useUndoSession,
  type FinancialRule,
  type ProcessingSession,
} from '@/lib/hooks/useFinancialRules';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}

function allocationLabel(rule: FinancialRule) {
  if (rule.allocationType === 'FIXED_AMOUNT') return fmt(Number(rule.allocationValue ?? 0));
  if (rule.allocationType === 'PERCENTAGE') return `${rule.allocationPercent ?? 0}%`;
  return 'Remaining';
}

export default function RulesScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: rules, isLoading, isFetching } = useFinancialRules();
  const { data: sessions, isFetching: sessionsFetching } = useProcessingSessions();
  const deleteRule = useDeleteRule();
  const updateRule = useUpdateRule();
  const undoSession = useUndoSession();

  const activeCount = rules?.filter((r) => r.isActive).length ?? 0;
  const inactiveCount = (rules?.length ?? 0) - activeCount;

  function handleDelete(rule: FinancialRule) {
    Alert.alert(
      'Delete Rule',
      `Delete "${rule.name}"? This will deactivate the rule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRule.mutateAsync(rule.id);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  function handleToggle(rule: FinancialRule, value: boolean) {
    updateRule.mutate({ id: rule.id, isActive: value });
  }

  function handleUndo(session: ProcessingSession) {
    Alert.alert(
      'Undo Session',
      `Reverse the allocation from ${new Date(session.createdAt).toLocaleDateString('en-GB')}? This will delete all ledger entries from that run.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            try {
              await undoSession.mutateAsync(session.id);
              Alert.alert('Done', 'Session reversed successfully');
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  if (isLoading) return <LoadingState message="Loading rules..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Rules"
        showBack
        right={
          <TouchableOpacity onPress={() => router.push('/rules/new')} style={styles.addBtn}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching || sessionsFetching}
            onRefresh={() => {
              qc.invalidateQueries({ queryKey: ['rules'] });
              qc.invalidateQueries({ queryKey: ['salary', 'sessions'] });
            }}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.secondary }, HardShadow.charcoal]}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.inverseSurface }, HardShadow.charcoal]}>
            <Text style={styles.statValue}>{inactiveCount}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.primary }, HardShadow.charcoal]}>
            <Text style={styles.statValue}>{rules?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actionRow}>
          <Button
            label="Templates"
            onPress={() => router.push('/rules/templates' as any)}
            variant="outline"
            size="sm"
            style={styles.actionBtn}
          />
          <Button
            label="Preview & Process"
            onPress={() => router.push('/rules/preview')}
            variant="primary"
            size="sm"
            style={styles.actionBtn}
          />
        </View>

        {/* Rules list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rules</Text>
          {!rules?.length ? (
            <EmptyState
              icon="⚡"
              title="No rules yet"
              message="Create your first financial automation rule or apply a template"
            />
          ) : (
            rules.map((rule) => (
              <Card key={rule.id} bordered style={styles.ruleCard}>
                <View style={styles.ruleTop}>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>{rule.priority}</Text>
                  </View>
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleName} numberOfLines={1}>{rule.name}</Text>
                    <View style={styles.ruleMeta}>
                      <Badge label={rule.category.replace(/_/g, ' ')} variant="info" />
                      <Text style={styles.allocationLabel}>{allocationLabel(rule)}</Text>
                    </View>
                  </View>
                  <Switch
                    value={rule.isActive}
                    onValueChange={(v) => handleToggle(rule, v)}
                    trackColor={{ false: Colors.outlineVariant, true: Colors.secondary }}
                    thumbColor={Colors.white}
                  />
                </View>
                {rule.incomeSource && (
                  <Text style={styles.sourceLabel}>
                    Source: {rule.incomeSource.name}
                  </Text>
                )}
                <View style={styles.ruleActions}>
                  <TouchableOpacity
                    onPress={() => router.push(`/rules/${rule.id}/edit` as any)}
                    style={styles.editBtn}
                  >
                    <Ionicons name="pencil-outline" size={14} color={Colors.secondary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <Badge
                    label={rule.paymentResponsibility}
                    variant={rule.paymentResponsibility === 'SHARED' ? 'warning' : 'neutral'}
                  />
                  <TouchableOpacity onPress={() => handleDelete(rule)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Processing sessions */}
        {!!sessions?.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {sessions.map((session) => (
              <Card key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionTop}>
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionDate}>
                      {new Date(session.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
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
                        session.status === 'COMPLETED'
                          ? 'success'
                          : session.status === 'UNDONE'
                          ? 'neutral'
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
  addBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: Colors.onSurface,
  },
  statValue: { ...Typography.h2, color: Colors.white },
  statLabel: { ...Typography.caption, color: Colors.white, opacity: 0.8 },
  actionRow: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1 },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  ruleCard: { gap: Spacing.sm },
  ruleTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.onSurface,
  },
  priorityText: { ...Typography.label, color: Colors.onSurface },
  ruleInfo: { flex: 1, gap: 4 },
  ruleName: { ...Typography.bodyMedium, color: Colors.onSurface, fontWeight: '700' },
  ruleMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  allocationLabel: { ...Typography.caption, color: Colors.secondary, fontWeight: '700' },
  sourceLabel: { ...Typography.caption, color: Colors.onSurfaceVariant },
  ruleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  editBtnText: { ...Typography.caption, color: Colors.secondary, fontWeight: '600' },
  deleteBtn: { padding: 4 },
  sessionCard: { gap: Spacing.sm },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionLeft: { gap: 2 },
  sessionDate: { ...Typography.bodyMedium, color: Colors.onSurface, fontWeight: '700' },
  sessionAmount: { ...Typography.caption, color: Colors.secondary },
  sessionRight: { alignItems: 'flex-end', gap: Spacing.sm },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  undoBtnText: { ...Typography.caption, color: Colors.error, fontWeight: '600' },
});
