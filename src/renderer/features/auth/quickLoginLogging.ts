const stringifyDetails = (details?: Record<string, unknown>): string => {
  if (!details || Object.keys(details).length === 0) {
    return ''
  }

  try {
    return ` ${JSON.stringify(details)}`
  } catch {
    return ''
  }
}

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  return String(error)
}

export const logQuickLogin = (
  source: 'Onboarding' | 'AddAccountModal',
  message: string,
  details?: Record<string, unknown>
): void => {
  console.log(`[QuickLogin][${source}] ${message}${stringifyDetails(details)}`)
}

export const logQuickLoginError = (
  source: 'Onboarding' | 'AddAccountModal',
  message: string,
  error: unknown,
  details?: Record<string, unknown>
): void => {
  console.error(
    `[QuickLogin][${source}] ${message}: ${formatError(error)}${stringifyDetails(details)}`
  )
}

export const quickLoginAttemptDetails = (
  code?: string | null,
  privateKey?: string | null
): Record<string, unknown> => ({
  codeLength: code?.length ?? 0,
  privateKeyLength: privateKey?.length ?? 0
})
