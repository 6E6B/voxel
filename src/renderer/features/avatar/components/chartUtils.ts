import { Time } from 'lightweight-charts'

// ============================================================================
// Types
// ============================================================================

/**
 * Chart data point representing a single price/value entry
 */
export interface ChartDataPoint {
  value: number
  time: Time
  dateStr: string
  volume?: number
}

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
// Statistics and Moving Average Utilities
// ============================================================================

/**
 * Calculate basic statistics for a dataset
 */
export const calculateStatistics = (data: ChartDataPoint[]) => {
  if (data.length === 0) return null

  const values = data.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const first = values[0]
  const last = values[values.length - 1]
  const change = first !== 0 ? ((last - first) / first) * 100 : 0

  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
  const volatility = Math.sqrt(variance)
  const volatilityPercent = avg !== 0 ? (volatility / avg) * 100 : 0

  return { min, max, avg, first, last, change, volatility: volatilityPercent }
}

/**
 * Calculate Moving Average data points
 */
export const calculateMovingAverage = (
  data: ChartDataPoint[],
  period: number
): ChartDataPoint[] => {
  if (data.length < period) return []

  const result: ChartDataPoint[] = []
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1)
    const avg = slice.reduce((sum, p) => sum + p.value, 0) / period
    result.push({
      value: avg,
      time: data[i].time,
      dateStr: data[i].dateStr
    })
  }
  return result
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
