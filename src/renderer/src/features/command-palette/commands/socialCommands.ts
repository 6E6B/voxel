import { CommandFactory } from './types'

export const createSocialCommands: CommandFactory = (callbacks) => [
  {
    id: 'send-friend-request',
    label: 'Send Friend Request',
    description: 'Add friend by username',
    icon: 'user-plus',
    category: 'social',
    keywords: ['add', 'friend'],
    requiresInput: true,
    inputPlaceholder: 'Enter username...',
    inputLabel: 'Username',
    onInputSubmit: async (username) => {
      const account = callbacks.getSelectedAccount()
      if (!account?.cookie) {
        callbacks.showNotification('Select an account first', 'error')
        return
      }
      try {
        const user = await window.api.getUserByUsername(username)
        if (!user) {
          callbacks.showNotification(`User "${username}" not found`, 'error')
          return
        }
        await window.api.sendFriendRequest(account.cookie, user.id)
        callbacks.showNotification(`Friend request sent to ${user.displayName}`, 'success')
      } catch (e: any) {
        callbacks.showNotification(e.message || 'Failed to send friend request', 'error')
      }
    }
  },
  {
    id: 'unfriend-user',
    label: 'Unfriend User',
    description: 'Remove a friend by username',
    icon: 'user-minus',
    category: 'social',
    keywords: ['remove', 'friend', 'delete'],
    requiresInput: true,
    inputPlaceholder: 'Enter username...',
    inputLabel: 'Username',
    onInputSubmit: async (username) => {
      const account = callbacks.getSelectedAccount()
      if (!account?.cookie) {
        callbacks.showNotification('Select an account first', 'error')
        return
      }
      try {
        const user = await window.api.getUserByUsername(username)
        if (!user) {
          callbacks.showNotification(`User "${username}" not found`, 'error')
          return
        }
        await window.api.unfriend(account.cookie, user.id)
        callbacks.showNotification(`Unfriended ${user.displayName}`, 'success')
      } catch (e: any) {
        callbacks.showNotification(e.message || 'Failed to unfriend user', 'error')
      }
    }
  },
  {
    id: 'block-user',
    label: 'Block User',
    description: 'Block a user by username',
    icon: 'ban',
    category: 'social',
    keywords: ['ban', 'ignore'],
    requiresInput: true,
    inputPlaceholder: 'Enter username...',
    inputLabel: 'Username',
    onInputSubmit: async (username) => {
      const account = callbacks.getSelectedAccount()
      if (!account?.cookie) {
        callbacks.showNotification('Select an account first', 'error')
        return
      }
      try {
        const user = await window.api.getUserByUsername(username)
        if (!user) {
          callbacks.showNotification(`User "${username}" not found`, 'error')
          return
        }
        await window.api.blockUser(account.cookie, user.id)
        callbacks.showNotification(`Blocked ${user.displayName}`, 'success')
      } catch (e: any) {
        callbacks.showNotification(e.message || 'Failed to block user', 'error')
      }
    }
  }
]
