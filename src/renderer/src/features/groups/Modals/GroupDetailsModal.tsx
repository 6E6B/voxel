import { Users } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody
} from '@renderer/components/UI/dialogs/Sheet'
import { GroupDetailsPanel, type GroupDetailsPanelProps } from '../components/GroupDetailsPanel'

interface GroupDetailsModalProps extends Omit<
  GroupDetailsPanelProps,
  'emptyStateMessage' | 'showActions' | 'tabLayoutId'
> {
  isOpen: boolean
  onClose: () => void
}

export const GroupDetailsModal = ({
  isOpen,
  onClose,
  groupId,
  selectedAccount,
  isPending,
  userRole,
  onViewProfile
}: GroupDetailsModalProps) => {
  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetContent className="h-full flex flex-col">
        <SheetHandle />

        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <Users className="text-neutral-300" size={20} />
            </div>
            <SheetTitle>Group Details</SheetTitle>
          </div>
          <SheetClose />
        </SheetHeader>

        <SheetBody className="flex-1 overflow-hidden p-0 flex flex-col">
          <GroupDetailsPanel
            groupId={groupId}
            selectedAccount={selectedAccount}
            isPending={isPending}
            userRole={userRole}
            onViewProfile={onViewProfile}
            emptyStateMessage="No group selected"
            showActions={false}
            tabLayoutId="groupDetailsModalTabIndicator"
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

export default GroupDetailsModal
