import { timeAgo, timeAgoLong } from './timeUtils'

type DateInput = string | number | Date | null | undefined

const DEFAULT_FALLBACK = 'N/A'
const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}

const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DEFAULT_DATE_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
}

const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

interface FormatOptions {
  locale?: string | string[]
  fallback?: string
  formatOptions?: Intl.DateTimeFormatOptions
}

export const formatDate = (
  value: DateInput,
  { locale, fallback = DEFAULT_FALLBACK, formatOptions = DEFAULT_DATE_OPTIONS }: FormatOptions = {}
) => {
  const date = toDate(value)
  if (!date) return fallback
  return date.toLocaleDateString(locale, formatOptions)
}

export const formatDateTime = (
  value: DateInput,
  {
    locale,
    fallback = DEFAULT_FALLBACK,
    formatOptions = DEFAULT_DATETIME_OPTIONS
  }: FormatOptions = {}
) => {
  const date = toDate(value)
  if (!date) return fallback
  return date.toLocaleString(locale, formatOptions)
}

interface RelativeFormatOptions {
  fallback?: string
  style?: 'short' | 'long'
  lowercase?: boolean
}

export const formatRelativeDate = (
  value: DateInput,
  { fallback = DEFAULT_FALLBACK, style = 'short', lowercase = true }: RelativeFormatOptions = {}
) => {
  const date = toDate(value)
  if (!date) return fallback
  const formatted = style === 'long' ? timeAgoLong(date.toISOString()) : timeAgo(date.toISOString())
  if (!lowercase) return formatted
  if (!formatted) return fallback
  return formatted.charAt(0).toLowerCase() + formatted.slice(1)
}

export const parseDateSafe = (value: DateInput) => toDate(value)
