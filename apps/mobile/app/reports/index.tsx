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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useReports, useGenerateReport } from '@/lib/hooks/useReports';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/lib/colors';

const statusVariant: Record<string, 'success' | 'warning' | 'info'> = {
  APPROVED: 'success',
  VERIFIED: 'info',
  DRAFT: 'warning',
};

export default function ReportsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: reports, isLoading, isFetching, refetch } = useReports();
  const generate = useGenerateReport();
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    const month = new Date().toISOString().slice(0, 7);
    setGenerating(true);
    try {
      await generate.mutateAsync({ month });
      Alert.alert('Generated', `Report for ${month} created`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setGenerating(false);
  }

  if (isLoading) return <LoadingState message="Loading reports..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Monthly Reports"
        showBack
        right={
          <TouchableOpacity onPress={handleGenerate} style={styles.genBtn} disabled={generating}>
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { qc.invalidateQueries({ queryKey: ['reports'] }); refetch(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {!reports?.length ? (
          <EmptyState
            icon="📊"
            title="No reports yet"
            message="Generate your first monthly snapshot"
            actionLabel="Generate Report"
            onAction={handleGenerate}
          />
        ) : (
          reports.map((r, i) => {
            const colors = [Colors.secondary, Colors.inverseSurface, Colors.tertiaryContainer, Colors.primary];
            const color = colors[i % colors.length];
            return (
              <TouchableOpacity key={r.id} onPress={() => router.push(`/reports/${r.month}` as any)} activeOpacity={0.85}>
                <Card color={color} style={styles.reportCard}>
                  <View style={styles.reportTop}>
                    <Text style={styles.reportMonth}>{new Date(r.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
                    <Badge label={r.status} variant={statusVariant[r.status] ?? 'neutral'} />
                  </View>
                  {r.netWorth && (
                    <View style={styles.reportStats}>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Net Worth</Text>
                        <Text style={styles.statValue}>
                          {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(r.netWorth.net)}
                        </Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Δ Month</Text>
                        <Text style={[styles.statValue, { color: r.netWorth.delta >= 0 ? Colors.success : Colors.danger }]}>
                          {r.netWorth.delta >= 0 ? '+' : ''}{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(r.netWorth.delta)}
                        </Text>
                      </View>
                    </View>
                  )}
                  <Text style={styles.tapHint}>Tap to view →</Text>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.page, gap: Spacing.md, paddingBottom: 32 },
  genBtn: { backgroundColor: Colors.primary, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  reportCard: { padding: Spacing.lg, gap: Spacing.sm },
  reportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportMonth: { ...Typography.h3, color: Colors.white },
  reportStats: { flexDirection: 'row', gap: Spacing.xl },
  stat: { gap: 2 },
  statLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },
  statValue: { ...Typography.h3, color: Colors.white, fontWeight: '700' },
  tapHint: { ...Typography.caption, color: 'rgba(255,255,255,0.4)', textAlign: 'right' },
});
