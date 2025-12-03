import { Time } from 'lightweight-charts'

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Raw price data point from the chart
 */
export interface ChartDataPoint {
  value: number
  time: Time
  dateStr: string
  volume?: number
}

/**
 * Sanitized data point after filtering snipes and anomalies
 */
export interface SanitizedDataPoint extends ChartDataPoint {
  isSnipe: boolean
  isOutlier: boolean
}

/**
 * Order book entry representing a seller's listing
 */
export interface OrderBookEntry {
  price: number
  sellerId?: number
}

/**
 * Configuration for predictions - now fundamentals-first
 * This replaces the old chart-first approach with external API data
 */
export interface PredictionConfig {
  // === Fundamental Data (from Rolimons/API) ===
  sellers?: number // Active seller count - critical for regime detection
  demand?: number // API Demand rating: -1 (None) to 4 (Amazing)
  trend?: number // API Trend rating: -1 (None) to 4 (Fluctuating)
  rap?: number // Recent Average Price - what it's actually selling for
  value?: number // Community Value - what people think it's worth
  isProjected?: boolean // API flag - item price is artificially inflated

  // === Order Book Data (for gap analysis) ===
  orderBook?: OrderBookEntry[] // Next 5 seller prices for "Gap Strength" calculation

  // === Prediction Settings ===
  predictionDays?: number // How many days to forecast (default: 30)
}

/**
 * Prediction confidence with detailed breakdown
 */
export interface PredictionConfidence {
  level: 'low' | 'medium' | 'high'
  percentage: number
  factors: string[]
}

/**
 * Market regime determines which prediction engine to use
 * - FLOW: Liquid items with many sellers (treat like commodities)
 * - INERTIA: Illiquid rare items (price anchored to last sale)
 * - GRAVITY: Projected items (price will crash back to reality)
 */
export type MarketRegime = 'FLOW' | 'INERTIA' | 'GRAVITY'

/**
 * Extended prediction output with new metrics
 */
export interface PredictionWithBands {
  predicted: ChartDataPoint[]
  upperBand: ChartDataPoint[]
  lowerBand: ChartDataPoint[]
}

/**
 * Full prediction result including new fundamental metrics
 */
export interface PredictionResult extends PredictionWithBands {
  // === New Metrics ===
  confidenceScore: number // 0-100 confidence in prediction accuracy
  liquidityRating: string // "Fast" | "Moderate" | "Slow" | "Illiquid"
  daysToSell: number // Estimated days to find a buyer
  pressureRating: string // "Undervalued" | "Fair" | "Overvalued"
  pressureDirection: 'up' | 'neutral' | 'down' // Expected value adjustment direction
  regime: MarketRegime // Which engine was used
  sanitizedCount: number // How many snipes/outliers were filtered
}

/**
 * Market statistics calculated from historical data
 */
export interface MarketStats {
  drift: number // Average daily return (log)
  volatility: number // Standard deviation of returns
  returns: number[] // Array of log returns
  avgDataFrequency: number // Average days between data points
  dataQuality: 'high' | 'medium' | 'low' // Based on data frequency
}

/**
 * Liquidity assessment for an item
 */
export interface LiquidityAssessment {
  velocity: number // Days to sell estimate
  rating: 'fast' | 'moderate' | 'slow' | 'illiquid'
  sellersPerDay: number // Absorption rate
}

/**
 * Pressure assessment (RAP vs Value divergence)
 */
export interface PressureAssessment {
  ratio: number // RAP / Value
  direction: 'up' | 'neutral' | 'down'
  magnitude: number // How strong the pressure is (0-1)
  rating: string
}

// ============================================================================
// Constants - Regime-Specific Parameters
// ============================================================================

/**
 * Demand-based drift adjustments (daily)
 * These are conservative for illiquid markets - hype doesn't sustain like stocks
 * In Roblox, even "Amazing" demand rarely causes >1% daily sustained gains
 */
export const DEMAND_DRIFT_ADJUSTMENT: Record<number, number> = {
  [-1]: 0, // None - no signal
  0: -0.005, // Terrible - slow bleed, people dumping
  1: -0.001, // Low - slight negative pressure
  2: 0, // Normal - equilibrium
  3: 0.003, // High - buyers outpace sellers slightly
  4: 0.008 // Amazing - strong buying pressure (but not 2% - that's unrealistic)
}

/**
 * Trend-based drift adjustments
 * Trend is a momentum indicator - it tells us if the item is currently moving
 */
export const TREND_DRIFT_ADJUSTMENT: Record<number, number> = {
  [-1]: 0, // None - no data
  0: -0.004, // Lowering - confirmed downtrend
  1: -0.001, // Unstable - slight negative (uncertainty = selling)
  2: 0, // Stable - no change expected
  3: 0.004, // Raising - confirmed uptrend
  4: -0.0005 // Fluctuating - slight negative (uncertainty)
}

/**
 * Volatility multipliers based on demand
 * High demand = tight spreads = lower volatility
 * Low demand = wide spreads = higher volatility
 */
export const DEMAND_VOLATILITY_MULTIPLIER: Record<number, number> = {
  [-1]: 1.0,
  0: 1.4, // Terrible demand = panic selling = high vol
  1: 1.2, // Low demand = wider swings
  2: 1.0, // Normal
  3: 0.85, // High demand = tighter market
  4: 0.7 // Amazing demand = very tight spread
}

/**
 * Seller count thresholds for regime classification
 * These determine if an item is "liquid" (commodity) or "illiquid" (rare)
 */
export const REGIME_THRESHOLDS = {
  FLOW_MIN_SELLERS: 10, // Above this = liquid commodity
  ILLIQUID_SELLERS: 3, // Below this = very illiquid
  SINGLE_SELLER: 1 // Only one seller = price maker
}

/**
 * Psychological price magnets - prices tend to cluster at round numbers
 * Roblox items especially gravitate to these values
 */
export const PRICE_MAGNETS = [
  1000, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000,
  100000, 150000, 200000, 250000, 300000, 400000, 500000, 750000, 1000000, 1500000, 2000000
]

// ============================================================================
// Sanitization Layer - Data Cleaning Before Prediction
// ============================================================================

/**
 * Detects if a sale was a "snipe" - someone bought way below market value
 * Snipes are outliers that shouldn't influence predictions because:
 * 1. They represent lucky finds, not market equilibrium
 * 2. Including them would falsely lower the expected price range
 * 3. They're often from automated bots or distressed sellers
 *
 * @param salePrice The price the item sold for
 * @param value The community-agreed value of the item
 * @param threshold Multiplier threshold (default 0.5 = 50% of value)
 * @returns true if this sale was a snipe
 */
export const isSnipe = (salePrice: number, value: number, threshold: number = 0.5): boolean => {
  if (value <= 0) return false
  return salePrice < value * threshold
}

/**
 * Detects if a sale was a "projection" - someone sold way above market value
 * This is the opposite of a snipe - artificial price inflation
 *
 * @param salePrice The price the item sold for
 * @param value The community-agreed value
 * @param threshold Multiplier threshold (default 1.5 = 150% of value)
 */
export const isProjectionSale = (
  salePrice: number,
  value: number,
  threshold: number = 1.5
): boolean => {
  if (value <= 0) return false
  return salePrice > value * threshold
}

/**
 * Sanitizes raw chart data by filtering out snipes and extreme outliers
 * Uses the item's community value as the reference point
 *
 * @param data Raw chart data points
 * @param value Community value for the item (from API)
 * @returns Sanitized data with outliers flagged
 */
