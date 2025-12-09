import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRightLeft,
  Loader2,
  User,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Clock,
  ChevronRight,
  Users,
  AlertTriangle
} from 'lucide-react'
import { Account } from '@renderer/types'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@renderer/components/UI/display/Tooltip'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import { Button } from '@renderer/components/UI/buttons/Button'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'
import { TixIcon } from '@renderer/components/UI/icons/TixIcon'
import { formatNumber } from '@renderer/utils/numberUtils'
import { useTransactionTypes, useTransactions, useTransactionTotals } from './api/useTransactions'
import {
  useSelectedTransactionType,
  useSetSelectedTransactionType,
  useTimeFrame,
  useSetTimeFrame
} from './stores/useTransactionsStore'
import UniversalProfileModal from '@renderer/components/Modals/UniversalProfileModal'
import GroupDetailsModal from '@renderer/features/groups/Modals/GroupDetailsModal'
import type {
  TransactionTypeEnum,
  Transaction,
  TransactionTimeFrame
} from '@shared/ipc-schemas/transactions'

const TIME_FRAME_OPTIONS: { value: TransactionTimeFrame; label: string }[] = [
  { value: 'Day', label: 'Today' },
  { value: 'Week', label: 'This Week' },
  { value: 'Month', label: 'This Month' },
  { value: 'Year', label: 'This Year' }
]

const TRANSACTION_TYPE_LABELS: Record<TransactionTypeEnum | 'all', string> = {
  all: 'All Transactions',
  Purchase: 'Purchases',
  Sale: 'Sales',
  AffiliatePayout: 'Affiliate Payouts',
  AffiliateSale: 'Affiliate Sales',
  GroupPayout: 'Group Payouts',
  CurrencyPurchase: 'Currency Purchases',
  TradeRobux: 'Trade Robux',
  PremiumStipend: 'Premium Stipends',
  EngagementPayout: 'Engagement Payouts',
  GroupEngagementPayout: 'Group Engagement Payouts',
  AdSpend: 'Ad Spend',
  DevEx: 'DevEx',
  PendingRobux: 'Pending Robux',
  IndividualToGroup: 'Individual to Group',
  CSAdjustment: 'CS Adjustments',
  AdsRevsharePayout: 'Ads Revshare Payouts',
  GroupAdsRevsharePayout: 'Group Ads Revshare Payouts',
  SubscriptionsRevsharePayout: 'Subscriptions Revshare',
  GroupSubscriptionsRevsharePayout: 'Group Subscriptions Revshare',
  PublishingAdvanceRebates: 'Publishing Advance Rebates',
  LicensingPayment: 'Licensing Payments'
}

interface SummaryTableRowProps {
  label: string
  value: number
  isNegative?: boolean
  isTotal?: boolean
}

const SummaryTableRow = ({
  label,
  value,
  isNegative = false,
  isTotal = false
}: SummaryTableRowProps) => {
  const displayValue = isNegative ? -Math.abs(value) : value

  // Don't render rows with 0 value (unless it's the total row)
  if (value === 0 && !isTotal) {
    return null
  }

  const colorClass =
    displayValue > 0 ? 'text-emerald-400' : displayValue < 0 ? 'text-red-400' : 'text-neutral-400'

  return (
    <tr
      className={`${isTotal ? 'border-t border-neutral-700 font-semibold' : ''} hover:bg-neutral-800/30 transition-colors`}
    >
      <td className={`py-2.5 px-4 text-sm ${isTotal ? 'text-white' : 'text-neutral-300'}`}>
        {label}
      </td>
      <td className={`py-2.5 px-4 text-sm text-right font-mono ${colorClass}`}>
        <div className="flex items-center justify-end gap-1.5">
          <RobuxIcon className="w-3.5 h-3.5" />
          <span>{formatNumber(displayValue)}</span>
        </div>
      </td>
    </tr>
  )
}

interface TransactionRowProps {
  transaction: Transaction
  onAgentClick: (agent: { id: number; type: string; name: string }) => void
}

