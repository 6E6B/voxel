import React, { useMemo } from 'react'
import { Copy, FileDown } from 'lucide-react'
import GenericContextMenu, {
  ContextMenuSection,
  ContextMenuItem
} from '@renderer/shared/ui/menus/GenericContextMenu'

interface CatalogItemContextMenuProps {
  activeMenu: {
    x: number
    y: number
    assetId: number
    assetName: string
    assetType?: number
  } | null
  onClose: () => void
  onDownloadTemplate: (assetId: number, assetName: string) => void
  onCopyAssetId: (assetId: number) => void
}

const CatalogItemContextMenu: React.FC<CatalogItemContextMenuProps> = ({
  activeMenu,
  onClose,
  onDownloadTemplate,
  onCopyAssetId
}) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []

    // Classic Shirt (11) and Pants (12)
    const isClothing = activeMenu.assetType === 11 || activeMenu.assetType === 12

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

export default CatalogItemContextMenu