export const sanitizeChartData = (
  data: ChartDataPoint[],
  value: number
): { sanitized: ChartDataPoint[]; removedCount: number; snipeCount: number } => {
  if (data.length === 0 || value <= 0) {
    return { sanitized: data, removedCount: 0, snipeCount: 0 }
  }

  let snipeCount = 0
  let removedCount = 0

  const sanitized = data.filter((point) => {
    // Filter out snipes (bought way below value)
    if (isSnipe(point.value, value, 0.5)) {
      snipeCount++
      removedCount++
      return false
    }

    // Keep projection sales for now - they're handled by the Gravity Engine
    // But flag extremely egregious ones (>3x value)
    if (point.value > value * 3) {
      removedCount++
      return false
    }

    return true
  })

  // Safety: if we filtered too much data, return original
  // (prevents edge cases where value is stale/wrong)
  if (sanitized.length < data.length * 0.3) {
    return { sanitized: data, removedCount: 0, snipeCount: 0 }
  }

  return { sanitized, removedCount, snipeCount }
}

/**
 * Calculates "Liquidity Velocity" - how fast can you actually sell this item?
 * This is critical for Roblox items because most are illiquid.
 *
 * Formula: Days to Sell ≈ Sellers / (Daily Volume)
 * If there are 20 sellers and 2 sales/day, you're waiting ~10 days
 *
 * @param volume Average daily trading volume
 * @param sellers Number of active sellers
 * @returns Liquidity assessment with days-to-sell estimate
 */
export const calculateLiquidityVelocity = (
  volume: number,
  sellers: number
): LiquidityAssessment => {
  // Handle edge cases
  if (sellers === 0) {
    return { velocity: 0, rating: 'illiquid', sellersPerDay: 0 }
  }

  // Daily absorption rate = how many sellers get filled per day
  const sellersPerDay = Math.max(volume, 0.1) // Minimum 0.1 to avoid infinity

  // Days to sell = your position in the queue
  // If you're seller #15 and 2 sell per day, you wait ~7.5 days
  const daysToSell = sellers / sellersPerDay

  // Classify liquidity
  let rating: 'fast' | 'moderate' | 'slow' | 'illiquid'
  if (daysToSell <= 1) {
    rating = 'fast' // Sells within a day
  } else if (daysToSell <= 3) {
    rating = 'moderate' // Sells within a few days
  } else if (daysToSell <= 7) {
    rating = 'slow' // Week or less
  } else {
    rating = 'illiquid' // More than a week
  }

  return { velocity: daysToSell, rating, sellersPerDay }
}

/**
 * Calculates "Pressure" - the divergence between RAP and Value
 * This predicts whether the community value will be adjusted up or down
 *
 * Financial logic:
 * - RAP > Value: Item is selling for more than "expected" → Value will be raised
 * - RAP < Value: Item is selling for less than "expected" → Value may be lowered
 * - RAP ≈ Value: Equilibrium, no pressure
 *
 * @param rap Recent Average Price (actual transaction prices)
 * @param value Community Value (what people think it's worth)
 * @returns Pressure assessment with direction and magnitude
 */
export const calculatePressure = (rap: number, value: number): PressureAssessment => {
  if (value <= 0 || rap <= 0) {
    return { ratio: 1, direction: 'neutral', magnitude: 0, rating: 'Fair Value' }
  }

  const ratio = rap / value

  // Determine pressure direction and magnitude
  let direction: 'up' | 'neutral' | 'down'
  let magnitude: number
  let rating: string

  if (ratio > 1.15) {
    // RAP significantly above value - upward pressure
    direction = 'up'
    magnitude = Math.min((ratio - 1) / 0.5, 1) // Normalize to 0-1
    rating = ratio > 1.3 ? 'Strongly Undervalued' : 'Undervalued'
  } else if (ratio < 0.85) {
    // RAP significantly below value - downward pressure
    direction = 'down'
    magnitude = Math.min((1 - ratio) / 0.5, 1)
    rating = ratio < 0.7 ? 'Strongly Overvalued' : 'Overvalued'
  } else {
    // RAP near value - equilibrium
    direction = 'neutral'
    magnitude = 0
    rating = 'Fair Value'
  }

  return { ratio, direction, magnitude, rating }
}

/**
 * Calculates the "Gap Strength" from the order book
 * This measures how much price support/resistance exists
 *
 * Financial logic:
 * - Tight gaps (sellers clustered at similar prices) = stable price
 * - Wide gaps (big jumps between seller prices) = potential for volatility
 * - First gap tells us the "next level" if current seller is bought out
 *
 * @param orderBook Array of seller prices (sorted ascending)
 * @param currentPrice Current market price
 * @returns Gap analysis with support/resistance levels
 */
export const analyzeOrderBookGaps = (
  orderBook: OrderBookEntry[],
  currentPrice: number
): { gapStrength: number; nextResistance: number; averageGap: number } => {
  if (!orderBook || orderBook.length < 2) {
    return { gapStrength: 0, nextResistance: currentPrice * 1.1, averageGap: 0 }
  }

  const prices = orderBook.map((o) => o.price).sort((a, b) => a - b)

  // Calculate gaps between consecutive sellers
  const gaps: number[] = []
  for (let i = 1; i < prices.length; i++) {
    const gapPercent = (prices[i] - prices[i - 1]) / prices[i - 1]
    gaps.push(gapPercent)
  }

  const averageGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0

  // First resistance level is the second seller's price
  const nextResistance = prices[1] || currentPrice * 1.1

  // Gap strength: how volatile could this get if sellers are eaten?
  // High gap strength = big jumps possible
  const gapStrength = Math.min(averageGap * 10, 1) // Normalize to 0-1

  return { gapStrength, nextResistance, averageGap }
}

/**
 * Calculate Exponential Moving Average
 */
export const calculateEMA = (values: number[], period: number): number[] => {
  if (values.length === 0) return []

  const k = 2 / (period + 1)
  const ema: number[] = [values[0]]

  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k))
  }

  return ema
}

/**
 * Calculate momentum (Rate of Change)
 */
export const calculateMomentum = (values: number[], period: number = 14): number => {
  if (values.length < period + 1) return 0

  const current = values[values.length - 1]
  const past = values[values.length - 1 - period]

  return past !== 0 ? (current - past) / past : 0
}

/**
 * Calculate volatility (standard deviation as % of mean)
 */
export const calculateVolatility = (values: number[]): number => {
  if (values.length < 2) return 0

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length

  return mean !== 0 ? Math.sqrt(variance) / mean : 0
}

/**
 * Calculate log returns for financial analysis
 * Log returns are preferred because they are time-additive and handle compounding correctly
 */
export const calculateLogReturns = (values: number[]): number[] => {
  const returns: number[] = []
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0 && values[i] > 0) {
      returns.push(Math.log(values[i] / values[i - 1]))
    }
  }
  return returns
}

/**
 * Calculate time-normalized log returns that account for actual time elapsed between data points
 * This is critical for sparse data (e.g., value changes once a week)
 * A 10% change over 7 days is normalized to ~1.4% daily return
 * @param data Array of data points with timestamps
 * @returns Object with normalized daily returns and average data frequency
 */
