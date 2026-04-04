import { Account } from '@renderer/shared/types'
import InventoryBrowser from './InventoryBrowser'

interface InventoryTabProps {
  account: Account | null
}

const InventoryTab = ({ account }: InventoryTabProps) => {
  return <InventoryBrowser account={account} />
}

export default InventoryTab


