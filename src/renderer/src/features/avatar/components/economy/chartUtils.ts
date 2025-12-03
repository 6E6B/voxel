import { Time } from 'lightweight-charts'
import { ChartDataPoint } from './predictionAlgorithm'

// ============================================================================
// Types
// ============================================================================

export type DateRange = '7d' | '30d' | '90d' | '180d' | '1y' | 'all' | 'custom'

export interface ChartConfig {
  color: string
  title: string
  emptyMessage: string
  dateRanges?: DateRange[]
  height?: number
  showVolume?: boolean
  showStatistics?: boolean
  showMovingAverage?: boolean
  movingAveragePeriod?: number
  allowExport?: boolean
}

// ============================================================================
// Formatting Utilities
// ============================================================================

export const formatPrice = (price: number): string => {
  if (price >= 1000000) {
    return (price / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (price >= 1000) {
    return (price / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return price.toLocaleString()
}

export const formatPercentChange = (change: number): string => {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

// ============================================================================
// Data Filtering
// ============================================================================

export const filterDataByDateRange = (
  data: ChartDataPoint[],
  dateRange: DateRange
): ChartDataPoint[] => {
  if (dateRange === 'all' || data.length === 0) return data

  const mostRecentTime = Math.max(...data.map((p) => p.time as number))
  const filterSeconds: Record<DateRange, number> = {
    '7d': 7 * 24 * 60 * 60,
    '30d': 30 * 24 * 60 * 60,
    '90d': 90 * 24 * 60 * 60,
    '180d': 180 * 24 * 60 * 60,
    '1y': 365 * 24 * 60 * 60,
    all: Infinity,
    custom: Infinity
  }

  const seconds = filterSeconds[dateRange]
  return data.filter((p) => (p.time as number) >= mostRecentTime - seconds)
}

// ============================================================================
// Data Parsing
// ============================================================================

/**
 * Parse value changes from Rolimons format to chart data points
 */
export const parseValueChanges = (
  valueChanges: (number | string | boolean | null)[][] | null
): ChartDataPoint[] => {
  if (!valueChanges || valueChanges.length === 0) return []

  const points: ChartDataPoint[] = []

  for (const change of valueChanges) {
    if (change[1] === 1 && typeof change[3] === 'number') {
      const timestamp = change[0] as number
      const value = change[3] as number

      points.push({
        value,
        time: timestamp as Time,
        dateStr: new Date(timestamp * 1000).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      })
    }
  }

  return points.sort((a, b) => (a.time as number) - (b.time as number))
}

/**
 * Parse RAP history data to chart data points
 */
export const parseRapHistory = (
  historyData: {
    timestamp?: number[] | null
    rap?: number[] | null
  } | null
): ChartDataPoint[] => {
  if (!historyData?.timestamp || !historyData?.rap || historyData.timestamp.length === 0) {
    return []
  }

  const timestamps = historyData.timestamp
  const rapValues = historyData.rap

  const points: ChartDataPoint[] = []
  const length = Math.min(timestamps.length, rapValues.length)

  for (let i = 0; i < length; i++) {
    if (rapValues[i] != null) {
      points.push({
        value: rapValues[i],
        time: timestamps[i] as Time,
        dateStr: new Date(timestamps[i] * 1000).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      })
    }
  }

  return points.sort((a, b) => (a.time as number) - (b.time as number))
}

// ============================================================================
// Export Utilities
// ============================================================================

export const exportChartAsCSV = (
  data: ChartDataPoint[],
  title: string,
  dateRange: DateRange,
  includeVolume: boolean = false
): void => {
  const csvContent = [
    ['Date', 'Value', ...(includeVolume ? ['Volume'] : [])].join(','),
    ...data.map((p) =>
      [p.dateStr, p.value, ...(includeVolume && p.volume !== undefined ? [p.volume] : [])].join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const link = document.createElement('a')
  link.download = `${title.replace(/\s+/g, '_')}_${dateRange}.csv`
  link.href = URL.createObjectURL(blob)
  link.click()
}

export const exportChartAsPNG = (
  canvas: HTMLCanvasElement | null,
  title: string,
  dateRange: DateRange
): void => {
  if (!canvas) return

  const link = document.createElement('a')
  link.download = `${title.replace(/\s+/g, '_')}_${dateRange}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
