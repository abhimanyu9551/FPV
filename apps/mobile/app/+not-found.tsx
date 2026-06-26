import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/lib/colors';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>Page Not Found</Text>
        <Link href="/(tabs)" style={styles.link}>
          Go to Home
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emoji: { fontSize: 48 },
  title: { ...Typography.h2, color: Colors.onSurface },
  link: { ...Typography.bodyMedium, color: Colors.primary, fontWeight: '600' },
});
