import React, { useState, memo } from 'react'
import { Account } from '@renderer/types'
import UserProfileView from './UserProfileView'
import UniversalProfileModal from '@renderer/components/Modals/UniversalProfileModal'

interface ProfileTabProps {
  account: Account
  onJoinGame?: (placeId: number | string, jobId?: string, userId?: number | string) => void
}

const ProfileTab: React.FC<ProfileTabProps> = memo(
  ({ account, onJoinGame }) => {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

    if (!account.userId || !account.cookie) {
      return (
        <div className="flex items-center justify-center h-full text-neutral-500">
          Account data missing
        </div>
      )
    }

    return (
      <div className="absolute inset-0 flex flex-col w-full h-full bg-[var(--color-app-bg)] overflow-hidden font-sans">
        <UserProfileView
          userId={account.userId}
          requestCookie={account.cookie}
          accountUserId={account.userId}
          isOwnAccount={true}
          onSelectProfile={(id) => setSelectedUserId(id)}
          initialData={{
            displayName: account.displayName,
            username: account.username,
            avatarUrl: account.avatarUrl,
            status: account.status,
            notes: account.notes,
            joinDate: account.joinDate,
            placeVisits: account.placeVisits,
            friendCount: account.friendCount,
            followerCount: account.followerCount,
            followingCount: account.followingCount,
            isPremium: account.isPremium,
            isAdmin: account.isAdmin,
            totalFavorites: account.totalFavorites,
            concurrentPlayers: account.concurrentPlayers,
            groupMemberCount: account.groupMemberCount
          }}
          onJoinGame={onJoinGame}
        />

        <UniversalProfileModal
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          userId={selectedUserId}
          selectedAccount={account}
          onJoinGame={onJoinGame}
        />
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if the account ID or cookie changed
    return (
      prevProps.account.id === nextProps.account.id &&
      prevProps.account.cookie === nextProps.account.cookie &&
      prevProps.onJoinGame === nextProps.onJoinGame
    )
  }
)

export default ProfileTab
