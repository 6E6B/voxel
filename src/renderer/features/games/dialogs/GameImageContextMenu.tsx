import React, { useMemo } from 'react'
import { Download } from 'lucide-react'
import GenericContextMenu, {
  ContextMenuSection
} from '@renderer/shared/ui/menus/GenericContextMenu'

interface GameImageContextMenuProps {
  activeMenu: { x: number; y: number; imageUrl: string; gameName: string } | null
  onClose: () => void
  onSaveImage: (imageUrl: string, gameName: string) => void
}

const GameImageContextMenu: React.FC<GameImageContextMenuProps> = ({
  activeMenu,
  onClose,
  onSaveImage
}) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []
    return [
      {
        items: [
          {
            label: 'Save Image',
            icon: <Download size={16} />,
            onClick: () => onSaveImage(activeMenu.imageUrl, activeMenu.gameName)
          }
        ]
      }
    ]
  }, [activeMenu, onSaveImage])

  return (
    <GenericContextMenu
      position={activeMenu}
      sections={sections}
      onClose={onClose}
    />
  )
}

export default GameImageContextMenu

