import { CommandFactory } from './types'
import { formatNumber } from '../../../utils/numberUtils'

export const createValuesCommands: CommandFactory = (callbacks) => [
  {
    id: 'view-value',
    label: 'Check Player Value',
    description: 'View Rolimons value by username',
    icon: 'trending',
    category: 'values',
    keywords: ['rolimons', 'value', 'trade'],
    requiresInput: true,
    inputPlaceholder: 'Enter username...',
    inputLabel: 'Username',
    onInputSubmit: async (username) => {
      try {
        const user = await window.api.getUserByUsername(username)
        if (!user) {
          callbacks.showNotification(`User "${username}" not found`, 'error')
          return
        }
        const rolimonsData = await window.api.getRolimonsPlayer(user.id)

        if (rolimonsData.value === null || rolimonsData.value === undefined) {
          callbacks.showNotification(`${user.displayName} has no value set on Rolimons`, 'info')
        } else {
          const formattedValue = formatNumber(rolimonsData.value)
          callbacks.showNotification(`${user.displayName}'s value: ${formattedValue} R$`, 'success')
        }
      } catch (e) {
        if (e instanceof Error) {
          if (e.message.includes('not found')) {
            callbacks.showNotification(`User "${username}" not found`, 'error')
          } else if (e.message.includes('Rate limited')) {
            callbacks.showNotification(
              'Rate limited by Rolimons API. Please try again later.',
              'error'
            )
          } else {
            callbacks.showNotification(`Failed to fetch value for "${username}"`, 'error')
          }
        } else {
          callbacks.showNotification(`Failed to fetch value for "${username}"`, 'error')
        }
      }
    }
  },
  {
    id: 'view-rap',
    label: 'Check Player RAP',
    description: 'View Rolimons RAP (Recent Average Price) by username',
    icon: 'trending',
    category: 'values',
    keywords: ['rolimons', 'rap', 'recent average price', 'trade'],
    requiresInput: true,
    inputPlaceholder: 'Enter username...',
    inputLabel: 'Username',
    onInputSubmit: async (username) => {
      try {
        const user = await window.api.getUserByUsername(username)
        if (!user) {
          callbacks.showNotification(`User "${username}" not found`, 'error')
          return
        }
        const rolimonsData = await window.api.getRolimonsPlayer(user.id)

        if (rolimonsData.rap === null || rolimonsData.rap === undefined) {
          callbacks.showNotification(`${user.displayName} has no RAP set on Rolimons`, 'info')
        } else {
          const formattedRap = formatNumber(rolimonsData.rap)
          callbacks.showNotification(`${user.displayName}'s RAP: ${formattedRap} R$`, 'success')
        }
      } catch (e) {
        if (e instanceof Error) {
          if (e.message.includes('not found')) {
            callbacks.showNotification(`User "${username}" not found`, 'error')
          } else if (e.message.includes('Rate limited')) {
            callbacks.showNotification(
              'Rate limited by Rolimons API. Please try again later.',
              'error'
            )
          } else {
            callbacks.showNotification(`Failed to fetch RAP for "${username}"`, 'error')
          }
        } else {
          callbacks.showNotification(`Failed to fetch RAP for "${username}"`, 'error')
        }
      }
    }
  }
]
