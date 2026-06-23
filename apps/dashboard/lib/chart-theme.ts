'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface ChartTheme {
  gridColor: string
  textColor: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  colors: string[]
}

const lightTheme: ChartTheme = {
  gridColor: '#E5E7EB',
  textColor: '#475569',
  tooltipBg: '#ffffff',
  tooltipBorder: '#E5E7EB',
  tooltipText: '#0d1c2e',
  colors: ['#3525cd', '#006c49', '#7b3300', '#8B5CF6', '#ba1a1a', '#EC4899', '#14B8A6', '#F97316'],
}

const darkTheme: ChartTheme = {
  gridColor: '#374151',
  textColor: '#9ca3af',
  tooltipBg: '#1f1f28',
  tooltipBorder: '#464555',
  tooltipText: '#e4e1ee',
  colors: ['#6366f1', '#4edea3', '#ffb95f', '#a78bfa', '#ffb4ab', '#f472b6', '#2dd4bf', '#fb923c'],
}

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return darkTheme

  return resolvedTheme === 'dark' ? darkTheme : lightTheme
}