export const calculateTimeNormalizedReturns = (
  data: ChartDataPoint[]
): { dailyReturns: number[]; avgDaysBetweenPoints: number; timeGaps: number[] } => {
  const dailyReturns: number[] = []
  const timeGaps: number[] = []

  for (let i = 1; i < data.length; i++) {
    const prevValue = data[i - 1].value
    const currValue = data[i].value
    const prevTime = data[i - 1].time as number
    const currTime = data[i].time as number

    if (prevValue > 0 && currValue > 0 && currTime > prevTime) {
      // Calculate days elapsed (timestamps are in seconds)
      const daysElapsed = (currTime - prevTime) / 86400
      timeGaps.push(daysElapsed)

      // Total return over the period
      const totalReturn = Math.log(currValue / prevValue)

      // Normalize to daily return: if 10% over 7 days, daily = 10%/7 ≈ 1.4%
      // Using geometric normalization: daily_return = total_return / days
      const dailyReturn = totalReturn / Math.max(daysElapsed, 0.1)
      dailyReturns.push(dailyReturn)
    }
  }

  const avgDaysBetweenPoints =
    timeGaps.length > 0 ? timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length : 1

  return { dailyReturns, avgDaysBetweenPoints, timeGaps }
}

// ============================================================================
// Regime Detection - Triage Gate
// ============================================================================

/**
 * Determines which prediction engine to use based on market fundamentals
 *
 * The key insight: Roblox items fall into three distinct regimes:
 *
 * 1. FLOW (Commodities): Items with many sellers behave like liquid markets
 *    - Supply/demand dynamics work normally
 *    - Technical analysis is meaningful
 *    - Use: Ensemble of Holt-Winters + GBM
 *
 * 2. INERTIA (Titans): Rare items with few sellers are price-anchored
 *    - Last sale IS the market - there's no "order flow"
 *    - Volatility predictions are misleading (item just sits at same price)
 *    - Use: Flat prediction anchored to last price with sentiment drift
 *
 * 3. GRAVITY (Traps): Projected items will crash back to reality
 *    - Price is artificially inflated through wash trading
 *    - Mean reversion is guaranteed - it's just a matter of time
 *    - Use: Exponential decay to real value
 *
 * @param config Prediction configuration with fundamental data
 * @returns The market regime to use
 */
export const detectRegime = (config: PredictionConfig): MarketRegime => {
  const { sellers, isProjected = false } = config

  // Priority 1: Projected items ALWAYS go to Gravity Engine
  // This is the highest priority because projected items will crash regardless of liquidity
  if (isProjected) {
    return 'GRAVITY'
  }

  // Priority 2: Check if we have seller data
  // If sellers is explicitly provided and > 10, use Flow Engine
  if (sellers !== undefined && sellers > REGIME_THRESHOLDS.FLOW_MIN_SELLERS) {
    return 'FLOW'
  }

  // Priority 3: If sellers is explicitly provided and <= 10, use Inertia
  if (sellers !== undefined && sellers <= REGIME_THRESHOLDS.FLOW_MIN_SELLERS) {
    return 'INERTIA'
  }

  // Default: When seller data is UNKNOWN, use Flow Engine
  // This ensures we get meaningful predictions based on historical data
  // rather than flat lines from Inertia Engine
  return 'FLOW'
}

/**
 * Get market statistics from price data (drift and volatility from log returns)
 * Uses GARCH-like volatility estimation to capture volatility clustering
 * This is the foundation for stochastic modeling
 * @deprecated Use getMarketStatsFromData for time-aware calculations
 */
export const getMarketStats = (values: number[]): MarketStats => {
  const returns = calculateLogReturns(values)

  if (returns.length === 0) {
    return { drift: 0, volatility: 0.01, returns: [], avgDataFrequency: 1, dataQuality: 'low' }
  }

  const drift = returns.reduce((a, b) => a + b, 0) / returns.length

  // Use GARCH-like estimation for current volatility (captures clustering)
  const { currentVol, longTermVol } = estimateGARCHVolatility(returns)

  // Blend current and long-term vol: weight recent conditions more heavily
  // This prevents overreacting to a single volatile day while respecting clusters
  const blendedVol = currentVol * 0.7 + longTermVol * 0.3

  return {
    drift,
    volatility: Math.max(blendedVol, 0.001),
    returns,
    avgDataFrequency: 1,
    dataQuality: 'medium'
  }
}

/**
 * Get market statistics from data points with proper time normalization
 * This is the preferred method as it accounts for irregular data frequency
 * @param data Array of chart data points with timestamps
 * @returns Market statistics with time-normalized drift and volatility
 */
export const getMarketStatsFromData = (data: ChartDataPoint[]): MarketStats => {
  if (data.length < 2) {
    return { drift: 0, volatility: 0.01, returns: [], avgDataFrequency: 1, dataQuality: 'low' }
  }

  const { dailyReturns, avgDaysBetweenPoints } = calculateTimeNormalizedReturns(data)

  if (dailyReturns.length === 0) {
    return {
      drift: 0,
      volatility: 0.01,
      returns: [],
      avgDataFrequency: avgDaysBetweenPoints,
      dataQuality: 'low'
    }
  }

  // Drift is now properly normalized to daily
  const drift = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length

  // Use GARCH on normalized returns
  const { currentVol, longTermVol } = estimateGARCHVolatility(dailyReturns)
  const blendedVol = currentVol * 0.7 + longTermVol * 0.3

  // Determine data quality based on frequency
  let dataQuality: 'high' | 'medium' | 'low'
  if (avgDaysBetweenPoints <= 1.5) {
    dataQuality = 'high' // Daily or better
  } else if (avgDaysBetweenPoints <= 7) {
    dataQuality = 'medium' // Weekly or better
  } else {
    dataQuality = 'low' // Sparse data
  }

  return {
    drift,
    volatility: Math.max(blendedVol, 0.001),
    returns: dailyReturns,
    avgDataFrequency: avgDaysBetweenPoints,
    dataQuality
  }
}

/**
 * Box-Muller transform for generating normally distributed random numbers
 * More accurate than summing uniform randoms
 */
