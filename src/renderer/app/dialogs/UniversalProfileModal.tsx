import React, { useState, useEffect } from 'react'
import { Account, AccountStatus } from '@renderer/shared/types'
import UserProfileView from '@renderer/features/profile/UserProfileView'
import { Sheet, SheetContent, SheetHandle, SheetHeader, SheetTitle, SheetBody } from '@renderer/shared/ui/dialogs/Sheet'
import { PageHeaderHost, PageHeaderProvider } from '@renderer/shared/ui/navigation/PageHeaderPortal'

interface UniversalProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | number | null
  selectedAccount: Account | null // Context for making API calls (needs a cookie)
  privacyMode?: boolean
  initialData?: Partial<ExtendedProfile> | null // Optional immediate data
  onJoinGame?: (placeId: number | string, jobId?: string, userId?: number | string) => void
}

export interface ExtendedProfile {
  id: number
  name: string // username
  displayName: string
  description: string
  created: string
  isBanned: boolean
  externalAppDisplayName: string | null

  // Stats
  followerCount: number
  followingCount: number
  friendCount: number

  // Extended
  isPremium: boolean
  isAdmin: boolean
  avatarImageUrl: string | null // Full body render
  headshotUrl: string | null

  // Status
  status?: AccountStatus
  lastLocation?: string
}

const UniversalProfileModal: React.FC<UniversalProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  selectedAccount,
  privacyMode,
  initialData,
  onJoinGame
}) => {
  const [nestedProfileId, setNestedProfileId] = useState<string | number | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setNestedProfileId(null)
    }
  }, [isOpen])

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <PageHeaderProvider>
        <SheetContent className="h-full">
          <SheetHandle />
          <SheetHeader>
            <SheetTitle>Profile</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {userId && selectedAccount?.cookie ? (
              <div key={userId?.toString()} className="h-full w-full animate-profile-swap">
                <UserProfileView
                  userId={userId}
                  requestCookie={selectedAccount.cookie}
                  accountUserId={selectedAccount.userId}
                  isOwnAccount={false}
                  privacyMode={!!privacyMode}
                  onClose={onClose}
                  showCloseButton={false}
                  onSelectProfile={(id) => setNestedProfileId(id)}
                  onJoinGame={onJoinGame}
                  initialData={
                    initialData
                      ? {
                        displayName: initialData.displayName,
                        username: initialData.name,
                        avatarUrl: initialData.headshotUrl || undefined,
                        status: initialData.status,
                        notes: initialData.description,
                        joinDate: initialData.created,
                        friendCount: initialData.friendCount,
                        followerCount: initialData.followerCount,
                        followingCount: initialData.followingCount,
                        isPremium: initialData.isPremium,
                        isAdmin: initialData.isAdmin
                      }
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500">
                {selectedAccount?.cookie
                  ? 'No User Selected'
                  : 'Please select an account to view profiles'}
              </div>
            )}
          </SheetBody>
        </SheetContent>
        <PageHeaderHost />
      </PageHeaderProvider>

      <UniversalProfileModal
        isOpen={nestedProfileId !== null}
        onClose={() => setNestedProfileId(null)}
        userId={nestedProfileId}
        selectedAccount={selectedAccount}
        privacyMode={privacyMode}
        onJoinGame={onJoinGame}
      />
    </Sheet>
  )
}

export default UniversalProfileModal

