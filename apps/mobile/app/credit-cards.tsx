import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography } from '@/lib/colors';

interface CreditCard {
  id: string;
  name: string;
  lender?: string;
  outstandingBalance: number;
  minimumPayment?: number;
  currency: string;
  interestRate: number;
  status: string;
}

function fmt(n: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export default function CreditCardsScreen() {
  const { data: cards, isLoading } = useQuery<CreditCard[]>({
    queryKey: ['credit-cards'],
    queryFn: () => api.get<CreditCard[]>('/debts?type=CREDIT_CARD'),
  });

  const total = cards?.reduce((s, c) => s + c.outstandingBalance, 0) ?? 0;
  const minPayments = cards?.reduce((s, c) => s + (c.minimumPayment ?? 0), 0) ?? 0;

  if (isLoading) return <LoadingState message="Loading credit cards..." />;

  const cardColors = [Colors.primary, Colors.secondary, Colors.inverseSurface, Colors.tertiaryContainer];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Credit Cards" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <KpiCard label="Total Owed" value={fmt(total)} color={Colors.primary} textLight style={styles.half} />
          <KpiCard label="Min Payments" value={fmt(minPayments)} color={Colors.tertiaryContainer} textLight style={styles.half} />
        </View>

        {!cards?.length ? (
          <EmptyState icon="💳" title="No credit cards" message="Credit card debts added as type CREDIT_CARD appear here" />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cards</Text>
            {cards.map((card, i) => (
              <Card key={card.id} color={cardColors[i % cardColors.length]} style={styles.cardItem}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>💳</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{card.name}</Text>
                    {card.lender && <Text style={styles.cardLender}>{card.lender}</Text>}
                  </View>
                </View>
                <Text style={styles.cardBalance}>{fmt(card.outstandingBalance, card.currency)}</Text>
                <View style={styles.cardMeta}>
                  {card.minimumPayment && (
                    <Text style={styles.cardMin}>Min: {fmt(card.minimumPayment, card.currency)}/mo</Text>
                  )}
                  {card.interestRate > 0 && (
                    <Text style={styles.cardRate}>{card.interestRate}% APR</Text>
                  )}
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
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  cardItem: { padding: Spacing.lg, gap: Spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardEmoji: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardName: { ...Typography.h3, color: Colors.white },
  cardLender: { ...Typography.caption, color: 'rgba(255,255,255,0.65)' },
  cardBalance: { fontSize: 36, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMin: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },
  cardRate: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },
});