export const boxMullerRandom = (): number => {
  let u = 0,
    v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/**
 * Generate random number from Student's t-distribution
 * Fat tails: Markets have more extreme events than normal distribution predicts
 * Uses the ratio of normal to chi-squared method
 * @param df Degrees of freedom (3-5 recommended for financial markets)
 */
export const studentTRandom = (df: number = 4): number => {
  // Generate normal random
  const z = boxMullerRandom()

  // Generate chi-squared with df degrees of freedom
  // Chi-squared is sum of df squared normals
  let chiSquared = 0
  for (let i = 0; i < df; i++) {
    const n = boxMullerRandom()
    chiSquared += n * n
  }

  // t = Z / sqrt(chi^2 / df)
  return z / Math.sqrt(chiSquared / df)
}

/**
 * GARCH(1,1)-like volatility estimation
 * Captures volatility clustering: if yesterday was volatile, today likely will be too
 * σ²_t = ω + α * r²_{t-1} + β * σ²_{t-1}
 * @param returns Array of log returns
 * @param omega Long-term variance weight (typically 0.05-0.1)
 * @param alpha Shock impact (typically 0.05-0.15)
 * @param beta Persistence (typically 0.8-0.95)
 */
export const estimateGARCHVolatility = (
  returns: number[],
  alpha: number = 0.1, // Reaction to shock
  beta: number = 0.84 // Persistence
): { currentVol: number; longTermVol: number } => {
  if (returns.length < 5) {
    // Fallback logic remains same
    const vol =
      returns.length > 0
        ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
        : 0.02
    return { currentVol: vol, longTermVol: vol }
  }

  // 1. Calculate Unconditional Variance (Sample Variance)
  const sampleVariance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length

  // 2. Derive Omega dynamically to fit the asset's scale
  // V_long = omega / (1 - alpha - beta)  =>  omega = V_long * (1 - alpha - beta)
  const omega = sampleVariance * (1 - alpha - beta)

  // 3. Initialize
  let variance = sampleVariance
  const longTermVol = Math.sqrt(sampleVariance)

  // 4. Run GARCH recursion
  for (let i = 1; i < returns.length; i++) {
    const prevReturn = returns[i - 1]
    // The Standard GARCH(1,1) Update
    variance = omega + alpha * prevReturn * prevReturn + beta * variance
  }

  const currentVol = Math.sqrt(variance)

  return { currentVol, longTermVol }
}

/**
 * Calculate Mean Squared Error between actual and predicted values
 */
export const calculateMSE = (actual: number[], predicted: number[]): number => {
  const n = Math.min(actual.length, predicted.length)
  if (n === 0) return Infinity

  let sumSquaredError = 0
  for (let i = 0; i < n; i++) {
    sumSquaredError += Math.pow(actual[i] - predicted[i], 2)
  }
  return sumSquaredError / n
}

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
// Forecasting Methods
// ============================================================================

/**
 * Holt-Winters Double Exponential Smoothing with specified parameters
 * Captures both level and trend components
 */
export const holtWintersWithParams = (
  values: number[],
  alpha: number,
  beta: number,
  periods: number
): number[] => {
  if (values.length < 2) return []

  let level = values[0]
  let trend = values[1] - values[0]

  for (let i = 1; i < values.length; i++) {
    const prevLevel = level
    level = alpha * values[i] + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
  }

  const forecasts: number[] = []
  for (let i = 1; i <= periods; i++) {
    forecasts.push(level + i * trend)
  }

  return forecasts
}

/**
 * Fit Holt-Winters parameters dynamically using grid search to minimize MSE
 * This replaces hardcoded magic numbers with data-driven parameters
 */
export const fitHoltWintersParams = (
  values: number[],
  validationPeriod: number = 14
): { alpha: number; beta: number } => {
  if (values.length < validationPeriod + 10) {
    return { alpha: 0.3, beta: 0.1 } // Fallback for insufficient data
  }

  const trainData = values.slice(0, -validationPeriod)
  const validationData = values.slice(-validationPeriod)

  let bestAlpha = 0.3
  let bestBeta = 0.1
  let bestMSE = Infinity

  // Grid search over parameter space
  for (let alpha = 0.1; alpha <= 0.9; alpha += 0.1) {
    for (let beta = 0.05; beta <= 0.5; beta += 0.05) {
      const forecasts = holtWintersWithParams(trainData, alpha, beta, validationPeriod)
      const mse = calculateMSE(validationData, forecasts)

      if (mse < bestMSE) {
        bestMSE = mse
        bestAlpha = alpha
        bestBeta = beta
      }
    }
  }

  return { alpha: bestAlpha, beta: bestBeta }
}

/**
 * Holt-Winters with dynamically fitted parameters
 */
export const holtWinters = (values: number[], periods: number = 30): number[] => {
  const { alpha, beta } = fitHoltWintersParams(values)
  return holtWintersWithParams(values, alpha, beta, periods)
}

/**
 * Weighted Linear Regression on Log Returns (not raw prices)
 * This prevents unbounded extrapolation and handles scale correctly
 */
export const weightedLinearRegressionReturns = (
  returns: number[],
  decayFactor: number = 0.95
): { expectedReturn: number; returnTrend: number } => {
  const n = returns.length
  if (n === 0) return { expectedReturn: 0, returnTrend: 0 }

  const times = returns.map((_, i) => i)
  const weights = times.map((_, i) => Math.pow(decayFactor, n - 1 - i))
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  const weightedMeanX = times.reduce((sum, x, i) => sum + x * weights[i], 0) / totalWeight
  const weightedMeanY = returns.reduce((sum, y, i) => sum + y * weights[i], 0) / totalWeight

  let weightedCov = 0
  let weightedVar = 0
  for (let i = 0; i < n; i++) {
    const dx = times[i] - weightedMeanX
    const dy = returns[i] - weightedMeanY
    weightedCov += weights[i] * dx * dy
    weightedVar += weights[i] * dx * dx
  }

  const returnTrend = weightedVar !== 0 ? weightedCov / weightedVar : 0

  return { expectedReturn: weightedMeanY, returnTrend }
}

/**
 * Support and Resistance Level Detection (Traditional method)
 */
export const findSupportResistance = (
  values: number[],
  sensitivity: number = 0.03
): { support: number; resistance: number } => {
  if (values.length < 10) {
    return { support: Math.min(...values), resistance: Math.max(...values) }
  }

  const levels: number[] = []

  for (let i = 2; i < values.length - 2; i++) {
    const isLocalMin =
      values[i] < values[i - 1] &&
      values[i] < values[i - 2] &&
      values[i] < values[i + 1] &&
      values[i] < values[i + 2]
    const isLocalMax =
      values[i] > values[i - 1] &&
      values[i] > values[i - 2] &&
      values[i] > values[i + 1] &&
      values[i] > values[i + 2]

    if (isLocalMin || isLocalMax) {
      levels.push(values[i])
    }
  }

  if (levels.length === 0) {
    return { support: Math.min(...values), resistance: Math.max(...values) }
  }

  const currentPrice = values[values.length - 1]
  const supports = levels.filter((l) => l < currentPrice * (1 + sensitivity))
  const resistances = levels.filter((l) => l > currentPrice * (1 - sensitivity))

  return {
    support: supports.length > 0 ? Math.max(...supports) : Math.min(...values),
    resistance: resistances.length > 0 ? Math.min(...resistances) : Math.max(...values)
  }
}

/**
 * Roblox-specific support detection
 * In Roblox, support is concrete - it's based on recent floor prices (LPP)
 * not abstract historical levels. The "floor" is established by recent sales.
 */
export const findRobloxSupport = (
  data: ChartDataPoint[],
  lookbackDays: number = 7
): { support: number; resistance: number; floorPrice: number } => {
  if (data.length < 3) {
    const val = data[data.length - 1]?.value || 0
    return { support: val, resistance: val, floorPrice: val }
  }

  const recent = data.slice(-lookbackDays)
  const recentValues = recent.map((p) => p.value)

  // Floor price is the minimum of recent sales (LPP - Lowest Price Point)
  const floorPrice = Math.min(...recentValues)

  // Ceiling is the max of recent sales (excluding obvious projections)
  const sortedValues = [...recentValues].sort((a, b) => a - b)
  // Use 90th percentile to exclude projected outliers
  const ceilingIndex = Math.floor(sortedValues.length * 0.9)
  const ceiling = sortedValues[ceilingIndex] || Math.max(...recentValues)

  // Support is slightly below floor (buyers waiting)
  const support = floorPrice * 0.95

  // Resistance is slightly above recent ceiling
  const resistance = ceiling * 1.05

  return { support, resistance, floorPrice }
}

/**
 * Calculate average daily volume for liquidity assessment
 */
export const calculateAverageVolume = (data: ChartDataPoint[], days: number = 30): number => {
  const recent = data.slice(-days)
  if (recent.length === 0) return 0

  const totalVolume = recent.reduce((sum, p) => sum + (p.volume || 0), 0)
  return totalVolume / recent.length
}

// ============================================================================
// Monte Carlo Simulation
// ============================================================================

/**
 * Generate a single Monte Carlo price path using Geometric Brownian Motion
 * with Student's t-distribution for fat tails (more realistic crash probabilities)
 * GBM Formula: P_t = P_{t-1} * exp((drift - 0.5*vol^2)*dt + vol*sqrt(dt)*Z)
 * @param useFatTails If true, uses t-distribution (df=4) instead of normal
 */
export const generateGBMPath = (
  lastPrice: number,
  drift: number,
  volatility: number,
  days: number,
  sentimentAdjustment: number = 0,
  useFatTails: boolean = true
): number[] => {
  const predictions: number[] = []
  let currentPrice = lastPrice
  const dt = 1 // Daily timestep

  // Decay sentiment adjustment over time (doesn't sustain for 30 days)
  // After ~20 days, sentiment effect is nearly zero
  const sentimentDecay = 0.9

  for (let i = 0; i < days; i++) {
    // Fat tails: t-distribution with 4 df captures market crash frequency better
    // Scaling factor sqrt((df-2)/df) normalizes variance to match normal
    const df = 4
    const randomShock = useFatTails
      ? studentTRandom(df) * Math.sqrt((df - 2) / df)
      : boxMullerRandom()

    // Sentiment decays exponentially - doesn't sustain linearly for 30 days
    const decayedSentiment = sentimentAdjustment * Math.pow(sentimentDecay, i)
    const adjustedDrift = drift + decayedSentiment

    // GBM: includes drift correction term (-0.5 * vol^2) for proper expectation
    const logReturn =
      (adjustedDrift - 0.5 * Math.pow(volatility, 2)) * dt +
      volatility * Math.sqrt(dt) * randomShock

    currentPrice = currentPrice * Math.exp(logReturn)
    predictions.push(Math.max(1, currentPrice))
  }
  return predictions
}

/**
 * Run multiple Monte Carlo simulations and return percentile bands
 * Uses fat-tailed t-distribution by default for realistic crash probabilities
 */
export const runMonteCarloSimulation = (
  lastPrice: number,
  drift: number,
  volatility: number,
  days: number,
  numSimulations: number = 500,
  sentimentAdjustment: number = 0,
  useFatTails: boolean = true
): { median: number[]; lower: number[]; upper: number[] } => {
  const allPaths: number[][] = []

  for (let sim = 0; sim < numSimulations; sim++) {
    allPaths.push(
      generateGBMPath(lastPrice, drift, volatility, days, sentimentAdjustment, useFatTails)
    )
  }

  const median: number[] = []
  const lower: number[] = []
  const upper: number[] = []

  for (let day = 0; day < days; day++) {
    const dayPrices = allPaths.map((path) => path[day]).sort((a, b) => a - b)
    const n = dayPrices.length

    median.push(dayPrices[Math.floor(n * 0.5)])
    lower.push(dayPrices[Math.floor(n * 0.1)]) // 10th percentile
    upper.push(dayPrices[Math.floor(n * 0.9)]) // 90th percentile
  }

  return { median, lower, upper }
}

// ============================================================================
// Ensemble Prediction with Inverse Variance Weighting
// ============================================================================

/**
 * Calculate inverse variance weights based on backtesting errors
 * Models with lower error get higher weights
 */
export const calculateInverseVarianceWeights = (
  errors: Record<string, number>
): Record<string, number> => {
  const entries = Object.entries(errors)
  const minError = 0.001 // Prevent division by zero

  const inverseErrors = entries.map(([key, error]) => ({
    key,
    inverse: 1 / Math.max(error, minError)
  }))

  const totalInverse = inverseErrors.reduce((sum, e) => sum + e.inverse, 0)

  const weights: Record<string, number> = {}
  for (const { key, inverse } of inverseErrors) {
    weights[key] = inverse / totalInverse
  }

  return weights
}

/**
 * Generate EMA-based forecasts with decaying slope
 * Momentum rarely sustains linearly - apply exponential decay to slope
 */
export const generateEMAForecast = (
  values: number[],
  periods: number,
  emaPeriod: number = 20,
  slopeDecay: number = 0.92 // Slope halves roughly every 8 days
): number[] => {
  const ema = calculateEMA(values, emaPeriod)
  if (ema.length < 2) return Array(periods).fill(values[values.length - 1] || 0)

  const lastEma = ema[ema.length - 1]
  const emaSlope = ema[ema.length - 1] - ema[ema.length - 2]

  // Decaying slope extrapolation: cumulative sum of decaying slope
  const forecasts: number[] = []
  let cumulativeMove = 0

  for (let i = 0; i < periods; i++) {
    // Each day's contribution decays: slope * decay^i
    cumulativeMove += emaSlope * Math.pow(slopeDecay, i)
    forecasts.push(lastEma + cumulativeMove)
  }

  return forecasts
}

/**
 * Backtest a forecasting method and return MSE
 */
const backtestMethod = (
  values: number[],
  method: 'holtWinters' | 'ema' | 'gbm',
  testPeriod: number = 14
): number => {
  if (values.length < testPeriod + 30) return Infinity

  const trainData = values.slice(0, -testPeriod)
  const testData = values.slice(-testPeriod)

  let predictions: number[]

  switch (method) {
    case 'holtWinters': {
      predictions = holtWinters(trainData, testPeriod)
      break
    }
    case 'ema': {
      // Use decaying slope EMA forecast
      predictions = generateEMAForecast(trainData, testPeriod)
      break
    }
    case 'gbm': {
      const stats = getMarketStats(trainData)
      const lastPrice = trainData[trainData.length - 1]
      // Use median of Monte Carlo for backtesting (no fat tails for backtest stability)
      const mc = runMonteCarloSimulation(
        lastPrice,
        stats.drift,
        stats.volatility,
        testPeriod,
        100,
        0,
        false
      )
      predictions = mc.median
      break
    }
    default:
      predictions = Array(testPeriod).fill(trainData[trainData.length - 1])
  }

  return calculateMSE(testData, predictions)
}

// ============================================================================
// ENGINE A: The Flow Engine (For Liquid "Commodities")
// ============================================================================

/**
 * Flow Engine - For liquid items with many sellers (>10)
 *
 * These items behave like commodities - supply/demand dynamics work:
 * - Multiple competing sellers create price discovery
 * - Technical analysis (trends, momentum) is meaningful
 * - Volatility-based predictions make sense
 *
 * Uses: Weighted Ensemble of Holt-Winters + GBM
 * Improvements:
 * - Uses "Pressure" ratio (RAP/Value) to bias drift direction
 * - Uses Order Book Gap analysis to widen upper confidence bands
 *
 * @param data Sanitized historical price data
 * @param config Prediction configuration with fundamental data
 * @param predictionDays Number of days to forecast
 * @returns Prediction with bands
 */
const runFlowEngine = (
  data: ChartDataPoint[],
  config: PredictionConfig,
  predictionDays: number
): PredictionWithBands => {
  const { demand = 2, trend = 2, rap = 0, value = 0, orderBook } = config

  const values = data.map((p) => p.value)
  const lastPoint = data[data.length - 1]
  const currentTime = Math.floor(Date.now() / 1000)
  const lastDataTime = lastPoint.time as number
  const lastTime = Math.max(currentTime, lastDataTime)
  const lastValue = lastPoint.value

  // 1. Get base market statistics
  const marketStats = getMarketStatsFromData(data)

  // 2. Calculate pressure adjustment from RAP/Value divergence
  // If RAP > Value, the item is "undervalued" - expect upward drift
  // If RAP < Value, the item is "overvalued" - expect downward drift
  const pressure = calculatePressure(rap, value)
  const pressureDriftAdjustment =
    pressure.direction === 'up'
      ? 0.003 * pressure.magnitude
      : pressure.direction === 'down'
        ? -0.003 * pressure.magnitude
        : 0

  // 3. Calculate sentiment adjustment from demand/trend
  const demandAdj = DEMAND_DRIFT_ADJUSTMENT[demand] ?? 0
  const trendAdj = TREND_DRIFT_ADJUSTMENT[trend] ?? 0
  const sentimentAdjustment = demandAdj + trendAdj + pressureDriftAdjustment

  // 4. Apply volatility compression for high-demand items
  const volMultiplier = DEMAND_VOLATILITY_MULTIPLIER[demand] ?? 1
  const adjustedVol = marketStats.volatility * volMultiplier

  // 5. Analyze order book for gap strength (affects upper band)
  const gapAnalysis = analyzeOrderBookGaps(orderBook || [], lastValue)
  const upperBandMultiplier = 1 + gapAnalysis.gapStrength * 0.5 // Widen upper band if gaps exist

  // 6. Backtest each method to get dynamic weights
  const hwError = backtestMethod(values, 'holtWinters')
  const emaError = backtestMethod(values, 'ema')
  const gbmError = backtestMethod(values, 'gbm')
  const weights = calculateInverseVarianceWeights({
    holtWinters: hwError,
    ema: emaError,
    gbm: gbmError
  })

  // 7. Generate forecasts from each method
  const hwForecasts = holtWinters(values, predictionDays)
  const emaForecasts = generateEMAForecast(values, predictionDays, 20, 0.92)

  // 8. Monte Carlo with adjusted parameters
  const mc = runMonteCarloSimulation(
    lastValue,
    marketStats.drift,
    adjustedVol,
    predictionDays,
    500,
    sentimentAdjustment,
    true
  )

  // 9. Combine forecasts
  const predicted: ChartDataPoint[] = []
  const upperBand: ChartDataPoint[] = []
  const lowerBand: ChartDataPoint[] = []

  for (let day = 0; day < predictionDays; day++) {
    const futureTime = lastTime + (day + 1) * 86400
    const dateStr =
      new Date(futureTime * 1000).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) + ' (Predicted)'

    const hwVal = hwForecasts[day] || lastValue
    const emaVal = emaForecasts[day] || lastValue
    const gbmVal = mc.median[day] || lastValue

    let ensembleValue = hwVal * weights.holtWinters + emaVal * weights.ema + gbmVal * weights.gbm
    ensembleValue = snapToPsychologicalLevel(Math.max(1, ensembleValue))

    predicted.push({
      value: Math.round(ensembleValue),
      time: futureTime as Time,
      dateStr
    })

    // Upper band widened by gap strength (big gaps = potential for jumps)
    const upperValue = mc.upper[day] * upperBandMultiplier
    upperBand.push({
      value: Math.round(Math.max(1, upperValue)),
      time: futureTime as Time,
      dateStr: dateStr.replace('Predicted', 'Upper 90%')
    })

    lowerBand.push({
      value: Math.round(Math.max(1, mc.lower[day])),
      time: futureTime as Time,
      dateStr: dateStr.replace('Predicted', 'Lower 10%')
    })
  }

  return { predicted, upperBand, lowerBand }
}

