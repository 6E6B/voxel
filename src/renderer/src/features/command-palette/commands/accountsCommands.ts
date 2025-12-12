import { CommandFactory } from './types'

export const createAccountsCommands: CommandFactory = (callbacks) => [
  {
    id: 'copy-user-id',
    label: 'Copy User ID',
    description: "Copy selected account's user ID",
    icon: 'copy',
    category: 'accounts',
    keywords: ['clipboard', 'id'],
    action: () => {
      const account = callbacks.getSelectedAccount()
      if (!account) {
        callbacks.showNotification('Select an account first', 'error')
        return
      }
      navigator.clipboard.writeText(account.userId)
      callbacks.showNotification(`Copied User ID: ${account.userId}`, 'success')
    }
  },
  {
    id: 'copy-cookie',
    label: 'Copy Cookie',
    description: 'Copy .ROBLOSECURITY to clipboard',
    icon: 'cookie',
    category: 'accounts',
    keywords: ['clipboard', 'security', 'token'],
    action: () => {
      const account = callbacks.getSelectedAccount()
      if (!account?.cookie) {
        callbacks.showNotification('Select an account with a valid cookie', 'error')
        return
      }
      navigator.clipboard.writeText(account.cookie)
      callbacks.showNotification('Cookie copied to clipboard', 'success')
    }
  },
  {
    id: 'check-status',
    label: 'Check Status',
    description: 'Verify account is still valid',
    icon: 'shield-check',
    category: 'accounts',
    keywords: ['validate', 'verify', 'banned'],
    action: async () => {
      const account = callbacks.getSelectedAccount()
      if (!account?.cookie) {
        callbacks.showNotification('Select an account first', 'error')
        return
      }
      try {
        const result = await window.api.validateCookie(account.cookie)
        if (result) {
          callbacks.showNotification(`✓ Account valid: ${result.displayName}`, 'success')
        }
      } catch {
        callbacks.showNotification('✗ Account invalid or banned', 'error')
      }
    }
  },
  {
    id: 'view-in-browser',
    label: 'View in Browser',
    description: 'Open profile on roblox.com',
    icon: 'external-link',
    category: 'accounts',
    keywords: ['open', 'web', 'website'],
    action: () => {
      const account = callbacks.getSelectedAccount()
      if (!account) {
        callbacks.showNotification('Select an account first', 'error')
        return
      }
      window.open(`https://www.roblox.com/users/${account.userId}/profile`, '_blank')
    }
  },
  {
    id: 'log-out-account',
    label: 'Log Out Account',
    description: 'Remove account from manager',
    icon: 'logout',
    category: 'accounts',
    keywords: ['remove', 'delete', 'sign out'],
    action: () => {
      const account = callbacks.getSelectedAccount()
      if (!account) {
        callbacks.showNotification('Select an account first', 'error')
        return
      }
      // Update accounts by removing the selected one
      const currentAccounts = callbacks.getAccounts()
      const newAccounts = currentAccounts.filter((a) => a.id !== account.id)
      window.api.saveAccounts(newAccounts)
      callbacks.setSelectedIds(new Set())
      callbacks.showNotification(`Logged out ${account.displayName}`, 'success')
    }
  }
]

export const createAccountSwitchCommands: CommandFactory = (callbacks) => {
  const accounts = callbacks.getAccounts()
  return accounts.map((account) => ({
    id: `switch-${account.id}`,
    label: `Switch to ${account.displayName}`,
    description: `@${account.username}`,
    icon: 'refresh',
    category: 'accounts' as const,
    keywords: ['select', 'change', account.username.toLowerCase()],
    action: () => {
      callbacks.setSelectedIds(new Set([account.id]))
      callbacks.setActiveTab('Accounts')
      callbacks.showNotification(`Switched to ${account.displayName}`, 'success')
    }
  }))
}
