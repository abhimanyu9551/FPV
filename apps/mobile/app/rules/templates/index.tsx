import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useRuleTemplates,
  useApplyTemplate,
  type RuleTemplate,
} from '@/lib/hooks/useFinancialRules';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, HardShadow, Radius, Spacing, Typography } from '@/lib/colors';

const TEMPLATE_ICONS: Record<string, string> = {
  'Single Professional': '👤',
  'Married Couple': '👫',
  'Indian Expat': '🇮🇳',
  'FIRE Strategy': '🔥',
  'Debt Payoff': '💳',
};

const TEMPLATE_BG: Record<string, string> = {
  INDIVIDUAL: Colors.secondary,
  COUPLE: Colors.primary,
  EXPAT: Colors.tertiary,
  FIRE: Colors.inverseSurface,
  DEBT: Colors.error,
};

export default function TemplatesScreen() {
  const router = useRouter();
  const { data: templates, isLoading } = useRuleTemplates();
  const applyTemplate = useApplyTemplate();

  function handleApply(template: RuleTemplate) {
    Alert.alert(
      `Apply "${template.name}"`,
      `This will create ${template.rules.length} new rule${template.rules.length !== 1 ? 's' : ''} based on this template. You can edit them afterwards.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              await applyTemplate.mutateAsync(template);
              Alert.alert('Done', `${template.rules.length} rules created from template.`, [
                { text: 'View Rules', onPress: () => router.back() },
              ]);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  if (isLoading) return <LoadingState message="Loading templates..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Templates" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Start with a template to quickly set up common financial automation patterns. You can customise each rule after applying.
        </Text>

        {!templates?.length ? (
          <EmptyState
            icon="📋"
            title="No templates"
            message="Templates will appear here once seeded"
          />
        ) : (
          templates.map((template) => {
            const icon = TEMPLATE_ICONS[template.name] ?? '⚡';
            const bg = TEMPLATE_BG[template.category] ?? Colors.secondary;
            return (
              <Card
                key={template.id}
                color={bg}
                bordered
                hardShadow
                style={styles.templateCard}
              >
                <View style={styles.templateHeader}>
                  <Text style={styles.templateIcon}>{icon}</Text>
                  <View style={styles.templateTitle}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Badge label={`${template.rules.length} rules`} variant="neutral" />
                  </View>
                </View>
                {template.description && (
                  <Text style={styles.templateDesc}>{template.description}</Text>
                )}
                <View style={styles.templateRules}>
                  {template.rules.slice(0, 4).map((rule, i) => (
                    <View key={i} style={styles.templateRuleRow}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={Colors.white} />
                      <Text style={styles.templateRuleLabel} numberOfLines={1}>
                        {rule.name}
                        {rule.allocationType === 'PERCENTAGE'
                          ? ` — ${rule.allocationPercent}%`
                          : rule.allocationType === 'FIXED_AMOUNT'
                          ? ` — £${rule.allocationValue}`
                          : ' — Remaining'}
                      </Text>
                    </View>
                  ))}
                  {template.rules.length > 4 && (
                    <Text style={styles.moreRules}>+{template.rules.length - 4} more</Text>
                  )}
                </View>
                <Button
                  label={applyTemplate.isPending ? 'Applying...' : 'Apply Template'}
                  onPress={() => handleApply(template)}
                  variant="secondary"
                  size="sm"
                  loading={applyTemplate.isPending}
                  style={styles.applyBtn}
                />
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.page, gap: Spacing.lg, paddingBottom: 40 },
  intro: { ...Typography.body, color: Colors.onSurfaceVariant, lineHeight: 22 },
  templateCard: { gap: Spacing.md },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  templateIcon: { fontSize: 32 },
  templateTitle: { flex: 1, gap: 4 },
  templateName: { ...Typography.h3, color: Colors.white },
  templateDesc: { ...Typography.body, color: Colors.white, opacity: 0.85, lineHeight: 22 },
  templateRules: { gap: 6 },
  templateRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  templateRuleLabel: { ...Typography.caption, color: Colors.white, flex: 1 },
  moreRules: { ...Typography.caption, color: Colors.white, opacity: 0.7, fontStyle: 'italic' },
  applyBtn: { alignSelf: 'flex-start' },
});