// ============================================================================
// ENGINE B: The Inertia Engine (For Illiquid "Titans")
// ============================================================================

/**
 * Inertia Engine - For rare/illiquid items with few sellers (<=10)
 *
 * Key insight: These items DON'T behave like stocks. They are:
 * - Price-anchored: The last sale IS the market price
 * - Step-function: Price jumps discretely when sales happen, not continuously
 * - NOT mean-reverting: A price jump is real, not a spike to correct
 *
 * Why we IGNORE volatility:
 * - Traditional volatility measures "how much price moves daily"
 * - But illiquid items DON'T move daily - they sit at the same price
 * - Applying stock-market vol to them causes false "crash" predictions
 *
 * Logic:
 * - Anchor prediction to last sale price (LOCF - Last Observation Carried Forward)
 * - Apply small drift based ONLY on demand/trend sentiment
 * - Widen bands over time (uncertainty grows) but keep median FLAT
 *
 * @param data Sanitized historical price data
 * @param config Prediction configuration with fundamental data
 * @param predictionDays Number of days to forecast
 * @returns Prediction with bands
 */
const runInertiaEngine = (
  data: ChartDataPoint[],
  config: PredictionConfig,
  predictionDays: number
): PredictionWithBands => {
  const { demand = 2, trend = 2, sellers = 1 } = config

  const lastPoint = data[data.length - 1]
  const currentTime = Math.floor(Date.now() / 1000)
  const lastDataTime = lastPoint.time as number
  const lastTime = Math.max(currentTime, lastDataTime)
  const anchorPrice = lastPoint.value // This IS the market price for illiquid items

  // 1. Calculate drift from sentiment AND historical data
  // For rare items, we still want to show a trend if the data supports it
  const demandAdj = DEMAND_DRIFT_ADJUSTMENT[demand] ?? 0
  const trendAdj = TREND_DRIFT_ADJUSTMENT[trend] ?? 0

  // Get historical drift to supplement sentiment
  const marketStats = getMarketStatsFromData(data)
  const historicalDrift = marketStats.drift * 0.3 // Dampen historical drift for illiquid items

  // Combine sentiment with historical trend - use the stronger signal
  // This ensures we show SOME movement even when sentiment is neutral
  const sentimentDrift = (demandAdj + trendAdj) * 2 // Amplify sentiment signal
  const dailyDrift =
    Math.abs(sentimentDrift) > Math.abs(historicalDrift)
      ? sentimentDrift
      : historicalDrift + sentimentDrift * 0.5

  // 2. Calculate uncertainty spread that grows over time
  // Why does uncertainty grow? Because we're less sure about prices further out
  // For illiquid items, this is wider (more uncertainty) but symmetrical
  const baseSpread = 0.02 // 2% base spread
  const spreadGrowthRate = 0.005 // Grows 0.5% per day
  const maxSpread = sellers <= REGIME_THRESHOLDS.ILLIQUID_SELLERS ? 0.25 : 0.15 // Very illiquid = wider max

  // 3. Generate predictions
  const predicted: ChartDataPoint[] = []
  const upperBand: ChartDataPoint[] = []
  const lowerBand: ChartDataPoint[] = []

  let cumulativeDrift = 0

  for (let day = 0; day < predictionDays; day++) {
    const futureTime = lastTime + (day + 1) * 86400
    const dateStr =
      new Date(futureTime * 1000).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) + ' (Predicted)'

    // Cumulative drift with slower decay (trends can persist)
    cumulativeDrift += dailyDrift * Math.pow(0.98, day)

    // Median prediction: anchor price with drift
    // Now shows actual trend direction based on sentiment + historical data
    const medianPrice = anchorPrice * Math.exp(cumulativeDrift)
    const snappedPrice = snapToPsychologicalLevel(Math.max(1, medianPrice))

    predicted.push({
      value: Math.round(snappedPrice),
      time: futureTime as Time,
      dateStr
    })

    // Bands grow over time (uncertainty increases with forecast horizon)
    // sqrt growth is more realistic than linear (uncertainty doesn't grow linearly)
    const currentSpread = Math.min(baseSpread + spreadGrowthRate * Math.sqrt(day + 1), maxSpread)

    upperBand.push({
      value: Math.round(Math.max(1, snappedPrice * (1 + currentSpread))),
      time: futureTime as Time,
      dateStr: dateStr.replace('Predicted', 'Upper 90%')
    })

    lowerBand.push({
      value: Math.round(Math.max(1, snappedPrice * (1 - currentSpread))),
      time: futureTime as Time,
      dateStr: dateStr.replace('Predicted', 'Lower 10%')
    })
  }

  return { predicted, upperBand, lowerBand }
}

