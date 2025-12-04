import { CommandFactory } from './types'

export const createProfilesCommands: CommandFactory = (callbacks) => [
  {
    id: 'view-profile-username',
    label: 'View Profile by Username',
    description: 'Look up any Roblox user',
    icon: 'user',
    category: 'profiles',
    keywords: ['search', 'find', 'lookup'],
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
        callbacks.onViewProfile(user.id.toString())
        callbacks.showNotification(`Found user: ${user.displayName}`, 'success')
      } catch (e) {
        callbacks.showNotification(`User "${username}" not found`, 'error')
      }
    }
  },
  {
    id: 'view-profile-id',
    label: 'View Profile by User ID',
    description: 'Look up user by their ID',
    icon: 'hash',
    category: 'profiles',
    requiresInput: true,
    inputPlaceholder: 'Enter user ID...',
    inputLabel: 'User ID',
    onInputSubmit: (userId) => {
      if (/^\d+$/.test(userId)) {
        callbacks.onViewProfile(userId)
      } else {
        callbacks.showNotification('Invalid user ID', 'error')
      }
    }
  }
]
