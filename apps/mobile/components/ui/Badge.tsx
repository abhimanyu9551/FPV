import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Typography } from '@/lib/colors';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'teal' | 'pink';

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: Colors.secondaryContainer, text: Colors.secondary },
  danger: { bg: Colors.errorContainer, text: Colors.error },
  warning: { bg: Colors.tertiaryFixed, text: Colors.tertiary },
  info: { bg: Colors.primaryFixed, text: Colors.primary },
  neutral: { bg: Colors.surfaceContainerHighest, text: Colors.onSurfaceVariant },
  teal: { bg: Colors.secondaryContainer, text: Colors.secondary },
  pink: { bg: Colors.primaryFixed, text: Colors.primary },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const { bg, text } = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