// ============================================================================
// ENGINE C: The Gravity Engine (For Projected "Traps")
// ============================================================================

/**
 * Gravity Engine - For projected items that will crash
 *
 * "Projected" items have artificially inflated prices through wash trading:
 * - User sells item to alt account at inflated price
 * - RAP spikes, making item look valuable
 * - Unsuspecting buyers overpay
 * - Price eventually crashes back to real value
 *
 * Logic:
 * - Calculate "real value" = 14-day average EXCLUDING the spike
 * - Apply exponential decay from current inflated price toward real value
 * - Decay speed based on how inflated the item is (bigger inflation = faster crash)
 *
 * Why exponential decay?
 * - Projected items don't gradually decline - they CRASH
 * - The market quickly realizes it's fake and price dumps
 * - Half-life of ~7-14 days is typical for projection corrections
 *
 * @param data Sanitized historical price data
 * @param config Prediction configuration with fundamental data
 * @param predictionDays Number of days to forecast
 * @returns Prediction with bands
 */
const runGravityEngine = (
  data: ChartDataPoint[],
  config: PredictionConfig,
  predictionDays: number
): PredictionWithBands => {
  const { value = 0 } = config

  const lastPoint = data[data.length - 1]
  const currentTime = Math.floor(Date.now() / 1000)
  const lastDataTime = lastPoint.time as number
  const lastTime = Math.max(currentTime, lastDataTime)
  const inflatedPrice = lastPoint.value

  // 1. Calculate the "real" target value
  // Priority: Use API value if available, otherwise calculate from history
  let targetValue: number
  if (value > 0 && value < inflatedPrice) {
    // API value is our best estimate of real worth
    targetValue = value
  } else {
    // Fallback: Calculate 14-day average excluding recent spike
    // We exclude the last 2 data points (likely the projection)
    const historicalData = data.slice(-16, -2)
    if (historicalData.length > 0) {
      targetValue = historicalData.reduce((sum, p) => sum + p.value, 0) / historicalData.length
    } else {
      // Last resort: assume 50% correction
      targetValue = inflatedPrice * 0.5
    }
  }

  // 2. Calculate how inflated the item is (projection ratio)
  const projectionRatio = inflatedPrice / targetValue

  // 3. Determine decay rate based on inflation severity
  // Bigger projections crash faster - the market recognizes egregious fakes quickly
  // Half-life: ~7 days for 2x projection, ~10 days for 1.5x projection
  const baseHalfLife = 10 // days
  const adjustedHalfLife = baseHalfLife / Math.pow(projectionRatio - 1 + 1, 0.5)
  const decayRate = Math.log(2) / Math.max(adjustedHalfLife, 3) // Min 3 day half-life

  // 4. Generate predictions with exponential decay
  const predicted: ChartDataPoint[] = []
  const upperBand: ChartDataPoint[] = []
  const lowerBand: ChartDataPoint[] = []

  for (let day = 0; day < predictionDays; day++) {
    const futureTime = lastTime + (day + 1) * 86400
    const dateStr =
      new Date(futureTime * 1000).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) + ' (Predicted)'

    // Exponential decay toward target
    // P(t) = Target + (Inflated - Target) * e^(-decay * t)
    const decayFactor = Math.exp(-decayRate * (day + 1))
    const decayedPrice = targetValue + (inflatedPrice - targetValue) * decayFactor
    const snappedPrice = snapToPsychologicalLevel(Math.max(1, decayedPrice))

    predicted.push({
      value: Math.round(snappedPrice),
      time: futureTime as Time,
      dateStr
    })

    // Bands: tight at first (we're confident it will crash), wider later
    // Upper band: could stay inflated longer if manipulation continues
    // Lower band: could crash faster if sellers panic
    const upperSpread = 0.1 + 0.05 * Math.sqrt(day + 1) // Grows slowly
    const lowerSpread = 0.15 + 0.1 * (1 - decayFactor) // Grows as price falls

    upperBand.push({
      value: Math.round(Math.max(1, snappedPrice * (1 + upperSpread))),
      time: futureTime as Time,
      dateStr: dateStr.replace('Predicted', 'Upper 90%')
    })

    lowerBand.push({
      value: Math.round(Math.max(1, snappedPrice * (1 - lowerSpread))),
      time: futureTime as Time,
      dateStr: dateStr.replace('Predicted', 'Lower 10%')
    })
  }

  return { predicted, upperBand, lowerBand }
}

