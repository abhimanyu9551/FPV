import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  textLight?: boolean;
  style?: ViewStyle;
  trend?: { value: string; positive: boolean };
  bordered?: boolean;
  hardShadow?: boolean;
}

export function KpiCard({
  label,
  value,
  subtitle,
  icon,
  color = Colors.surfaceContainerLowest,
  textLight = false,
  style,
  trend,
  bordered = false,
  hardShadow = false,
}: KpiCardProps) {
  const textColor = textLight ? Colors.white : Colors.onSurface;
  const subColor = textLight ? 'rgba(255,255,255,0.7)' : Colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: color },
        bordered && styles.bordered,
        hardShadow ? HardShadow.charcoal : undefined,
        style,
      ]}
    >
      <Text style={[styles.label, { color: subColor }]}>{label}</Text>
      <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      {(subtitle || trend) && (
        <View style={styles.bottom}>
          {subtitle && (
            <Text style={[styles.subtitle, { color: subColor }]}>{subtitle}</Text>
          )}
          {trend && (
            <View
              style={[
                styles.trendBadge,
                { backgroundColor: trend.positive ? Colors.secondaryContainer : Colors.errorContainer },
              ]}
            >
              <Text
                style={[
                  styles.trendText,
                  { color: trend.positive ? Colors.secondary : Colors.error },
                ]}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}
              </Text>
            </View>
          )}
          {icon && !trend && <Text style={styles.icon}>{icon}</Text>}
        </View>
      )}
      {icon && !subtitle && !trend && (
        <Text style={styles.iconLarge}>{icon}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 6,
  },
  bordered: {
    borderWidth: 2,
    borderColor: Colors.onSurface,
  },
  label: {
    ...Typography.label,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    ...Typography.stat,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  subtitle: { ...Typography.labelXs },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  trendText: {
    ...Typography.labelXs,
    fontWeight: '700',
  },
  icon: { fontSize: 16 },
  iconLarge: { fontSize: 28, position: 'absolute', top: Spacing.lg, right: Spacing.lg, opacity: 0.3 },
});
