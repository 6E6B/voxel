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
  Minus
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'
import { DateRange, formatPrice, formatPercentChange } from './index'

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

  // Prediction (removed)

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
  allowExport = true,
  onExportPNG,
  onExportCSV
}) => (
  <div className="flex items-center gap-1 border-r border-neutral-700 pr-2">
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
        <div className="absolute right-0 top-full mt-1 py-1 bg-neutral-800 border border-neutral-700 rounded-[var(--menu-radius)] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[100px]">
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
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  color,
  title,
  showMA,
  maDataLength,
  movingAveragePeriod
}) => {
  if (!showMA || maDataLength === 0) return null

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
