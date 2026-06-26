import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Colors, Typography } from '@/lib/colors';

export interface DonutSlice {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 160,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <View style={styles.wrapper}>
      <PieChart
        data={data.map((d) => ({
          value: d.value,
          color: d.color,
          text: '',
        }))}
        donut
        radius={size / 2}
        innerRadius={size / 2 - 28}
        innerCircleColor={Colors.inverseSurface}
        centerLabelComponent={() => (
          <View style={styles.center}>
            {centerValue && (
              <Text style={styles.centerValue}>{centerValue}</Text>
            )}
            {centerLabel && (
              <Text style={styles.centerLabel}>{centerLabel}</Text>
            )}
          </View>
        )}
      />

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((d) => (
          <View key={d.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel}>{d.label}</Text>
            <Text style={styles.legendPct}>
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 16 },
  center: { alignItems: 'center' },
  centerValue: { fontSize: 20, fontWeight: '800', color: Colors.white },
  centerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  legend: { gap: 8, width: '100%', paddingHorizontal: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...Typography.caption, color: Colors.outlineVariant, flex: 1 },
  legendPct: { ...Typography.caption, color: Colors.white, fontWeight: '600' },
});
