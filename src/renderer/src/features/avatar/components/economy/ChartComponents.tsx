import React from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Download,
  BarChart3,
  ChevronDown,
  Minus,
  Sparkles
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'
import { DateRange, formatPrice, formatPercentChange } from './index'
import { PredictionConfidence } from './predictionAlgorithm'

// ============================================================================
// Stat Badge Component
// ============================================================================

interface StatBadgeProps {
  label: string
  value: string
  color?: string
  icon?: React.ReactNode
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  color = 'text-neutral-300',
  icon
}) => (
  <div className="flex flex-col items-center px-3 py-1.5 bg-neutral-800/30 rounded-lg">
    <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</span>
    <span className={cn('text-sm font-semibold flex items-center gap-1', color)}>
      {icon}
      {value}
    </span>
  </div>
)

// ============================================================================
// Date Range Button Component
// ============================================================================

interface DateRangeButtonProps {
  range: DateRange
  activeRange: DateRange
  onClick: (range: DateRange) => void
  accentColor: string
}

export const DateRangeButton: React.FC<DateRangeButtonProps> = ({
  range,
  activeRange,
  onClick,
  accentColor
}) => {
  const labels: Record<DateRange, string> = {
    '7d': '7D',
    '30d': '30D',
    '90d': '90D',
    '180d': '180D',
    '1y': '1Y',
    all: 'All',
    custom: 'Custom'
  }

  const isActive = activeRange === range

  return (
    <button
      onClick={() => onClick(range)}
      className={cn(
        'px-2 py-1 text-xs rounded transition-colors',
        isActive ? 'border' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
      )}
      style={
        isActive
          ? {
              backgroundColor: `${accentColor}20`,
              color: accentColor,
              borderColor: `${accentColor}30`
            }
          : undefined
      }
    >
      {labels[range]}
    </button>
  )
}

// ============================================================================
// Chart Skeleton Component
// ============================================================================

interface ChartSkeletonProps {
  height: number
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ height }) => (
  <div className="w-full overflow-hidden bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-4">
    <div className="mb-3 flex items-center justify-between">
      <div className="h-5 w-32 bg-neutral-800 rounded animate-pulse" />
      <div className="flex items-center gap-2">
        <div className="h-6 w-20 bg-neutral-800 rounded animate-pulse" />
        <div className="h-6 w-32 bg-neutral-800 rounded animate-pulse" />
      </div>
    </div>
    <div className="w-full bg-neutral-800/30 rounded animate-pulse" style={{ height }} />
  </div>
)

// ============================================================================
// Chart Controls Component
// ============================================================================

interface ChartControlsProps {
  // Zoom controls
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void

  // Moving average
  showMovingAverage?: boolean
  showMA: boolean
  onToggleMA: () => void
  movingAveragePeriod?: number

  // Prediction
  showPredictionToggle?: boolean
  isPredicting: boolean
  onTogglePrediction: () => void
  predictionConfidence?: PredictionConfidence | null

