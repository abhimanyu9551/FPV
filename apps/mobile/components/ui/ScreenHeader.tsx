import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/lib/colors';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  right,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.page,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  backBtn: { padding: 4 },
  title: { ...Typography.h1, color: Colors.onSurface, fontSize: 28 },
  subtitle: { ...Typography.labelXs, color: Colors.onSurfaceVariant, marginTop: 2, letterSpacing: 0.5 },
});
