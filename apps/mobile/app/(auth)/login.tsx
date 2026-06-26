import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero header */}
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoEmoji}>💰</Text>
            </View>
            <Text style={styles.title}>FPV Finance</Text>
            <Text style={styles.subtitle}>Family Finance Planner</Text>
          </View>

          {/* Card form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign In</Text>
            <View style={styles.form}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password"
              />
              <Button
                label="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.btn}
                size="lg"
              />
            </View>
          </View>

          <Text style={styles.hint}>Use the same credentials as the web app</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.inverseSurface },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.page,
    gap: Spacing.xl,
  },
  hero: { alignItems: 'center', gap: Spacing.sm },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...HardShadow.primary,
  },
  logoEmoji: { fontSize: 44 },
  title: { ...Typography.h1, color: Colors.white },
  subtitle: { ...Typography.labelXs, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  formCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.onSurface,
    ...HardShadow.primary,
    gap: Spacing.lg,
  },
  formTitle: { ...Typography.h2, color: Colors.onSurface },
  form: { gap: Spacing.lg },
  btn: { marginTop: Spacing.sm },
  hint: { ...Typography.caption, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
});