  // Export
  allowExport?: boolean
  onExportPNG: () => void
  onExportCSV: () => void
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  showMovingAverage = false,
  showMA,
  onToggleMA,
  movingAveragePeriod = 7,
  showPredictionToggle = false,
  isPredicting,
  onTogglePrediction,
  predictionConfidence,
  allowExport = true,
  onExportPNG,
  onExportCSV
}) => (
  <div className="flex items-center gap-1 border-r border-neutral-700 pr-2">
    {/* Prediction toggle */}
    {showPredictionToggle && (
      <div className="relative group">
        <button
          onClick={onTogglePrediction}
          className={cn(
            'flex items-center gap-1 p-1.5 rounded transition-colors text-xs font-medium',
            isPredicting
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
          )}
          title="Show 30-day prediction"
        >
          <Sparkles size={12} />
          Predict
        </button>
        {isPredicting && predictionConfidence && (
          <div className="absolute left-0 top-full mt-1.5 p-3 bg-neutral-900/95 backdrop-blur-sm border border-neutral-800/50 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[200px]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Sparkles size={10} className="text-cyan-400" />
                Confidence
              </div>
              <span
                className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded',
                  predictionConfidence.level === 'high'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : predictionConfidence.level === 'medium'
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-red-400 bg-red-500/10'
                )}
              >
                {predictionConfidence.level.charAt(0).toUpperCase() +
                  predictionConfidence.level.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    predictionConfidence.level === 'high'
                      ? 'bg-emerald-500'
                      : predictionConfidence.level === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${predictionConfidence.percentage}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-neutral-300 tabular-nums w-8 text-right">
                {predictionConfidence.percentage}%
              </span>
            </div>
            {predictionConfidence.factors.length > 0 && (
              <div className="space-y-1 mb-2.5">
                {predictionConfidence.factors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[12px] text-neutral-400">
                    <span className="text-neutral-600 mt-px">•</span>
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {/* Moving average toggle */}
    {showMovingAverage && (
      <button
        onClick={onToggleMA}
        className={cn(
          'p-1.5 rounded transition-colors text-xs font-medium',
          showMA
            ? 'bg-amber-500/20 text-amber-400'
            : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
        )}
        title={`${movingAveragePeriod}-day Moving Average`}
      >
        MA
      </button>
    )}

    <button
      onClick={onZoomIn}
      className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
      title="Zoom In (+)"
    >
      <ZoomIn size={14} />
    </button>
    <button
      onClick={onZoomOut}
      className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
      title="Zoom Out (-)"
    >
      <ZoomOut size={14} />
    </button>
    <button
      onClick={onResetView}
      className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
      title="Reset View (R)"
    >
      <RotateCcw size={14} />
    </button>

    {/* Export dropdown */}
    {allowExport && (
      <div className="relative group">
        <button
          className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          title="Export"
        >
          <Download size={14} />
        </button>
        <div className="absolute right-0 top-full mt-1 py-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[100px]">
          <button
            onClick={onExportPNG}
            className="w-full px-3 py-1.5 text-xs text-left text-neutral-300 hover:bg-neutral-700 hover:text-white"
          >
            Export PNG
          </button>
          <button
            onClick={onExportCSV}
            className="w-full px-3 py-1.5 text-xs text-left text-neutral-300 hover:bg-neutral-700 hover:text-white"
          >
            Export CSV
          </button>
        </div>
      </div>
    )}
  </div>
)

// ============================================================================
// Statistics Panel Component
// ============================================================================

interface StatisticsPanelProps {
  statistics: {
    min: number
    max: number
    avg: number
    change: number
    volatility: number
  }
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ statistics }) => (
  <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-neutral-800/50">
    <StatBadge label="Min" value={formatPrice(statistics.min)} />
    <StatBadge label="Max" value={formatPrice(statistics.max)} />
    <StatBadge label="Avg" value={formatPrice(statistics.avg)} />
    <StatBadge
      label="Change"
      value={formatPercentChange(statistics.change)}
      color={statistics.change >= 0 ? 'text-emerald-400' : 'text-red-400'}
      icon={
        statistics.change >= 0 ? (
          <TrendingUp size={12} />
        ) : statistics.change < 0 ? (
          <TrendingDown size={12} />
        ) : (
          <Minus size={12} />
        )
      }
    />
    <StatBadge
      label="Volatility"
      value={`${statistics.volatility.toFixed(1)}%`}
      color={statistics.volatility > 20 ? 'text-amber-400' : 'text-neutral-300'}
    />
  </div>
)

// ============================================================================
// Chart Legend Component
// ============================================================================

interface ChartLegendProps {
  color: string
  title: string
  showMA: boolean
  maDataLength: number
  movingAveragePeriod: number
  isPredicting: boolean
  hasPredictions: boolean
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  color,
  title,
  showMA,
  maDataLength,
  movingAveragePeriod,
  isPredicting,
  hasPredictions
}) => {
  const showLegend = (showMA && maDataLength > 0) || isPredicting

  if (!showLegend) return null

  return (
    <div className="mt-2 flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
        <span className="text-neutral-400">{title.replace(' History', '')}</span>
      </div>
      {showMA && maDataLength > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-amber-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-neutral-400">{movingAveragePeriod}-day MA</span>
        </div>
      )}
      {isPredicting && hasPredictions && (
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-cyan-500 opacity-60" />
          <span className="text-cyan-400/80">30-day Prediction</span>
          <Sparkles size={10} className="text-cyan-400/60" />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Chart Tooltip Component
// ============================================================================

interface ChartTooltipProps {
  visible: boolean
  price: number
  date: string
  x: number
  y: number
  color: string
  volume?: number
  maValue?: number
  containerWidth: number
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  visible,
  price,
  date,
  x,
  y,
  color,
  volume,
  maValue,
  containerWidth
}) => {
  if (!visible) return null

  return (
    <div
      className="absolute z-50 pointer-events-none bg-neutral-900/95 border border-neutral-700 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{
        left: Math.min(x + 12, containerWidth - 160),
        top: Math.max(y - 80, 60)
      }}
    >
      <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color }}>
        {price.toLocaleString()}
        <RobuxIcon className="w-3.5 h-3.5" />
      </div>
      {maValue !== undefined && (
        <div className="text-amber-400 text-xs mt-0.5">MA: {formatPrice(maValue)}</div>
      )}
      {volume !== undefined && (
        <div className="text-neutral-400 text-xs mt-0.5">Vol: {volume.toLocaleString()}</div>
      )}
      <div className="text-neutral-500 text-xs mt-1">{date}</div>
    </div>
  )
}

// ============================================================================
// Stats Toggle Button Component
// ============================================================================

interface StatsToggleProps {
  showStats: boolean
  onToggle: () => void
}

export const StatsToggle: React.FC<StatsToggleProps> = ({ showStats, onToggle }) => (
  <button
    onClick={onToggle}
    className={cn(
      'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
      showStats ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
    )}
  >
    <BarChart3 size={12} />
    Stats
    <ChevronDown size={10} className={cn('transition-transform', showStats && 'rotate-180')} />
  </button>
)
