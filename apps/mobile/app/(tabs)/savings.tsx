import React, { useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSavingsGoals, useCreateSavingsGoal } from '@/lib/hooks/useSavings';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

const GOAL_EMOJIS = ['🏠', '✈️', '🎓', '🚗', '💍', '🏖️', '💻', '🎯', '🌟', '💰'];

const CARD_CONFIGS = [
  { bg: Colors.surfaceContainerLowest, border: Colors.onSurface, textPrimary: Colors.onSurface, textSub: Colors.onSurfaceVariant, progressBg: Colors.surfaceContainerHighest, progressFill: Colors.secondary },
  { bg: Colors.inverseSurface, border: Colors.primary, textPrimary: Colors.white, textSub: 'rgba(255,255,255,0.6)', progressBg: 'rgba(255,255,255,0.15)', progressFill: Colors.secondaryFixedDim },
  { bg: Colors.primary, border: Colors.onSurface, textPrimary: Colors.white, textSub: 'rgba(255,255,255,0.7)', progressBg: 'rgba(255,255,255,0.2)', progressFill: Colors.white },
  { bg: Colors.surfaceContainerHigh, border: Colors.onSurface, textPrimary: Colors.onSurface, textSub: Colors.onSurfaceVariant, progressBg: Colors.outlineVariant, progressFill: Colors.tertiary },
];

export default function SavingsScreen() {
  const qc = useQueryClient();
  const { data: goals, isLoading, isFetching, refetch } = useSavingsGoals();
  const createGoal = useCreateSavingsGoal();
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [targetDate, setTargetDate] = useState('');

  const totalTarget = goals?.reduce((s, g) => s + g.targetAmount, 0) ?? 0;
  const totalCurrent = goals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0;
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  async function handleCreate() {
    if (!name || !target) {
      Alert.alert('Validation', 'Name and target amount are required');
      return;
    }
    try {
      await createGoal.mutateAsync({
        name,
        targetAmount: parseFloat(target),
        currentAmount: parseFloat(current) || 0,
        currency: 'GBP',
        emoji,
        targetDate: targetDate || undefined,
      });
      setShowModal(false);
      setName(''); setTarget(''); setCurrent(''); setEmoji('🎯'); setTargetDate('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (isLoading) return <LoadingState message="Loading savings goals..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Savings Goals"
        right={
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => { qc.invalidateQueries({ queryKey: ['savings'] }); refetch(); }}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero total savings */}
        <View style={[styles.heroCard, HardShadow.primary]}>
          <Text style={styles.heroLabel}>Total Savings</Text>
          <Text style={styles.heroValue}>{fmt(totalCurrent)}</Text>
          <Text style={styles.heroSub}>{Math.round(overallPct)}% of target</Text>
        </View>

        {!goals?.length ? (
          <EmptyState
            icon="🎯"
            title="No savings goals yet"
            message="Set a goal to start saving with purpose"
            actionLabel="Add Goal"
            onAction={() => setShowModal(true)}
          />
        ) : (
          goals.map((goal, i) => {
            const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const cfg = CARD_CONFIGS[i % CARD_CONFIGS.length];
            const daysLeft = goal.targetDate
              ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <View
                key={goal.id}
                style={[
                  styles.goalCard,
                  { backgroundColor: cfg.bg, borderColor: cfg.border },
                ]}
              >
                <View style={styles.goalTop}>
                  <View style={[styles.goalEmojiWrap, { backgroundColor: Colors.secondaryFixed }]}>
                    <Text style={styles.goalEmoji}>{goal.emoji ?? '🎯'}</Text>
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalName, { color: cfg.textPrimary }]}>{goal.name}</Text>
                    {daysLeft !== null && (
                      <Text style={[styles.goalDays, { color: cfg.textSub }]}>
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.goalPct, { color: cfg.textPrimary }]}>
                    {Math.round(pct)}%
                  </Text>
                </View>
                <View style={[styles.progressBg, { backgroundColor: cfg.progressBg }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(pct, 100)}%` as any, backgroundColor: cfg.progressFill },
                    ]}
                  />
                </View>
                <View style={styles.goalBottom}>
                  <Text style={[styles.goalCurrent, { color: cfg.textPrimary }]}>
                    {fmt(goal.currentAmount, goal.currency)}
                  </Text>
                  <Text style={[styles.goalTarget, { color: cfg.textSub }]}>
                    of {fmt(goal.targetAmount, goal.currency)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Savings Goal</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.emojiRow}>
              {GOAL_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[
                    styles.emojiBtn,
                    emoji === e && { borderColor: Colors.primary, backgroundColor: Colors.primaryFixed },
                  ]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Goal Name *" value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" />
            <Input label="Target Amount *" value={target} onChangeText={setTarget} placeholder="0.00" keyboardType="decimal-pad" />
            <Input label="Current Amount" value={current} onChangeText={setCurrent} placeholder="0.00" keyboardType="decimal-pad" />
            <Input label="Target Date" value={targetDate} onChangeText={setTargetDate} placeholder="YYYY-MM-DD" />
            <Button label="Create Goal" onPress={handleCreate} loading={createGoal.isPending} style={styles.modalBtn} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    color: Colors.primaryFixedDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: { fontSize: 40, fontWeight: '800', color: Colors.onPrimary, letterSpacing: -1 },
  heroSub: { ...Typography.labelXs, color: Colors.secondaryFixedDim, fontWeight: '700' },

  goalCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 2,
  },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalEmoji: { fontSize: 26 },
  goalInfo: { flex: 1 },
  goalName: { ...Typography.h3 },
  goalDays: { ...Typography.caption, marginTop: 2 },
  goalPct: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  progressBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  goalBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  goalCurrent: { ...Typography.h3, fontWeight: '800' },
  goalTarget: { ...Typography.caption },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.page,
    borderBottomWidth: 2,
    borderBottomColor: Colors.outlineVariant,
  },
  modalTitle: { ...Typography.h2, color: Colors.onSurface },
  modalContent: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 40 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
  },
  emojiText: { fontSize: 24 },
  modalBtn: { marginTop: Spacing.sm },
});
