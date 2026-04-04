import { useMemo } from 'react'
import { Star, Copy, Edit2, Save, Trash2, Info } from 'lucide-react'
import GenericContextMenu, {
  ContextMenuSection,
  ContextMenuItem
} from '@renderer/shared/ui/menus/GenericContextMenu'

interface AccessoryContextMenuProps {
  activeMenu: {
    id: number
    name: string
    isFavorite: boolean
    x: number
    y: number
    canEdit?: boolean
  } | null
  onClose: () => void
  onViewDetails?: (id: number) => void
  onFavorite: (id: number, name: string) => void
  onCopyId: (id: number) => void
  onRename?: (id: number, currentName: string) => void
  onUpdate?: (id: number, name: string) => void
  onDelete?: (id: number, name: string) => void
}

const AccessoryContextMenu = ({
  activeMenu,
  onClose,
  onViewDetails,
  onFavorite,
  onCopyId,
  onRename,
  onUpdate,
  onDelete
}: AccessoryContextMenuProps) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []

    const mainItems: ContextMenuItem[] = []

    if (onViewDetails) {
      mainItems.push({
        label: 'View Details',
        icon: <Info size={16} />,
        onClick: () => onViewDetails(activeMenu.id)
      })
    }

    mainItems.push({
      label: activeMenu.isFavorite ? 'Unfavorite' : 'Favorite',
      icon: (
        <Star
          size={16}
          className={activeMenu.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}
        />
      ),
      onClick: () => onFavorite(activeMenu.id, activeMenu.name)
    })

    const copySection = {
      items: [
        {
          label: 'Copy Asset ID',
          icon: <Copy size={16} />,
          onClick: () => onCopyId(activeMenu.id)
        }
      ]
    }

    const result = [{ items: mainItems }, copySection]

    if (activeMenu.canEdit) {
      const editItems: ContextMenuItem[] = []

      if (onUpdate) {
        editItems.push({
          label: 'Update with Worn',
          icon: <Save size={16} />,
          onClick: () => onUpdate(activeMenu.id, activeMenu.name)
        })
      }

      if (onRename) {
        editItems.push({
          label: 'Rename Outfit',
          icon: <Edit2 size={16} />,
          onClick: () => onRename(activeMenu.id, activeMenu.name)
        })
      }

      if (onDelete) {
        editItems.push({
          label: 'Delete Outfit',
          icon: <Trash2 size={16} />,
          onClick: () => onDelete(activeMenu.id, activeMenu.name),
          variant: 'danger' as const
        })
      }

      if (editItems.length > 0) {
        result.push({ items: editItems })
      }
    }

    return result
  }, [activeMenu, onViewDetails, onFavorite, onCopyId, onRename, onUpdate, onDelete])

  return (
    <GenericContextMenu
      position={activeMenu}
      sections={sections}
      onClose={onClose}
    />
  )
}

export default AccessoryContextMenu

