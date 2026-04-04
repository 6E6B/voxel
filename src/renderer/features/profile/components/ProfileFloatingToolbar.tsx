import React from 'react'
import { Shirt, Package, Box, Copy, Check } from 'lucide-react'
import { PageHeaderPortal } from '@renderer/shared/ui/navigation/PageHeaderPortal'
import { FloatingAction } from '@renderer/shared/ui/navigation/FloatingAction'

interface ProfileFloatingToolbarProps {
  onWearingClick: () => void
  onOutfitsClick: () => void
  onInventoryClick: () => void
  onCopyIdClick: () => void
}

export const ProfileFloatingToolbar: React.FC<ProfileFloatingToolbarProps> = ({
  onWearingClick,
  onOutfitsClick,
  onInventoryClick,
  onCopyIdClick
}) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    onCopyIdClick()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <PageHeaderPortal>
      <FloatingAction.Button icon={Shirt} tooltip="Currently Wearing" onClick={onWearingClick} />
      <FloatingAction.Button icon={Package} tooltip="Outfits" onClick={onOutfitsClick} />
      <FloatingAction.Button icon={Box} tooltip="Inventory" onClick={onInventoryClick} />
      <FloatingAction.Separator />
      <FloatingAction.Button
        icon={copied ? Check : Copy}
        tooltip={copied ? 'Copied!' : 'Copy User ID'}
        onClick={handleCopy}
        className={copied ? '!text-emerald-400' : ''}
      />
    </PageHeaderPortal>
  )
}

