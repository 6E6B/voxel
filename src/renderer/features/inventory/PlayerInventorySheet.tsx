import { useMemo } from 'react'
import { User } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody
} from '@renderer/shared/ui/dialogs/Sheet'
import {
  PageHeaderHost,
  PageHeaderProvider
} from '@renderer/shared/ui/navigation/PageHeaderPortal'
import { Account } from '@renderer/shared/types'
import InventoryBrowser from './InventoryBrowser'

interface PlayerInventorySheetProps {
  isOpen: boolean
  onClose: () => void
  userId: number
  username: string
  cookie?: string
}

const PlayerInventorySheet = ({
  isOpen,
  onClose,
  userId,
  username,
  cookie
}: PlayerInventorySheetProps) => {
  const account = useMemo<Account | null>(() => {
    if (!cookie) {
      return null
    }

    return {
      cookie,
      userId: String(userId)
    } as Account
  }, [cookie, userId])

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <PageHeaderProvider>
        <SheetContent className="h-full">
          <SheetHandle />

          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-surface-muted)] rounded-lg">
                <User className="text-[var(--color-text-secondary)]" size={20} />
              </div>
              <SheetTitle>{`${username}'s Inventory`}</SheetTitle>
            </div>
            <SheetClose />
          </SheetHeader>

          <SheetBody className="relative flex-1 overflow-hidden p-0">
            <InventoryBrowser account={account} />
            <PageHeaderHost className="absolute bottom-5 right-6 z-30" />
          </SheetBody>
        </SheetContent>
      </PageHeaderProvider>
    </Sheet>
  )
}

export default PlayerInventorySheet


