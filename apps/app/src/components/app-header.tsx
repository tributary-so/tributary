import { WalletButton, ClusterUiSelect } from '@tributary-so/ui/solana'
import { Navbar } from '@tributary-so/ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { useNavigate } from 'react-router'

/**
 * App-local nav actions: the connected-only Dashboard shortcut plus the
 * standard wallet + cluster controls. ThemeToggle comes with the kit Navbar.
 */
function HeaderActions() {
  const { connected } = useWallet()
  const navigate = useNavigate()

  if (!connected) {
    return (
      <>
        <WalletButton />
        <ClusterUiSelect />
      </>
    )
  }
  return (
    <>
      <button
        onClick={() => navigate('/account')}
        className="border border-border px-4 py-2 text-xs uppercase tracking-[0.12em] hover:bg-accent transition-colors"
      >
        Dashboard
      </button>
      <WalletButton />
      <ClusterUiSelect />
    </>
  )
}

export function AppHeader() {
  return (
    <Navbar
      items={[
        { label: 'Docs', href: 'https://docs.tributary.so', external: true },
        { label: 'Referral', href: '/referral' },
        { label: 'Gateways', href: '/gateways' },
      ]}
      actions={<HeaderActions />}
    />
  )
}
