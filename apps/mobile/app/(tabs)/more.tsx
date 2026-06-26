import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';
import { supabase } from '@/lib/supabase';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  label: string;
  description: string;
  icon: IoniconsName;
  emoji: string;
  bg: string;
  border: string;
  textColor: string;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Rules',
    description: 'Financial automation rules',
    icon: 'flash-outline',
    emoji: '⚡',
    bg: Colors.primary,
    border: Colors.onSurface,
    textColor: Colors.white,
    route: '/rules',
  },
  {
    label: 'Allocation',
    description: 'Salary allocation rules',
    icon: 'git-branch-outline',
    emoji: '⚙️',
    bg: Colors.secondary,
    border: Colors.onSurface,
    textColor: Colors.white,
    route: '/allocation',
  },
  {
    label: 'Remittances',
    description: 'India transfers & tracking',
    icon: 'airplane-outline',
    emoji: '✈️',
    bg: Colors.tertiaryContainer,
    border: Colors.onSurface,
    textColor: Colors.white,
    route: '/remittances',
  },
  {
    label: 'Reports',
    description: 'Monthly snapshots',
    icon: 'bar-chart-outline',
    emoji: '📊',
    bg: Colors.inverseSurface,
    border: Colors.primary,
    textColor: Colors.white,
    route: '/reports',
  },
  {
    label: 'Investments',
    description: 'Portfolio & holdings',
    icon: 'trending-up-outline',
    emoji: '📈',
    bg: Colors.surfaceContainerLowest,
    border: Colors.onSurface,
    textColor: Colors.onSurface,
    route: '/investments',
  },
  {
    label: 'Credit Cards',
    description: 'Billing cycles',
    icon: 'card-outline',
    emoji: '💳',
    bg: Colors.primaryFixed,
    border: Colors.onSurface,
    textColor: Colors.onPrimaryFixed,
    route: '/credit-cards',
  },
  {
    label: 'Settings',
    description: 'Exchange rates & prefs',
    icon: 'settings-outline',
    emoji: '🔧',
    bg: Colors.surfaceContainerHigh,
    border: Colors.onSurface,
    textColor: Colors.onSurface,
    route: '/settings',
  },
];

export default function MoreScreen() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="More" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
              style={styles.itemWrapper}
            >
              <View
                style={[
                  styles.item,
                  { backgroundColor: item.bg, borderColor: item.border },
                  HardShadow.charcoal,
                ]}
              >
                <View style={[styles.itemIconWrap, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                </View>
                <Text style={[styles.itemLabel, { color: item.textColor }]}>{item.label}</Text>
                <Text style={[styles.itemDesc, { color: item.textColor, opacity: 0.7 }]}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.8}
          style={[styles.signOutCard, HardShadow.charcoal]}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  itemWrapper: { width: '47%' },
  item: {
    borderWidth: 2,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  itemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  itemEmoji: { fontSize: 24 },
  itemLabel: { ...Typography.h3 },
  itemDesc: { ...Typography.caption },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.onSurface,
  },
  signOutLabel: { ...Typography.label, color: Colors.error, fontWeight: '800' },
});
