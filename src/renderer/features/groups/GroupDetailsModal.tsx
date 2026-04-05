import {
  Sheet,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody
} from '@renderer/shared/ui/dialogs/Sheet'
import { GroupDetailsPanel, type GroupDetailsPanelProps } from './GroupDetailsPanel'

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
          <SheetTitle>Group Details</SheetTitle>
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

