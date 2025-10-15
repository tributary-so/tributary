import { WalletButton } from '@/components/solana/solana-provider'
import { Link, useNavigate } from 'react-router'
import { useWallet } from '@solana/wallet-adapter-react'
import { BorderedContainer } from '@/components/ui/bordered-container'

export function AppHeader() {
  const { connected } = useWallet()
  const navigate = useNavigate()

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const buttonClass =
    'flex items-center justify-center gap-2 px-3 py-1.5 border border-[var(--color-primary)] rounded bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all duration-200 cursor-pointer uppercase text-sm'

  return (
    <div className="relative z-50" style={{ fontFamily: 'var(--font-primary)', marginTop: '21px' }}>
      <BorderedContainer
        borderSides={['top', 'right', 'left']}
        className="relative flex items-center justify-between"
        style={{
          height: '40px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        {/* Logo - Left */}
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <div
            className="rounded-full"
            style={{
              height: '10px',
              width: '10px',
              backgroundColor: 'var(--color-primary)',
            }}
          />
          <div
            style={{
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              fontSize: '14px',
            }}
          >
            Tributary
          </div>
        </Link>

        {/* Center Section */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavClick('/about')}
              className={buttonClass}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('/docs')}
              className={buttonClass}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Docs
            </button>
            <button
              onClick={() => handleNavClick('/quickstart')}
              className={buttonClass}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Quick Start
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Wallet/Dashboard/Account Button */}
          {!connected ? (
            <WalletButton />
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/account')}
                className={buttonClass}
                style={{ fontFamily: 'var(--font-secondary)', fontSize: '13px' }}
              >
                Dashboard
              </button>
              <WalletButton />
            </div>
          )}
        </div>
      </BorderedContainer>
    </div>
  )
}
