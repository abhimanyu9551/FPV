import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart as GiftedLine } from 'react-native-gifted-charts';
import { Colors, Typography } from '@/lib/colors';

export interface LinePoint {
  value: number;
  label?: string;
}

interface LineChartProps {
  data: LinePoint[];
  title?: string;
  color?: string;
  height?: number;
}

export function LineChart({
  data,
  title,
  color = Colors.secondary,
  height = 140,
}: LineChartProps) {
  return (
    <View style={styles.wrapper}>
      {title && <Text style={styles.title}>{title}</Text>}
      <GiftedLine
        data={data.map((d) => ({
          value: d.value,
          label: d.label ?? '',
          labelTextStyle: styles.axisLabel,
        }))}
        height={height}
        color={color}
        thickness={2.5}
        curved
        areaChart
        startFillColor={color}
        endFillColor="transparent"
        startOpacity={0.3}
        endOpacity={0}
        dataPointsColor={color}
        dataPointsRadius={4}
        yAxisColor="transparent"
        xAxisColor="transparent"
        yAxisTextStyle={styles.axisLabel}
        rulesColor="rgba(255,255,255,0.08)"
        backgroundColor="transparent"
        isAnimated
        animationDuration={600}
        hideDataPoints={data.length > 10}
        noOfSections={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  title: {
    ...Typography.label,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  axisLabel: { ...Typography.caption, color: Colors.outline },
});
