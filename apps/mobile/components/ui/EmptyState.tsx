import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/lib/colors';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = '📭',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  icon: { fontSize: 48 },
  title: { ...Typography.h3, color: Colors.onSurface, textAlign: 'center' },
  message: { ...Typography.body, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 260 },
  btn: { marginTop: Spacing.md },
});