const TransactionRow = ({ transaction, onAgentClick }: TransactionRowProps) => {
  const isPositive = transaction.currency.amount > 0
  const isTickets = transaction.currency.type === 'Tickets'
  const colorClass = isTickets ? 'text-[#cc9e71]' : isPositive ? 'text-emerald-400' : 'text-red-400'
  const detailsName = transaction.details?.name || '—'

  return (
    <tr className="hover:bg-neutral-800/30 transition-colors border-b border-neutral-800/50 last:border-0">
      <td className="py-3 px-4 text-sm text-neutral-300">
        <div className="flex items-center gap-2">
          {new Date(transaction.created).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
          {transaction.isPending && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Clock size={14} className="text-amber-400" />
              </TooltipTrigger>
              <TooltipContent>Pending</TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-neutral-300">{transaction.transactionType}</td>
      <td className="py-3 px-4 text-sm text-neutral-300 max-w-[140px] truncate">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">{detailsName}</span>
          </TooltipTrigger>
          <TooltipContent>{detailsName}</TooltipContent>
        </Tooltip>
      </td>
      <td className="py-3 px-4 text-sm">
        <button
          onClick={() => onAgentClick(transaction.agent)}
          className="text-neutral-400 hover:text-white hover:underline transition-colors flex items-center gap-1.5"
        >
          {transaction.agent.type === 'Group' ? (
            <Users size={14} className="text-neutral-500" />
          ) : (
            <User size={14} className="text-neutral-500" />
          )}
          {transaction.agent.name}
        </button>
      </td>
      <td className={`py-3 px-4 text-sm text-right font-mono ${colorClass}`}>
        <div className="flex items-center justify-end gap-1.5">
          {transaction.currency.type === 'Robux' && <RobuxIcon className="w-3.5 h-3.5" />}
          {isTickets && <TixIcon className="w-4 h-4" />}
          <span>
            {isPositive ? '+' : ''}
            {formatNumber(transaction.currency.amount)}
          </span>
          {transaction.currency.type !== 'Robux' && !isTickets && (
            <span className="text-neutral-500 text-xs ml-1">{transaction.currency.type}</span>
          )}
        </div>
      </td>
    </tr>
  )
}

// Grouped transaction type
interface GroupedTransaction {
  itemName: string
  transactions: Transaction[]
  totalAmount: number
  currencyType: string
}

interface GroupedTransactionRowProps {
  group: GroupedTransaction
  onAgentClick: (agent: { id: number; type: string; name: string }) => void
}

const GroupedTransactionRow = ({ group, onAgentClick }: GroupedTransactionRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isPositive = group.totalAmount > 0
  const isTickets = group.currencyType === 'Tickets'
  const colorClass = isTickets ? 'text-[#cc9e71]' : isPositive ? 'text-emerald-400' : 'text-red-400'

  // If only one transaction, render a normal row
  if (group.transactions.length === 1) {
    return <TransactionRow transaction={group.transactions[0]} onAgentClick={onAgentClick} />
  }

  const latestTransaction = group.transactions[0]

  return (
    <>
      {/* Group Header Row */}
      <tr
        className="hover:bg-neutral-800/30 transition-colors border-b border-neutral-800/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="py-3 px-4 text-sm text-neutral-300">
          <div className="flex items-center gap-2">
            <ChevronRight
              size={14}
              className={`text-neutral-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            {new Date(latestTransaction.created).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-neutral-300">{latestTransaction.transactionType}</td>
        <td className="py-3 px-4 text-sm text-neutral-300 max-w-[140px] truncate">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default flex items-center gap-1.5">
                {group.itemName}
                <span className="text-xs text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                  ×{group.transactions.length}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {group.itemName} ({group.transactions.length} transactions)
            </TooltipContent>
          </Tooltip>
        </td>
        <td className="py-3 px-4 text-sm text-neutral-400">Multiple</td>
        <td className={`py-3 px-4 text-sm text-right font-mono ${colorClass}`}>
          <div className="flex items-center justify-end gap-1.5">
            {group.currencyType === 'Robux' && <RobuxIcon className="w-3.5 h-3.5" />}
            {isTickets && <TixIcon className="w-4 h-4" />}
            <span>
              {isPositive ? '+' : ''}
              {formatNumber(group.totalAmount)}
            </span>
          </div>
        </td>
      </tr>

      {/* Expanded Child Rows */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {group.transactions.map((transaction, index) => (
              <motion.tr
                key={transaction.idHash}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-neutral-900/30 border-b border-neutral-800/30 last:border-0"
              >
                <td className="py-2.5 px-4 text-sm text-neutral-400">
                  <div className="flex items-center gap-2">
                    {/* Vertical line and indent */}
                    <div className="relative flex items-center">
                      <div
                        className={`absolute left-0 w-0.5 bg-neutral-700 ${
                          index === group.transactions.length - 1 ? 'h-1/2 top-0' : 'h-full'
                        }`}
                      />
                      <div className="w-4 h-0.5 bg-neutral-700 ml-0.5" />
                    </div>
                    <span className="ml-2">
                      {new Date(transaction.created).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    {transaction.isPending && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Clock size={12} className="text-amber-400" />
                        </TooltipTrigger>
                        <TooltipContent>Pending</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-4 text-sm text-neutral-400">
                  {transaction.transactionType}
                </td>
                <td className="py-2.5 px-4 text-sm text-neutral-400 max-w-[140px] truncate">
                  {transaction.details?.name || '—'}
                </td>
                <td className="py-2.5 px-4 text-sm">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAgentClick(transaction.agent)
                    }}
                    className="text-neutral-500 hover:text-white hover:underline transition-colors flex items-center gap-1.5"
                  >
                    {transaction.agent.type === 'Group' ? (
                      <Users size={12} className="text-neutral-600" />
                    ) : (
                      <User size={12} className="text-neutral-600" />
                    )}
                    {transaction.agent.name}
                  </button>
                </td>
                <td
                  className={`py-2.5 px-4 text-sm text-right font-mono ${
                    isTickets
                      ? 'text-[#cc9e71]/80'
                      : transaction.currency.amount > 0
                        ? 'text-emerald-400/80'
                        : 'text-red-400/80'
                  }`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {transaction.currency.type === 'Robux' && <RobuxIcon className="w-3 h-3" />}
                    {isTickets && <TixIcon className="w-3.5 h-3.5" />}
                    <span>
                      {transaction.currency.amount > 0 ? '+' : ''}
                      {formatNumber(transaction.currency.amount)}
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </>
        )}
      </AnimatePresence>
    </>
  )
}

interface TransactionsTabProps {
  account: Account | null
}

const TransactionsTab = ({ account }: TransactionsTabProps) => {
  const cookie = account?.cookie

  // Store state
  const selectedType = useSelectedTransactionType()
  const setSelectedType = useSetSelectedTransactionType()
  const timeFrame = useTimeFrame()
  const setTimeFrame = useSetTimeFrame()

  // Dropdown states
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
  const [isTimeFrameDropdownOpen, setIsTimeFrameDropdownOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // Modal states
  const [profileModalUserId, setProfileModalUserId] = useState<number | null>(null)
  const [groupModalGroupId, setGroupModalGroupId] = useState<number | null>(null)

  // Queries
  const {
    data: transactionTypes,
    isLoading: isLoadingTypes,
    error: typesError
  } = useTransactionTypes(cookie)

  const {
    data: totals,
    isLoading: isLoadingTotals,
    refetch: refetchTotals,
    error: totalsError
  } = useTransactionTotals(cookie, timeFrame)

  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchTransactions,
    error: transactionsError
  } = useTransactions(
    cookie,
    selectedType === 'all' ? 'Sale' : selectedType,
    selectedType !== 'all'
  )

  // Available transaction types based on user's access
  const availableTypes = useMemo(() => {
    if (!transactionTypes) return []

    const types: TransactionTypeEnum[] = []
    if (transactionTypes.HasPurchase) types.push('Purchase')
    if (transactionTypes.HasSale) types.push('Sale')
    if (transactionTypes.HasAffiliateSale) types.push('AffiliateSale')
    if (transactionTypes.HasGroupPayout) types.push('GroupPayout')
    if (transactionTypes.HasCurrencyPurchase) types.push('CurrencyPurchase')
    if (transactionTypes.HasTradeRobux) types.push('TradeRobux')
    if (transactionTypes.HasPremiumStipend) types.push('PremiumStipend')
    if (transactionTypes.HasEngagementPayout) types.push('EngagementPayout')
    if (transactionTypes.HasPendingRobux) types.push('PendingRobux')
    if (transactionTypes.HasCSAdjustment) types.push('CSAdjustment')
    if (transactionTypes.HasAdSpend) types.push('AdSpend')
    if (transactionTypes.HasDevEx) types.push('DevEx')

    return types
  }, [transactionTypes])

  // Flatten and sort transactions
  const transactions = useMemo(() => {
    if (!transactionsData) return []
    const flatTransactions = transactionsData.pages.flatMap((page) => page.data)

    return [...flatTransactions].sort((a, b) => {
      const dateA = new Date(a.created).getTime()
      const dateB = new Date(b.created).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })
  }, [transactionsData, sortOrder])

  // Group transactions by item name
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, GroupedTransaction>()

    for (const transaction of transactions) {
      const itemName = transaction.details?.name || '—'
      const existing = groups.get(itemName)

      if (existing) {
        existing.transactions.push(transaction)
        existing.totalAmount += transaction.currency.amount
      } else {
        groups.set(itemName, {
          itemName,
          transactions: [transaction],
          totalAmount: transaction.currency.amount,
          currencyType: transaction.currency.type
        })
      }
    }

    // Convert to array and sort by the latest transaction date
    return Array.from(groups.values()).sort((a, b) => {
      const dateA = new Date(a.transactions[0].created).getTime()
      const dateB = new Date(b.transactions[0].created).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })
  }, [transactions, sortOrder])

  // Handle agent click - open profile or group modal
  const handleAgentClick = useCallback((agent: { id: number; type: string; name: string }) => {
    if (agent.type === 'Group') {
      setGroupModalGroupId(agent.id)
    } else {
      setProfileModalUserId(agent.id)
    }
  }, [])

  // Parse rate limit error
  const parseRateLimitError = useCallback(
    (error: unknown): { isRateLimited: boolean; resetSeconds: number } => {
      if (!error) return { isRateLimited: false, resetSeconds: 0 }

      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if error message contains rate limit info with seconds
      const rateLimitMatch = errorMessage.match(/Rate limited.*?(\d+)\s*seconds/i)
      if (rateLimitMatch) {
        return { isRateLimited: true, resetSeconds: parseInt(rateLimitMatch[1], 10) }
      }

      // Check for generic rate limit error
      if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429')) {
        return { isRateLimited: true, resetSeconds: 60 }
      }

      return { isRateLimited: false, resetSeconds: 0 }
    },
    []
  )

  // Get rate limit status from any error
  const rateLimitStatus = useMemo(() => {
    const errors = [typesError, totalsError, transactionsError]
    for (const error of errors) {
      const status = parseRateLimitError(error)
      if (status.isRateLimited) return status
    }
    return { isRateLimited: false, resetSeconds: 0 }
  }, [typesError, totalsError, transactionsError, parseRateLimitError])

  // Summary totals computed from API response
  const incomingTotal = useMemo(() => {
    if (!totals) return 0
    return (
      (totals.salesTotal || 0) +
      (totals.affiliateSalesTotal || 0) +
      (totals.groupPayoutsTotal || 0) +
      (totals.currencyPurchasesTotal || 0) +
      (totals.premiumStipendsTotal || 0) +
      (totals.tradeSystemEarningsTotal || 0) +
      (totals.premiumPayoutsTotal || 0) +
      (totals.groupPremiumPayoutsTotal || 0) +
      (totals.adsRevsharePayoutsTotal || 0) +
      (totals.groupAdsRevsharePayoutsTotal || 0) +
      (totals.subscriptionsRevshareTotal || 0) +
      (totals.groupSubscriptionsRevshareTotal || 0) +
      (totals.csAdjustmentTotal || 0) +
      (totals.pendingRobuxTotal || 0) +
      (totals.affiliatePayoutTotal || 0) +
      (totals.licensingPaymentTotal || 0)
    )
  }, [totals])

  const outgoingTotal = useMemo(() => {
    if (!totals) return 0
    return (
      Math.abs(totals.purchasesTotal || 0) +
      Math.abs(totals.tradeSystemCostsTotal || 0) +
      Math.abs(totals.adSpendTotal || 0) +
      Math.abs(totals.developerExchangeTotal || 0) +
      Math.abs(totals.individualToGroupTotal || 0) +
      Math.abs(totals.publishingAdvanceRebatesTotal || 0)
    )
  }, [totals])

  const handleRefresh = useCallback(() => {
    refetchTotals()
    if (selectedType !== 'all') {
      refetchTransactions()
    }
  }, [refetchTotals, refetchTransactions, selectedType])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsTypeDropdownOpen(false)
      setIsTimeFrameDropdownOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
  }, [])

  if (!account || !cookie) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <div className="text-center">
          <User size={48} className="mx-auto mb-4 text-neutral-600" />
          <p>Select an account to view transactions</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-neutral-950">
        {/* Toolbar */}
        <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] z-20 flex items-center justify-between px-6 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ArrowRightLeft size={22} className="text-neutral-400" />
              Transactions
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Frame Dropdown - only shown for summary view */}
            {selectedType === 'all' && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setIsTimeFrameDropdownOpen(!isTimeFrameDropdownOpen)
                    setIsTypeDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700 transition-colors"
                >
                  <Calendar size={16} className="text-neutral-500" />
                  <span>
                    {TIME_FRAME_OPTIONS.find((o) => o.value === timeFrame)?.label || 'This Month'}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-neutral-500 transition-transform ${isTimeFrameDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {isTimeFrameDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-1">
                        {TIME_FRAME_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setTimeFrame(option.value)
                              setIsTimeFrameDropdownOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                              timeFrame === option.value
                                ? 'bg-neutral-800 text-white'
                                : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Transaction Type Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setIsTypeDropdownOpen(!isTypeDropdownOpen)
                  setIsTimeFrameDropdownOpen(false)
                }}
                className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700 transition-colors min-w-[180px]"
              >
                <span className="flex-1 text-left">{TRANSACTION_TYPE_LABELS[selectedType]}</span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isTypeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto scrollbar-thin"
                  >
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setSelectedType('all')
                          setIsTypeDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                          selectedType === 'all'
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                        }`}
                      >
                        All Transactions (Summary)
                      </button>

                      <div className="h-px bg-neutral-800 my-1" />

                      {availableTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedType(type)
                            setIsTypeDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                            selectedType === type
                              ? 'bg-neutral-800 text-white'
                              : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                          }`}
                        >
                          {TRANSACTION_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-6 w-[1px] bg-neutral-800" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-neutral-400 hover:text-white"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {/* Rate Limit Banner */}
          {rateLimitStatus.isRateLimited && (
            <div className="max-w-4xl mx-auto mb-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-200">
                    Rate limited by Roblox. Please try again in{' '}
                    <span className="font-semibold">{rateLimitStatus.resetSeconds} seconds</span>.
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          )}

          {isLoadingTypes || isLoadingTotals ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-neutral-500" />
            </div>
          ) : selectedType === 'all' ? (
            /* Summary View */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <TrendingUp size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm text-neutral-400">Total Incoming</div>
                      <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                        <RobuxIcon className="w-5 h-5" />
                        {formatNumber(incomingTotal)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <TrendingDown size={20} className="text-red-400" />
                    </div>
                    <div>
                      <div className="text-sm text-neutral-400">Total Outgoing</div>
                      <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
                        <RobuxIcon className="w-5 h-5" />-{formatNumber(outgoingTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incoming Robux Table */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-800">
                  <h2 className="text-lg font-semibold text-white">Incoming Robux</h2>
                </div>
                <table className="w-full">
                  <thead className="bg-neutral-900/50">
                    <tr>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="py-2.5 px-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <SummaryTableRow label="Sales" value={totals?.salesTotal || 0} />
                    <SummaryTableRow
                      label="Premium Stipends"
                      value={totals?.premiumStipendsTotal || 0}
                    />
                    <SummaryTableRow
                      label="Currency Purchases"
                      value={totals?.currencyPurchasesTotal || 0}
                    />
                    <SummaryTableRow
                      label="Premium Payouts"
                      value={totals?.premiumPayoutsTotal || 0}
                    />
                    <SummaryTableRow
                      label="Group Premium Payouts"
                      value={totals?.groupPremiumPayoutsTotal || 0}
                    />
                    <SummaryTableRow label="Group Payouts" value={totals?.groupPayoutsTotal || 0} />
                    <SummaryTableRow
                      label="Affiliate Sales"
                      value={totals?.affiliateSalesTotal || 0}
                    />
                    <SummaryTableRow
                      label="Affiliate Payouts"
                      value={totals?.affiliatePayoutTotal || 0}
                    />
                    <SummaryTableRow
                      label="Earnings from Trades"
                      value={totals?.tradeSystemEarningsTotal || 0}
                    />
                    <SummaryTableRow
                      label="Ads Revshare Payouts"
                      value={totals?.adsRevsharePayoutsTotal || 0}
                    />
                    <SummaryTableRow
                      label="Group Ads Revshare"
                      value={totals?.groupAdsRevsharePayoutsTotal || 0}
                    />
                    <SummaryTableRow
                      label="Subscriptions Revshare"
                      value={totals?.subscriptionsRevshareTotal || 0}
                    />
                    <SummaryTableRow
                      label="Group Subscriptions Revshare"
                      value={totals?.groupSubscriptionsRevshareTotal || 0}
                    />
                    <SummaryTableRow
                      label="License Payments"
                      value={totals?.licensingPaymentTotal || 0}
                    />
                    <SummaryTableRow label="Pending Robux" value={totals?.pendingRobuxTotal || 0} />
                    <SummaryTableRow
                      label="Roblox Adjustments"
                      value={totals?.csAdjustmentTotal || 0}
                    />
                    <SummaryTableRow label="Total" value={incomingTotal} isTotal />
                  </tbody>
                </table>
              </div>

              {/* Outgoing Robux Table */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-800">
                  <h2 className="text-lg font-semibold text-white">Outgoing Robux</h2>
                </div>
                <table className="w-full">
                  <thead className="bg-neutral-900/50">
                    <tr>
                      <th className="py-2.5 px-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="py-2.5 px-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <SummaryTableRow
                      label="Purchases"
                      value={Math.abs(totals?.purchasesTotal || 0)}
                      isNegative
                    />
                    <SummaryTableRow
                      label="Cost of Trades"
                      value={Math.abs(totals?.tradeSystemCostsTotal || 0)}
                      isNegative
                    />
                    <SummaryTableRow
                      label="Ad Spend"
                      value={Math.abs(totals?.adSpendTotal || 0)}
                      isNegative
                    />
                    <SummaryTableRow
                      label="DevEx"
                      value={Math.abs(totals?.developerExchangeTotal || 0)}
                      isNegative
                    />
                    <SummaryTableRow
                      label="Individual to Group"
                      value={Math.abs(totals?.individualToGroupTotal || 0)}
                      isNegative
                    />
                    <SummaryTableRow
                      label="Publishing Advance Rebates"
                      value={Math.abs(totals?.publishingAdvanceRebatesTotal || 0)}
                      isNegative
                    />
                    <SummaryTableRow label="Total" value={outgoingTotal} isNegative isTotal />
                  </tbody>
                </table>
              </div>

              {/* Net Summary */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">Net Total</span>
                  <div
                    className={`text-2xl font-bold flex items-center gap-2 ${
                      incomingTotal - outgoingTotal >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    <RobuxIcon className="w-5 h-5" />
                    {incomingTotal - outgoingTotal >= 0 ? '+' : ''}
                    {formatNumber(incomingTotal - outgoingTotal)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Transaction List View */
            <div className="max-w-5xl mx-auto">
              {isLoadingTransactions && transactions.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 size={32} className="animate-spin text-neutral-500" />
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState
                  icon={ArrowRightLeft}
                  title="No transactions found"
                  description={`No ${TRANSACTION_TYPE_LABELS[selectedType].toLowerCase()} found for this account.`}
                />
              ) : (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-900/50 sticky top-0">
                      <tr className="border-b border-neutral-800">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[140px]">
                          <button
                            onClick={toggleSortOrder}
                            className="flex items-center gap-1.5 hover:text-neutral-300 transition-colors"
                          >
                            Date
                            {sortOrder === 'newest' ? (
                              <ArrowDown size={14} className="text-neutral-400" />
                            ) : (
                              <ArrowUp size={14} className="text-neutral-400" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[150px]">
                          Type
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[140px]">
                          Item
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[150px]">
                          User
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[120px]">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedTransactions.map((group) => (
                        <GroupedTransactionRow
                          key={group.itemName}
                          group={group}
                          onAgentClick={handleAgentClick}
                        />
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {hasNextPage && (
                    <div className="p-4 border-t border-neutral-800 flex justify-center">
                      <Button
                        variant="ghost"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="text-neutral-400 hover:text-white"
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load More
                            <ChevronDown size={16} className="ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      <UniversalProfileModal
        isOpen={profileModalUserId !== null}
        onClose={() => setProfileModalUserId(null)}
        userId={profileModalUserId}
        selectedAccount={account}
      />

      {/* Group Details Modal */}
      <GroupDetailsModal
        isOpen={groupModalGroupId !== null}
        onClose={() => setGroupModalGroupId(null)}
        groupId={groupModalGroupId}
        selectedAccount={account}
        onViewProfile={(userId) => {
          setGroupModalGroupId(null)
          setProfileModalUserId(userId)
        }}
      />
    </TooltipProvider>
  )
}

export default TransactionsTab
