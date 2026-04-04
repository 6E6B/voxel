import { useMemo } from 'react'
import { Info, Edit3, RefreshCw, Trash2 } from 'lucide-react'
import { Account } from '@renderer/shared/types'
import GenericContextMenu, { ContextMenuSection } from './GenericContextMenu'

interface ContextMenuProps {
  activeMenu: { id: string; x: number; y: number } | null
  accounts: Account[]
  onViewDetails: (account: Account) => void
  onEditNote: (id: string) => void
  onReauth: (id: string) => void
  onRemove: (id: string) => void
  onClose?: () => void
}

const ContextMenu = ({
  activeMenu,
  accounts,
  onViewDetails,
  onEditNote,
  onReauth,
  onRemove,
  onClose = () => { }
}: ContextMenuProps) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []

    const account = accounts.find((a) => a.id === activeMenu.id)

    return [
      {
        items: [
          {
            label: 'View Details',
            icon: <Info size={16} />,
            onClick: () => account && onViewDetails(account)
          },
          {
            label: 'Edit Note',
            icon: <Edit3 size={16} />,
            onClick: () => onEditNote(activeMenu.id)
          },
          {
            label: 'Re-authenticate',
            icon: <RefreshCw size={16} />,
            onClick: () => onReauth(activeMenu.id)
          }
        ]
      },
      {
        items: [
          {
            label: 'Remove Account',
            icon: <Trash2 size={16} />,
            onClick: () => onRemove(activeMenu.id),
            variant: 'danger' as const
          }
        ]
      }
    ]
  }, [activeMenu, accounts, onViewDetails, onEditNote, onReauth, onRemove])

  return (
    <GenericContextMenu
      position={activeMenu}
      sections={sections}
      onClose={onClose}
      width={192}
    />
  )
}

export default ContextMenu
