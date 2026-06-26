import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart as GiftedBar } from 'react-native-gifted-charts';
import { Colors, Typography } from '@/lib/colors';

export interface BarItem {
  value: number;
  label: string;
  frontColor?: string;
}

interface BarChartProps {
  data: BarItem[];
  title?: string;
  height?: number;
  color?: string;
  secondaryData?: BarItem[];
  secondaryColor?: string;
}

export function BarChart({
  data,
  title,
  height = 160,
  color = Colors.secondary,
  secondaryData,
  secondaryColor = Colors.primary,
}: BarChartProps) {
  const chartData = secondaryData
    ? data.map((d, i) => [
        { value: d.value, frontColor: color, label: d.label, spacing: 4, labelWidth: 40, labelTextStyle: styles.axisLabel },
        { value: secondaryData[i]?.value ?? 0, frontColor: secondaryColor },
      ]).flat()
    : data.map((d) => ({
        value: d.value,
        frontColor: d.frontColor ?? color,
        label: d.label,
        labelWidth: 40,
        labelTextStyle: styles.axisLabel,
      }));

  return (
    <View style={styles.wrapper}>
      {title && <Text style={styles.title}>{title}</Text>}
      <GiftedBar
        data={chartData}
        barWidth={secondaryData ? 14 : 20}
        barBorderRadius={6}
        height={height}
        yAxisColor="transparent"
        xAxisColor="transparent"
        yAxisTextStyle={styles.axisLabel}
        noOfSections={4}
        rulesColor="rgba(255,255,255,0.08)"
        backgroundColor="transparent"
        hideRules={false}
        isAnimated
        animationDuration={500}
      />
      {secondaryData && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: secondaryColor }]} />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  title: { ...Typography.label, color: Colors.outline, textTransform: 'uppercase', letterSpacing: 0.5 },
  axisLabel: { ...Typography.caption, color: Colors.outline },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...Typography.caption, color: Colors.outline },
});
