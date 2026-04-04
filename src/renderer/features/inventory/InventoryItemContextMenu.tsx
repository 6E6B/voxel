import React, { useMemo } from 'react'
import { Copy, FileDown } from 'lucide-react'
import GenericContextMenu, {
  ContextMenuSection,
  ContextMenuItem
} from '@renderer/shared/ui/menus/GenericContextMenu'

interface InventoryItemContextMenuProps {
  activeMenu: {
    x: number
    y: number
    assetId: number
    assetName: string
    assetType?: number | string
  } | null
  onClose: () => void
  onDownloadTemplate: (assetId: number, assetName: string) => void
  onCopyAssetId: (assetId: number) => void
}

const InventoryItemContextMenu: React.FC<InventoryItemContextMenuProps> = ({
  activeMenu,
  onClose,
  onDownloadTemplate,
  onCopyAssetId
}) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []

    // Convert assetType to number if it's a string
    // Map string asset type names to numeric IDs
    const assetTypeNum =
      typeof activeMenu.assetType === 'string'
        ? (() => {
          // Map common string asset types to their numeric IDs
          const typeMap: Record<string, number> = {
            Hat: 8,
            HairAccessory: 41,
            FaceAccessory: 42,
            NeckAccessory: 43,
            ShoulderAccessory: 44,
            FrontAccessory: 45,
            BackAccessory: 46,
            WaistAccessory: 47,
            Gear: 19,
            Shirt: 11,
            Pants: 12,
            TShirt: 2,
            Head: 17,
            Face: 18,
            EmoteAnimation: 61
          }
          return typeMap[activeMenu.assetType as string] || undefined
        })()
        : activeMenu.assetType

    // Classic Shirt (11) and Pants (12) - only these support templates
    const isClothing = assetTypeNum === 11 || assetTypeNum === 12

    const downloadItems: ContextMenuItem[] = []
    if (isClothing) {
      downloadItems.push({
        label: 'Download Template',
        icon: <FileDown size={16} />,
        onClick: () => onDownloadTemplate(activeMenu.assetId, activeMenu.assetName)
      })
    }

    return [
      { items: downloadItems },
      {
        items: [
          {
            label: 'Copy Asset ID',
            icon: <Copy size={16} />,
            onClick: () => onCopyAssetId(activeMenu.assetId)
          }
        ]
      }
    ]
  }, [activeMenu, onDownloadTemplate, onCopyAssetId])

  return (
    <GenericContextMenu
      position={activeMenu}
      sections={sections}
      onClose={onClose}
    />
  )
}

export default InventoryItemContextMenu