// ============================================================================
// Post-Processing Utilities
// ============================================================================

/**
 * Snaps a price to the nearest psychological level if within threshold
 * Prices cluster at round numbers (50k, 100k, etc.) - this is a real phenomenon
 *
 * @param price Raw predicted price
 * @param threshold How close to snap (default 1% = 0.01)
 * @returns Snapped price if close to magnet, otherwise original
 */
const snapToPsychologicalLevel = (price: number, threshold: number = 0.01): number => {
  for (const magnet of PRICE_MAGNETS) {
    const distance = Math.abs(price - magnet) / magnet
    if (distance <= threshold) {
      return magnet
    }
  }
  return price
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Generate price predictions using the Regime Switching Model
 *
 * This is the main entry point. It acts as a "Triage Gate":
 * 1. Sanitize: Filter out snipes and anomalies from historical data
 * 2. Triage: Detect market regime (Flow/Inertia/Gravity)
 * 3. Execute: Run the appropriate prediction engine
 * 4. Post-Process: Snap to psychological levels, calculate metrics
 *
 * @param data Raw historical price data
 * @param config Prediction configuration with fundamental data
 * @returns Simple prediction array (backwards compatible)
 */
export const generatePredictions = (
  data: ChartDataPoint[],
  config: PredictionConfig = {}
): ChartDataPoint[] => {
  const result = generatePredictionsWithBands(data, config)
  return result.predicted
}

/**
 * Generate price predictions with confidence bands and full metrics
 *
 * @param data Raw historical price data
 * @param config Prediction configuration with fundamental data
 * @returns Full prediction result with bands and metrics
 */
export const generatePredictionsWithBands = (
  data: ChartDataPoint[],
  config: PredictionConfig = {}
): PredictionWithBands => {
  const fullResult = generateFullPrediction(data, config)
  return {
    predicted: fullResult.predicted,
    upperBand: fullResult.upperBand,
    lowerBand: fullResult.lowerBand
  }
}

/**
 * Generate complete prediction with all metrics (new API)
 *
 * @param data Raw historical price data
 * @param config Prediction configuration with fundamental data
 * @returns Complete prediction result with all metrics
 */
export const generateFullPrediction = (
  data: ChartDataPoint[],
  config: PredictionConfig = {}
): PredictionResult => {
  const emptyResult: PredictionResult = {
    predicted: [],
    upperBand: [],
    lowerBand: [],
    confidenceScore: 0,
    liquidityRating: 'illiquid',
    daysToSell: Infinity,
    pressureRating: 'Fair Value',
    pressureDirection: 'neutral',
    regime: 'INERTIA',
    sanitizedCount: 0
  }

  // Minimum data requirement
  if (data.length < 5) return emptyResult

  const {
    sellers = 0,
    demand = 2,
    trend = 2,
    rap = 0,
    value = 0,
    isProjected = false,
    predictionDays = 30
  } = config

  // ========================================
  // STEP 1: SANITIZE DATA
  // ========================================
  // Remove snipes and extreme outliers using community value as reference
  const { sanitized, removedCount } = sanitizeChartData(data, value || data[data.length - 1].value)

  if (sanitized.length < 5) {
    // Not enough data after sanitization
    return { ...emptyResult, sanitizedCount: removedCount }
  }

  // ========================================
  // STEP 2: TRIAGE - DETECT REGIME
  // ========================================
  const regime = detectRegime(config)

  // ========================================
  // STEP 3: EXECUTE APPROPRIATE ENGINE
  // ========================================
  let prediction: PredictionWithBands

  switch (regime) {
    case 'GRAVITY':
      // Projected item - will crash back to reality
      prediction = runGravityEngine(sanitized, config, predictionDays)
      break

    case 'FLOW':
      // Liquid commodity - use full ensemble
      prediction = runFlowEngine(sanitized, config, predictionDays)
      break

    case 'INERTIA':
    default:
      // Illiquid Titan - anchor to last price
      prediction = runInertiaEngine(sanitized, config, predictionDays)
      break
  }

  // ========================================
  // STEP 4: CALCULATE METRICS
  // ========================================

  // Liquidity assessment
  const avgVolume = calculateAverageVolume(sanitized, 30)
  const liquidity = calculateLiquidityVelocity(avgVolume, sellers)

  // Pressure assessment (RAP vs Value)
  const pressure = calculatePressure(rap, value)

  // Confidence score
  const confidence = calculatePredictionConfidence(sanitized, demand, trend, isProjected)

  // ========================================
  // RETURN COMPLETE RESULT
  // ========================================
  return {
    ...prediction,
    confidenceScore: confidence.percentage,
    liquidityRating:
      liquidity.rating === 'fast'
        ? 'Fast'
        : liquidity.rating === 'moderate'
          ? 'Moderate'
          : liquidity.rating === 'slow'
            ? 'Slow'
            : 'Illiquid',
    daysToSell: liquidity.velocity,
    pressureRating: pressure.rating,
    pressureDirection: pressure.direction,
    regime,
    sanitizedCount: removedCount
  }
}

/**
 * Calculate prediction confidence based on regime, data quality, and market conditions
 *
 * Confidence is regime-aware:
 * - FLOW: High confidence if good data + stable market
 * - INERTIA: Moderate confidence (inherent uncertainty in illiquid markets)
 * - GRAVITY: High confidence in direction, lower in timing
 *
 * @param data Historical price data
 * @param demand API demand rating
 * @param trend API trend rating
 * @param isProjected Whether item is marked as projected
 * @param sellers Number of active sellers (for regime detection)
 * @returns Confidence assessment with breakdown
 */
export const calculatePredictionConfidence = (
  data: ChartDataPoint[],
  demand?: number,
  trend?: number,
  isProjected?: boolean,
  sellers?: number
): PredictionConfidence => {
  const factors: string[] = []
  let score = 50 // Base score

  // Detect regime for context
  const regime = detectRegime({ demand, trend, isProjected, sellers })

  // ========================================
  // REGIME-SPECIFIC BASE ADJUSTMENTS
  // ========================================
  switch (regime) {
    case 'GRAVITY':
      // Projected items: High confidence in crash, uncertain timing
      score += 5
      factors.push('⚠️ PROJECTED - Price will crash to real value')
      factors.push('High confidence in direction, timing uncertain')
      break

    case 'INERTIA':
      // Illiquid items: Inherently uncertain
      score -= 10
      factors.push('Illiquid market - price anchored to last sale')
      factors.push('Predictions show expected range, not guaranteed path')
      break

    case 'FLOW':
      // Liquid items: Technical analysis meaningful
      score += 10
      factors.push('Liquid market - technical analysis applicable')
      break
  }

  // ========================================
  // DATA QUALITY ASSESSMENT
  // ========================================
  const marketStats = getMarketStatsFromData(data)

  if (marketStats.dataQuality === 'high') {
    score += 10
    factors.push(`Good data frequency (~${marketStats.avgDataFrequency.toFixed(1)} days/update)`)
  } else if (marketStats.dataQuality === 'low') {
    score -= 10
    factors.push(`Sparse data (~${marketStats.avgDataFrequency.toFixed(1)} days/update)`)
  }

  // Data quantity
  if (data.length >= 180) {
    score += 10
    factors.push('Extensive history (6+ months)')
  } else if (data.length >= 60) {
    score += 5
    factors.push('Good history (2+ months)')
  } else if (data.length < 30) {
    score -= 10
    factors.push('Limited history - wider uncertainty')
  }

  // ========================================
  // LIQUIDITY ASSESSMENT (for non-GRAVITY)
  // ========================================
  if (regime !== 'GRAVITY') {
    const avgVolume = calculateAverageVolume(data, 30)
    if (avgVolume >= 20) {
      score += 10
      factors.push(`High liquidity (${avgVolume.toFixed(1)} trades/day)`)
    } else if (avgVolume >= 5) {
      score += 5
      factors.push(`Moderate liquidity (${avgVolume.toFixed(1)} trades/day)`)
    } else if (avgVolume < 1) {
      score -= 15
      factors.push(`⚠️ Very low liquidity (<1 trade/day)`)
    }
  }

  // ========================================
  // VOLATILITY ASSESSMENT
  // ========================================
  const annualizedVol = marketStats.volatility * Math.sqrt(252)

  if (regime === 'FLOW') {
    // Volatility matters more for liquid items
    if (annualizedVol < 0.3) {
      score += 10
      factors.push(`Low volatility (${(annualizedVol * 100).toFixed(0)}% annualized)`)
    } else if (annualizedVol > 0.8) {
      score -= 10
      factors.push(`High volatility (${(annualizedVol * 100).toFixed(0)}% annualized)`)
    }
  }

  // ========================================
  // SENTIMENT INDICATOR QUALITY
  // ========================================
  if (demand !== undefined && demand >= 0) {
    if (demand >= 3) {
      score += 5
      factors.push('Strong demand signal')
    } else if (demand <= 1) {
      score -= 5
      factors.push('Weak demand - selling pressure')
    }
  }

  if (trend !== undefined && trend >= 0) {
    if (trend === 3) {
      score += 5
      factors.push('Rising trend confirmed')
    } else if (trend === 0) {
      score -= 5
      factors.push('Declining trend confirmed')
    } else if (trend === 4) {
      score -= 3
      factors.push('Fluctuating - direction unclear')
    }
  }

  // ========================================
  // FINAL SCORE CALCULATION
  // ========================================
  score = Math.max(10, Math.min(90, score))

  const level: 'low' | 'medium' | 'high' = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low'

  return { level, percentage: score, factors }
}
