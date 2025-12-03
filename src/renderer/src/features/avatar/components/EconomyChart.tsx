import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  AreaSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  Time,
  AreaData,
  LineData,
  HistogramData
} from 'lightweight-charts'
import { cn } from '@renderer/lib/utils'
import { EmptyStateCompact } from '@renderer/components/UI/feedback/EmptyState'
import { motion, AnimatePresence } from 'framer-motion'

// Import modularized utilities and components
import {
  ChartDataPoint,
  ChartConfig,
  DateRange,
  PredictionConfidence,
  formatPrice,
  filterDataByDateRange,
  calculateStatistics,
  calculateMovingAverage,
  parseValueChanges,
  parseRapHistory,
  exportChartAsCSV,
  exportChartAsPNG,
  DateRangeButton,
  ChartSkeleton,
  ChartControls,
  StatisticsPanel,
  ChartLegend,
  ChartTooltip,
  StatsToggle
} from './economy/index'

// ============================================================================
// Types
// ============================================================================

interface EconomyChartProps {
  data: ChartDataPoint[]
  config: ChartConfig
  className?: string
  isLoading?: boolean
  showPredictionToggle?: boolean
  onPredictionToggle?: (enabled: boolean) => void
  isPredicting?: boolean
  predictionConfidence?: PredictionConfidence | null
  predictionStartIndex?: number
  predictionData?: ChartDataPoint[]
}

// ============================================================================
// Main Economy Chart Component
// ============================================================================

