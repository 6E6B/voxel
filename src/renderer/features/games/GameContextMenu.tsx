import { useMemo } from 'react'
import { Star, MapPin, Globe } from 'lucide-react'
import GenericContextMenu, {
  ContextMenuSection,
  ContextMenuItem
} from '@renderer/shared/ui/menus/GenericContextMenu'

interface GameContextMenuProps {
  activeMenu: {
    id: string // This is the game ID / Universe ID usually
    placeId?: string
    universeId?: string
    isFavorite: boolean
    x: number
    y: number
  } | null
  onClose: () => void
  onFavorite: (id: string) => void
  onCopyPlaceId: (placeId: string) => void
  onCopyUniverseId: (universeId: string) => void
}

const GameContextMenu = ({
  activeMenu,
  onClose,
  onFavorite,
  onCopyPlaceId,
  onCopyUniverseId
}: GameContextMenuProps) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []

    const copyItems: ContextMenuItem[] = []
    if (activeMenu.placeId) {
      copyItems.push({
        label: 'Copy Place ID',
        icon: <MapPin size={16} />,
        onClick: () => onCopyPlaceId(activeMenu.placeId!)
      })
    }
    if (activeMenu.universeId) {
      copyItems.push({
        label: 'Copy Universe ID',
        icon: <Globe size={16} />,
        onClick: () => onCopyUniverseId(activeMenu.universeId!)
      })
    }

    return [
      {
        items: [
          {
            label: activeMenu.isFavorite ? 'Unfavorite' : 'Favorite',
            icon: (
              <Star
                size={16}
                className={activeMenu.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}
              />
            ),
            onClick: () => onFavorite(activeMenu.placeId || activeMenu.id)
          }
        ]
      },
      ...(copyItems.length > 0 ? [{ items: copyItems }] : [])
    ]
  }, [activeMenu, onFavorite, onCopyPlaceId, onCopyUniverseId])

  return (
    <GenericContextMenu
      position={activeMenu}
      sections={sections}
      onClose={onClose}
      width={220}
    />
  )
}

export default GameContextMenu

