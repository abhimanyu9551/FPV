import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  size = 'md',
}: ButtonProps) {
  const bg: Record<string, string> = {
    primary: Colors.primary,
    secondary: Colors.secondary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: Colors.danger,
  };

  const textColor: Record<string, string> = {
    primary: Colors.onPrimary,
    secondary: Colors.onSecondary,
    outline: Colors.primary,
    ghost: Colors.onSurface,
    danger: Colors.onError,
  };

  const sizeStyle: Record<string, { paddingVertical: number; fontSize: number }> = {
    sm: { paddingVertical: 8, fontSize: 13 },
    md: { paddingVertical: 14, fontSize: 15 },
    lg: { paddingVertical: 18, fontSize: 16 },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        { backgroundColor: bg[variant], paddingVertical: sizeStyle[size].paddingVertical },
        variant === 'outline' && styles.outline,
        variant === 'primary' && HardShadow.primary,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { color: textColor[variant], fontSize: sizeStyle[size].fontSize },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outline: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