export const EconomyChart: React.FC<EconomyChartProps> = ({
  data,
  config,
  className,
  isLoading = false,
  showPredictionToggle = false,
  onPredictionToggle,
  isPredicting = false,
  predictionConfidence,
  predictionStartIndex,
  predictionData = []
}) => {
  const {
    color,
    title,
    emptyMessage,
    dateRanges = ['7d', '30d', '90d', '180d', '1y', 'all'],
    height = 240,
    showVolume = false,
    showStatistics = true,
    showMovingAverage = false,
    movingAveragePeriod = 7,
    allowExport = true
  } = config

  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [showMA, setShowMA] = useState(showMovingAverage)
  const [showStats, setShowStats] = useState(false)

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const predictionSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const [tooltipData, setTooltipData] = useState<{
    visible: boolean
    price: number
    date: string
    x: number
    y: number
    volume?: number
    maValue?: number
  } | null>(null)

  // Filter data based on date range
  const filteredData = useMemo(() => filterDataByDateRange(data, dateRange), [data, dateRange])

  // Calculate moving average
  const maData = useMemo(() => {
    if (!showMA || filteredData.length < movingAveragePeriod) return []
    return calculateMovingAverage(filteredData, movingAveragePeriod)
  }, [filteredData, showMA, movingAveragePeriod])

  // Calculate statistics
  const statistics = useMemo(() => calculateStatistics(filteredData), [filteredData])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || filteredData.length < 2) return

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      mainSeriesRef.current = null
      predictionSeriesRef.current = null
      maSeriesRef.current = null
      volumeSeriesRef.current = null
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a3a3a3',
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        attributionLogo: false
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)', style: 1 },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)', style: 1 }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color, width: 1, style: 2, labelBackgroundColor: color },
        horzLine: { color, width: 1, style: 2, labelBackgroundColor: color }
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: { top: 0.1, bottom: showVolume ? 0.25 : 0.1 },
        autoScale: true
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 2,
        minBarSpacing: 1,
        fixLeftEdge: true,
        fixRightEdge: true
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false
      },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
    })

    // Add main series
    const mainSeries = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}50`,
      bottomColor: `${color}05`,
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (price: number) => formatPrice(price) },
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: color,
      crosshairMarkerBackgroundColor: '#0a0a0a',
      crosshairMarkerBorderWidth: 2
    })

    const chartData: AreaData<Time>[] = filteredData.map((p) => ({ time: p.time, value: p.value }))
    mainSeries.setData(chartData)
    mainSeriesRef.current = mainSeries

    // Add prediction series (cyan color, distinct from main series)
    if (isPredicting && predictionData.length > 0) {
      const predictionColor = '#06b6d4' // Cyan
      const predictionSeries = chart.addSeries(AreaSeries, {
        lineColor: predictionColor,
        topColor: `${predictionColor}40`,
        bottomColor: `${predictionColor}05`,
        lineWidth: 2,
        lineStyle: 2, // Dashed line
        priceFormat: { type: 'custom', formatter: (price: number) => formatPrice(price) },
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: predictionColor,
        crosshairMarkerBackgroundColor: '#0a0a0a',
        crosshairMarkerBorderWidth: 2
      })

      // Include the last historical point to connect the series smoothly
      const lastHistoricalPoint = filteredData[filteredData.length - 1]
      const predictionChartData: AreaData<Time>[] = [
        ...(lastHistoricalPoint
          ? [{ time: lastHistoricalPoint.time, value: lastHistoricalPoint.value }]
          : []),
        ...predictionData.map((p) => ({ time: p.time, value: p.value }))
      ]
      predictionSeries.setData(predictionChartData)
      predictionSeriesRef.current = predictionSeries
    }

    // Add moving average line
    if (showMA && maData.length > 0) {
      const maSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 2,
        priceFormat: { type: 'custom', formatter: (price: number) => formatPrice(price) },
        crosshairMarkerVisible: false
      })

      const maChartData: LineData<Time>[] = maData.map((p) => ({ time: p.time, value: p.value }))
      maSeries.setData(maChartData)
      maSeriesRef.current = maSeries
    }

    // Add volume histogram
    if (showVolume && filteredData.some((p) => p.volume !== undefined)) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: `${color}40`,
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume'
      })

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
        borderVisible: false
      })

      const volumeData: HistogramData<Time>[] = filteredData
        .filter((p) => p.volume !== undefined)
        .map((p) => ({
          time: p.time,
          value: p.volume!,
          color:
            p.value >= (filteredData[filteredData.indexOf(p) - 1]?.value ?? p.value)
              ? `${color}60`
              : '#ef444460'
        }))
      volumeSeries.setData(volumeData)
      volumeSeriesRef.current = volumeSeries
    }

    chart.timeScale().fitContent()

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        setTooltipData(null)
        return
      }

      // Check main series first, then prediction series
      let priceData = param.seriesData.get(mainSeries)
      let isPredictionPoint = false

      if ((!priceData || !('value' in priceData)) && predictionSeriesRef.current) {
        priceData = param.seriesData.get(predictionSeriesRef.current)
        isPredictionPoint = true
      }

      if (!priceData || !('value' in priceData)) {
        setTooltipData(null)
        return
      }

      const point = filteredData.find((p) => p.time === param.time)
      const predPoint = predictionData.find((p) => p.time === param.time)
      const maPoint = maData.find((p) => p.time === param.time)

      const dateStr =
        point?.dateStr ||
        predPoint?.dateStr ||
        new Date((param.time as number) * 1000).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) + (isPredictionPoint ? ' (Predicted)' : '')

      setTooltipData({
        visible: true,
        price: priceData.value,
        date: dateStr,
        x: param.point.x,
        y: param.point.y,
        volume: point?.volume,
        maValue: maPoint?.value
      })
    })

    chartRef.current = chart

    // Resize handling
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartContainerRef.current)

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!chartRef.current) return
      const timeScale = chartRef.current.timeScale()
      const currentRange = timeScale.getVisibleRange()
      if (!currentRange) return

      const rangeDiff = (currentRange.to as number) - (currentRange.from as number)
      const panAmount = rangeDiff * 0.1

      switch (e.key) {
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case 'r':
        case 'R':
          handleResetView()
          break
        case 'ArrowLeft':
          timeScale.setVisibleRange({
            from: ((currentRange.from as number) - panAmount) as Time,
            to: ((currentRange.to as number) - panAmount) as Time
          })
          break
        case 'ArrowRight':
          timeScale.setVisibleRange({
            from: ((currentRange.from as number) + panAmount) as Time,
            to: ((currentRange.to as number) + panAmount) as Time
          })
          break
      }
    }

    chartContainerRef.current.addEventListener('keydown', handleKeyDown)
    chartContainerRef.current.tabIndex = 0

    return () => {
      resizeObserver.disconnect()
      chartContainerRef.current?.removeEventListener('keydown', handleKeyDown)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        mainSeriesRef.current = null
        predictionSeriesRef.current = null
        maSeriesRef.current = null
        volumeSeriesRef.current = null
      }
    }
  }, [filteredData, showMA, maData, showVolume, color, height, isPredicting, predictionData])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale()
      const currentRange = timeScale.getVisibleRange()
      if (currentRange) {
        const center = ((currentRange.from as number) + (currentRange.to as number)) / 2
        const newHalfRange = ((currentRange.to as number) - (currentRange.from as number)) / 4
        timeScale.setVisibleRange({
          from: (center - newHalfRange) as Time,
          to: (center + newHalfRange) as Time
        })
      }
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale()
      const currentRange = timeScale.getVisibleRange()
      if (currentRange) {
        const center = ((currentRange.from as number) + (currentRange.to as number)) / 2
        const newHalfRange = (currentRange.to as number) - (currentRange.from as number)
        timeScale.setVisibleRange({
          from: (center - newHalfRange) as Time,
          to: (center + newHalfRange) as Time
        })
      }
    }
  }, [])

  const handleResetView = useCallback(() => {
    chartRef.current?.timeScale().fitContent()
  }, [])

  // Export handlers
  const handleExportPNG = useCallback(() => {
    const canvas = chartContainerRef.current?.querySelector('canvas')
    exportChartAsPNG(canvas as HTMLCanvasElement | null, title, dateRange)
  }, [title, dateRange])

  const handleExportCSV = useCallback(() => {
    exportChartAsCSV(filteredData, title, dateRange, showVolume)
  }, [filteredData, title, dateRange, showVolume])

  // Loading state
  if (isLoading) {
    return <ChartSkeleton height={height} />
  }

  // Empty state
  if (!data || data.length === 0) {
    return <EmptyStateCompact message={emptyMessage} className="p-8" />
  }

  // Not enough data
  if (filteredData.length < 2) {
    return (
      <motion.div
        className={cn(
          'w-full bg-neutral-900/30 border border-neutral-800/50 rounded-xl px-4 py-4',
          className
        )}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <div className="flex items-center gap-1">
            {dateRanges.map((range) => (
              <DateRangeButton
                key={range}
                range={range}
                activeRange={dateRange}
                onClick={setDateRange}
                accentColor={color}
              />
            ))}
          </div>
        </div>
        <div className="p-8 text-center text-neutral-500 text-sm">
          Not enough data for selected range
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn(
        'w-full bg-neutral-900/30 border border-neutral-800/50 rounded-xl px-4 py-4 relative',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          {showStatistics && statistics && (
            <StatsToggle showStats={showStats} onToggle={() => setShowStats(!showStats)} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <ChartControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            showMovingAverage={showMovingAverage}
            showMA={showMA}
            onToggleMA={() => setShowMA(!showMA)}
            movingAveragePeriod={movingAveragePeriod}
            showPredictionToggle={showPredictionToggle}
            isPredicting={isPredicting}
            onTogglePrediction={() => onPredictionToggle?.(!isPredicting)}
            predictionConfidence={predictionConfidence}
            allowExport={allowExport}
            onExportPNG={handleExportPNG}
            onExportCSV={handleExportCSV}
          />

          <div className="flex items-center gap-1">
            {dateRanges.map((range) => (
              <DateRangeButton
                key={range}
                range={range}
                activeRange={dateRange}
                onClick={setDateRange}
                accentColor={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Panel */}
      <AnimatePresence>
        {showStats && statistics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <StatisticsPanel statistics={statistics} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      <div
        ref={chartContainerRef}
        className="w-full relative outline-none focus:ring-1 focus:ring-neutral-600 rounded"
        style={{ height }}
      />

      {/* Legend */}
      <ChartLegend
        color={color}
        title={title}
        showMA={showMA}
        maDataLength={maData.length}
        movingAveragePeriod={movingAveragePeriod}
        isPredicting={isPredicting}
        hasPredictions={predictionStartIndex !== undefined}
      />

      {/* Tooltip */}
      {tooltipData && (
        <ChartTooltip
          visible={tooltipData.visible}
          price={tooltipData.price}
          date={tooltipData.date}
          x={tooltipData.x}
          y={tooltipData.y}
          color={color}
          volume={tooltipData.volume}
          maValue={tooltipData.maValue}
          containerWidth={chartContainerRef.current?.clientWidth || 300}
        />
      )}
    </motion.div>
  )
}

// ============================================================================
// Value Chart (Pre-configured for Value History)
// ============================================================================

interface ValueChartProps {
  valueChanges: (number | string | boolean | null)[][] | null
  className?: string
  isLoading?: boolean
  demand?: number
  trend?: number
  isProjected?: boolean
}

export const ValueChart: React.FC<ValueChartProps> = ({ valueChanges, className, isLoading }) => {
  const data = useMemo(() => parseValueChanges(valueChanges), [valueChanges])

  return (
    <div className="relative">
      <EconomyChart
        data={data}
        predictionData={[]}
        config={{
          color: '#a855f7',
          title: 'Value History',
          emptyMessage: 'No value history available',
          dateRanges: ['30d', '90d', '180d', '1y', 'all'],
          height: 220,
          showStatistics: true,
          showMovingAverage: false,
          movingAveragePeriod: 7,
          allowExport: true
        }}
        className={className}
        isLoading={isLoading}
        showPredictionToggle={false}
        isPredicting={false}
        predictionConfidence={null}
        predictionStartIndex={undefined}
      />
    </div>
  )
}

// ============================================================================
// Price Chart (Pre-configured for RAP History)
// ============================================================================

interface PriceChartProps {
  historyData: {
    num_points?: number | null
    timestamp?: number[] | null
    rap?: number[] | null
    best_price?: number[] | null
    num_sellers?: number[] | null
  } | null
  className?: string
  isLoading?: boolean
  demand?: number
  trend?: number
  isProjected?: boolean
}

export const PriceChart: React.FC<PriceChartProps> = ({ historyData, className, isLoading }) => {
  const data = useMemo(() => parseRapHistory(historyData), [historyData])

  return (
    <div className="relative">
      <EconomyChart
        data={data}
        predictionData={[]}
        config={{
          color: '#10b981',
          title: 'RAP History',
          emptyMessage: 'No price history available',
          dateRanges: ['7d', '30d', '90d', '180d', 'all'],
          height: 240,
          showStatistics: true,
          showMovingAverage: false,
          movingAveragePeriod: 7,
          allowExport: true
        }}
        className={className}
        isLoading={isLoading}
        showPredictionToggle={false}
        isPredicting={false}
        predictionConfidence={null}
        predictionStartIndex={undefined}
      />
    </div>
  )
}

// ============================================================================
// Combined Chart (Value vs RAP)
// ============================================================================

interface CombinedChartProps {
  valueChanges: (number | string | boolean | null)[][] | null
  historyData?: {
    num_points?: number | null
    timestamp?: number[] | null
    rap?: number[] | null
  } | null
  className?: string
  isLoading?: boolean
}

export const CombinedChart: React.FC<CombinedChartProps> = ({
  valueChanges,
  historyData,
  className,
  isLoading
}) => {
  const valueData = useMemo(() => parseValueChanges(valueChanges), [valueChanges])
  const rapData = useMemo(() => parseRapHistory(historyData || null), [historyData])

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const valueSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const rapSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('all')

  const filteredValueData = useMemo(
    () => filterDataByDateRange(valueData, dateRange),
    [valueData, dateRange]
  )
  const filteredRapData = useMemo(
    () => filterDataByDateRange(rapData, dateRange),
    [rapData, dateRange]
  )

  useEffect(() => {
    if (
      !chartContainerRef.current ||
      (filteredValueData.length === 0 && filteredRapData.length === 0)
    )
      return

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      valueSeriesRef.current = null
      rapSeriesRef.current = null
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a3a3a3',
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        attributionLogo: false
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)', style: 1 },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)', style: 1 }
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 2,
        minBarSpacing: 1,
        fixLeftEdge: true,
        fixRightEdge: true
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false
      },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
    })

    if (filteredValueData.length > 0) {
      const valueSeries = chart.addSeries(AreaSeries, {
        lineColor: '#a855f7',
        topColor: '#a855f750',
        bottomColor: '#a855f705',
        lineWidth: 2,
        priceFormat: { type: 'custom', formatter: (price: number) => formatPrice(price) },
        priceScaleId: 'left',
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: '#a855f7',
        crosshairMarkerBackgroundColor: '#0a0a0a',
        crosshairMarkerBorderWidth: 2
      })

      const valueChartData: AreaData<Time>[] = filteredValueData.map((p) => ({
        time: p.time,
        value: p.value
      }))
      valueSeries.setData(valueChartData)
      valueSeriesRef.current = valueSeries
    }

    if (filteredRapData.length > 0) {
      const rapSeries = chart.addSeries(AreaSeries, {
        lineColor: '#10b981',
        topColor: '#10b98150',
        bottomColor: '#10b98105',
        lineWidth: 2,
        priceFormat: { type: 'custom', formatter: (price: number) => formatPrice(price) },
        priceScaleId: 'right',
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: '#10b981',
        crosshairMarkerBackgroundColor: '#0a0a0a',
        crosshairMarkerBorderWidth: 2
      })

      const rapChartData: AreaData<Time>[] = filteredRapData.map((p) => ({
        time: p.time,
        value: p.value
      }))
      rapSeries.setData(rapChartData)
      rapSeriesRef.current = rapSeries
    }

    chart.timeScale().fitContent()
    chartRef.current = chart

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        valueSeriesRef.current = null
        rapSeriesRef.current = null
      }
    }
  }, [filteredValueData, filteredRapData])

  if (isLoading) {
    return <ChartSkeleton height={240} />
  }

  if (valueData.length === 0 && rapData.length === 0) {
    return <EmptyStateCompact message="No chart data available" className="p-8" />
  }

  return (
    <motion.div
      className={cn(
        'w-full bg-neutral-900/30 border border-neutral-800/50 rounded-xl px-4 py-4 relative',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-white">Value vs RAP</h3>
        <div className="flex items-center gap-1">
          {['30d', '90d', '180d', '1y', 'all'].map((range) => (
            <DateRangeButton
              key={range}
              range={range as DateRange}
              activeRange={dateRange}
              onClick={setDateRange}
              accentColor="#a855f7"
            />
          ))}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full relative outline-none focus:ring-1 focus:ring-neutral-600 rounded"
        style={{ height: 240 }}
      />

      <div className="mt-2 flex items-center gap-4 text-xs">
        {valueData.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-purple-500" />
            <span className="text-neutral-400">Value</span>
          </div>
        )}
        {rapData.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-emerald-500" />
            <span className="text-neutral-400">RAP</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default EconomyChart
