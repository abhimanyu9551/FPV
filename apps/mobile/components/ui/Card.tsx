import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, HardShadow, Radius, Spacing } from '@/lib/colors';

interface CardProps {
  children: React.ReactNode;
  color?: string;
  style?: ViewStyle;
  padded?: boolean;
  bordered?: boolean;
  hardShadow?: boolean;
}

export function Card({
  children,
  color = Colors.surfaceContainerLowest,
  style,
  padded = true,
  bordered = false,
  hardShadow = false,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: color },
        padded && styles.padded,
        bordered && styles.bordered,
        hardShadow && HardShadow.charcoal,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.lg,
  },
  bordered: {
    borderWidth: 2,
    borderColor: Colors.onSurface,
  },
});
