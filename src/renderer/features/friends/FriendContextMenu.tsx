import { useMemo } from 'react'
import { UserMinus, Star } from 'lucide-react'
import GenericContextMenu, {
  ContextMenuSection
} from '@renderer/shared/ui/menus/GenericContextMenu'

interface FriendContextMenuProps {
  activeMenu: { id: string; userId: number; x: number; y: number } | null
  isFavorite: boolean
  onClose: () => void
  onUnfriend: (userId: number) => void
  onToggleFavorite: (userId: number) => void
}

const FriendContextMenu = ({
  activeMenu,
  isFavorite,
  onClose,
  onUnfriend,
  onToggleFavorite
}: FriendContextMenuProps) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []
    return [
      {
        items: [
          {
            label: isFavorite ? 'Unfavorite' : 'Favorite',
            icon: (
              <Star size={16} className={isFavorite ? 'fill-yellow-500 text-yellow-500' : ''} />
            ),
            onClick: () => onToggleFavorite(activeMenu.userId)
          }
        ]
      },
      {
        items: [
          {
            label: 'Unfriend',
            icon: <UserMinus size={16} />,
            onClick: () => onUnfriend(activeMenu.userId),
            variant: 'danger' as const
          }
        ]
      }
    ]
  }, [activeMenu, isFavorite, onToggleFavorite, onUnfriend])

  return (
    <GenericContextMenu
      position={activeMenu}
      sections={sections}
      onClose={onClose}
      width={192}
    />
  )
}

export default FriendContextMenu

