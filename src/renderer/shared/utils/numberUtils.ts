type NumberInput = number | null | undefined

const isValidNumber = (value: NumberInput): value is number =>
  typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)

interface FormatNumberOptions {
  precision?: number
  fallback?: string
}

export const formatNumber = (
  value: NumberInput,
  { precision = 1, fallback = '0' }: FormatNumberOptions = {}
) => {
  if (!isValidNumber(value)) return fallback
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  const formatAbbreviated = (abbreviated: number, suffix: string): string => {
    const multiplier = Math.pow(10, precision)
    const truncated = Math.trunc(abbreviated * multiplier) / multiplier
    // Format with precision, then remove trailing zeros and decimal point if not needed
    const formatted = truncated.toFixed(precision).replace(/\.?0+$/, '')
    return `${sign}${formatted}${suffix}`
  }

  if (abs >= 1_000_000_000) {
    return formatAbbreviated(abs / 1_000_000_000, 'B')
  }
  if (abs >= 1_000_000) {
    return formatAbbreviated(abs / 1_000_000, 'M')
  }
  if (abs >= 1_000) {
    return formatAbbreviated(abs / 1_000, 'K')
  }

  const multiplier = Math.pow(10, precision)
  const truncated = Math.trunc(abs * multiplier) / multiplier
  const formatted = truncated.toFixed(precision).replace(/\.?0+$/, '')
  return `${sign}${formatted}`
}

interface FormatLocaleNumberOptions extends Intl.NumberFormatOptions {
  locale?: string | string[]
  fallback?: string
}

export const formatLocaleNumber = (
  value: NumberInput,
  { locale, fallback = '0', ...options }: FormatLocaleNumberOptions = {}
) => {
  if (!isValidNumber(value)) return fallback
  return new Intl.NumberFormat(locale, options).format(value)
}

interface FormatCurrencyOptions extends Intl.NumberFormatOptions {
  locale?: string | string[]
  currency?: string
  symbol?: string
  symbolPosition?: 'prefix' | 'suffix'
  fallback?: string
}

export const formatCurrency = (
  value: NumberInput,
  {
    locale,
    currency,
    symbol = 'R$',
    symbolPosition = 'suffix',
    fallback = '0',
    ...options
  }: FormatCurrencyOptions = {}
) => {
  if (!isValidNumber(value)) return fallback

  if (currency) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, ...options }).format(value)
  }

  const formatted = formatLocaleNumber(value, { locale, fallback, ...options })
  return symbolPosition === 'prefix' ? `${symbol}${formatted}` : `${formatted} ${symbol}`.trim()
}
